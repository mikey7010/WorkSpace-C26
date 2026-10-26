// Recruitment Management API — Work Plan, Summary, Candidate Tracking
// All HR-selected / stage / joined / balance figures are calculated from HiringCandidate rows.
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const R = require('../hiring/rules');

const prisma = new PrismaClient();

// ---------------------------------------------------------------- helpers
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (msg, status = 400) => new HttpError(status, msg);
const who = req => ({ userId: req.user.id, userName: req.user.name || req.user.email || `User ${req.user.id}` });
const code = id => `C-${String(id).padStart(5, '0')}`;
const toDate = v => (v ? new Date(v) : null);
const dateStr = d => (d ? new Date(d).toISOString().slice(0, 10) : null);
const emit = req => req.app.get('io')?.emit('hiring:update', {});

function wrap(fn) {
  return async (req, res, next) => {
    try { await fn(req, res); } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
      if (err.name === 'ZodError') return res.status(400).json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') });
      next(err);
    }
  };
}

function requireHr(req) { if (!R.isHr(req.user)) throw bad('Only HR can do this.', 403); }
function requireStaff(req) { if (!R.isHr(req.user) && !R.isHod(req.user)) throw bad('You do not have access to Recruitment Management.', 403); }

// HOD sees / edits only requirements linked to their department
function positionScope(user) {
  if (R.isHr(user)) return {};
  return { departmentId: user.departmentId || -1 };
}

async function loadPositionForUser(user, id, { forEdit = false } = {}) {
  const pos = await prisma.hiringPosition.findUnique({ where: { id } });
  if (!pos) throw bad('Requirement not found.', 404);
  if (!R.isHr(user) && pos.departmentId !== user.departmentId) {
    throw bad(forEdit ? 'You can only change requirements of your own department.' : 'Not your department.', 403);
  }
  return pos;
}

function maskCandidate(c, user) {
  const out = {
    ...c,
    code: code(c.id),
    stageLabel: R.STAGE_LABEL[c.stage],
    statusLabel: R.STATUS_LABEL[c.status],
  };
  if (!R.isHr(user)) {
    out.name = `Candidate ${code(c.id)}`;
    out.phone = null;
    out.email = null;
    out.nameHidden = true;
  }
  return out;
}

// ---------------------------------------------------------------- one-time setup / migration
let readyPromise = null;
function ensureReady() {
  if (!readyPromise) readyPromise = setup().catch(err => { readyPromise = null; throw err; });
  return readyPromise;
}

async function marker(field) {
  return prisma.hiringAudit.findFirst({ where: { entity: 'system', field } });
}

async function setup() {
  // 1. First run: import the SMART MASTER work sheet
  if ((await prisma.hiringPosition.count()) === 0) {
    const file = path.join(__dirname, '..', '..', 'prisma', 'hiring-seed.json');
    if (fs.existsSync(file)) {
      const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const r of rows) {
        await prisma.hiringPosition.create({
          data: {
            dept: r.dept, position: r.position, totalNeed: r.totalNeed, sortOrder: r.sortOrder,
            months: { create: Object.entries(r.months).map(([month, m]) => ({
              month, hodCount: m.hodCount || 0, remarks: m.remarks || null, updatedBy: 'Excel import',
              hrCount: m.hrCount || 0, sourcing: m.sourcing || 0, onboarding: m.onboarding || 0,
              offerIssued: m.offerIssued || 0, joined: m.joined || 0,
            })) },
          },
        });
      }
    }
  }

  // 2. Planning months (Work Plan columns) — from months already used
  if ((await prisma.hiringPeriod.count()) === 0) {
    const used = await prisma.hiringMonth.findMany({ distinct: ['month'], select: { month: true } });
    for (const { month } of used) {
      await prisma.hiringPeriod.create({ data: { month, year: +month.slice(0, 4), monthNum: +month.slice(5), createdBy: 'Excel import' } });
    }
  }

  // 3. Link requirements to factory departments (decides HOD access)
  if (!(await marker('dept_mapping'))) {
    const depts = await prisma.department.findMany({ select: { id: true, code: true } });
    const byCode = Object.fromEntries(depts.map(d => [d.code, d.id]));
    const unlinked = await prisma.hiringPosition.findMany({ where: { departmentId: null } });
    for (const p of unlinked) {
      const id = byCode[R.guessDeptCode(p.dept)];
      if (id) await prisma.hiringPosition.update({ where: { id: p.id }, data: { departmentId: id } });
    }
    await prisma.hiringAudit.create({ data: { entity: 'system', field: 'dept_mapping', newValue: 'done', userName: 'System' } });
  }

  // 4. Convert the old aggregate stage numbers into individual candidate records (once)
  if (!(await marker('legacy_import'))) {
    const legacy = await prisma.hiringMonth.findMany({
      where: { OR: [{ sourcing: { gt: 0 } }, { onboarding: { gt: 0 } }, { offerIssued: { gt: 0 } }, { joined: { gt: 0 } }] },
    });
    let made = 0;
    await prisma.$transaction(async tx => {
      for (const m of legacy) {
        const already = await tx.hiringCandidate.count({ where: { positionId: m.positionId, plannedMonth: m.month } });
        if (already) continue;
        const plan = [['sourcing', m.sourcing], ['onboarding', m.onboarding], ['offer_issued', m.offerIssued], ['joining', m.joined]];
        for (const [stage, n] of plan) {
          for (let i = 0; i < n; i++) {
            await tx.hiringCandidate.create({
              data: {
                positionId: m.positionId, plannedMonth: m.month, originalMonth: m.month,
                name: 'Name pending (Excel import)', stage, status: 'active',
                remarks: m.remarks ? `Excel: ${m.remarks}` : 'Imported from SMART MASTER',
                history: { create: { action: 'created', toValue: stage, note: 'Imported from SMART MASTER stage counts', userName: 'System' } },
              },
            });
            made++;
          }
        }
      }
      await tx.hiringAudit.create({ data: { entity: 'system', field: 'legacy_import', newValue: String(made), userName: 'System' } });
    }, { timeout: 60000 });
  }
}

router.use(requireAuth, (req, res, next) => { ensureReady().then(() => next(), next); });

// ---------------------------------------------------------------- counts
// Returns Map "positionId|month" → counts (only candidates matching optional filters)
async function candidateCounts({ positionIds, months, ownerId, stage } = {}) {
  const where = {};
  if (positionIds) where.positionId = { in: positionIds };
  if (months) where.plannedMonth = { in: months };
  if (ownerId) where.ownerId = ownerId;
  if (stage) where.stage = stage;
  const groups = await prisma.hiringCandidate.groupBy({ by: ['positionId', 'plannedMonth', 'status', 'stage'], where, _count: { _all: true } });
  const map = new Map();
  for (const g of groups) {
    const key = `${g.positionId}|${g.plannedMonth}`;
    if (!map.has(key)) map.set(key, R.emptyCounts());
    R.addCandidate(map.get(key), g.status, g.stage, g._count._all);
  }
  return map;
}

function parseFilters(q) {
  return {
    year: q.year ? parseInt(q.year, 10) : null,
    month: q.month && R.MONTH_RE.test(q.month) ? q.month : null,
    dept: q.dept || null,
    position: q.position || null,
    departmentId: q.departmentId ? parseInt(q.departmentId, 10) : null, // HOD filter
    ownerId: q.ownerId ? parseInt(q.ownerId, 10) : null,                // HR executive
    stage: R.STAGES.includes(q.stage) ? q.stage : null,
    status: R.STATUSES.includes(q.status) ? q.status : null,
    search: (q.search || '').trim(),
  };
}

async function filteredPeriods(f) {
  const where = {};
  if (f.year) where.year = f.year;
  if (f.month) where.month = f.month;
  return prisma.hiringPeriod.findMany({ where, orderBy: { month: 'asc' } });
}

function positionWhere(user, f) {
  const where = { ...positionScope(user) };
  if (f.dept) where.dept = f.dept;
  if (f.position) where.position = f.position;
  if (f.departmentId && R.isHr(user)) where.departmentId = f.departmentId;
  return where;
}

// ---------------------------------------------------------------- meta
router.get('/meta', wrap(async (req, res) => {
  requireStaff(req);
  const scope = positionScope(req.user);
  const [periods, positions, departments, hrUsers] = await Promise.all([
    prisma.hiringPeriod.findMany({ orderBy: { month: 'asc' } }),
    prisma.hiringPosition.findMany({ where: scope, select: { dept: true, position: true } }),
    prisma.department.findMany({ select: { id: true, name: true, code: true, head: { select: { id: true, name: true } } }, orderBy: { id: 'asc' } }),
    prisma.user.findMany({ where: { role: { in: ['hr_admin', 'admin'] } }, select: { id: true, name: true } }),
  ]);
  res.json({
    periods: periods.map(p => ({ ...p, label: R.monthLabel(p.month) })),
    years: [...new Set(periods.map(p => p.year))],
    depts: [...new Set(positions.map(p => p.dept))],
    positions: [...new Set(positions.map(p => p.position))].sort(),
    departments,
    hrUsers,
    stages: R.STAGES.map(s => ({ value: s, label: R.STAGE_LABEL[s] })),
    statuses: R.STATUSES.map(s => ({ value: s, label: R.STATUS_LABEL[s] })),
    permissions: {
      canManage: R.isHr(req.user),            // candidates, months, exceptions
      canEditRequirement: R.isHr(req.user) || R.isHod(req.user),
      canSeeCandidateNames: R.isHr(req.user),
      departmentId: req.user.departmentId || null,
    },
  });
}));

// ---------------------------------------------------------------- periods (month columns)
router.post('/periods', wrap(async (req, res) => {
  requireHr(req);
  const { year, month } = z.object({ year: z.number().int().min(2000).max(2100), month: z.number().int().min(1).max(12) }).parse(req.body);
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const exists = await prisma.hiringPeriod.findUnique({ where: { month: key } });
  if (exists) throw bad(`${R.monthLabel(key)} is already added.`, 409);
  const p = await prisma.hiringPeriod.create({ data: { month: key, year, monthNum: month, createdBy: who(req).userName } });
  await prisma.hiringAudit.create({ data: { entity: 'period', entityId: p.id, month: key, field: 'created', newValue: key, ...who(req) } });
  emit(req);
  res.status(201).json({ ...p, label: R.monthLabel(key) });
}));

// ---------------------------------------------------------------- work plan
router.get('/plan', wrap(async (req, res) => {
  requireStaff(req);
  const f = parseFilters(req.query);
  const periods = await filteredPeriods(f);
  const months = periods.map(p => p.month);
  const positions = await prisma.hiringPosition.findMany({
    where: positionWhere(req.user, f),
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { months: { where: { month: { in: months } } }, department: { select: { id: true, name: true, code: true } } },
  });
  const counts = await candidateCounts({ positionIds: positions.map(p => p.id), months });
  const rows = positions.map(p => {
    const cells = {};
    for (const m of months) {
      const cell = p.months.find(x => x.month === m);
      const c = R.finish({ ...(counts.get(`${p.id}|${m}`) || R.emptyCounts()), hod: cell?.hodCount || 0 });
      cells[m] = { id: cell?.id || null, hodCount: cell?.hodCount || 0, remarks: cell?.remarks || null, allowExceed: !!cell?.allowExceed, exceedApprovedBy: cell?.exceedApprovedBy || null, counts: c };
    }
    const { months: _drop, ...rest } = p;
    return { ...rest, cells };
  });
  res.json({ periods: periods.map(p => ({ ...p, label: R.monthLabel(p.month) })), rows });
}));

// ---------------------------------------------------------------- requirements
const reqSchema = z.object({
  dept: z.string().trim().min(1).max(200),
  position: z.string().trim().min(1).max(200),
  totalNeed: z.number().int().min(0).max(100000),
  departmentId: z.number().int().nullable().optional(),
});

router.post('/positions', wrap(async (req, res) => {
  requireStaff(req);
  const data = reqSchema.parse(req.body);
  if (!R.isHr(req.user)) data.departmentId = req.user.departmentId || null; // HOD: own department only
  if (!R.isHr(req.user) && !data.departmentId) throw bad('Your account is not linked to a department.', 403);
  const max = await prisma.hiringPosition.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.$transaction(async tx => {
    const p = await tx.hiringPosition.create({ data: { ...data, sortOrder: (max._max.sortOrder || 0) + 1 } });
    await tx.hiringAudit.create({ data: { entity: 'requirement', entityId: p.id, positionId: p.id, field: 'created', newValue: `${p.dept} / ${p.position} (${p.totalNeed})`, ...who(req) } });
    return p;
  });
  emit(req);
  res.status(201).json(created);
}));

router.put('/positions/:id', wrap(async (req, res) => {
  requireStaff(req);
  const id = parseInt(req.params.id, 10);
  const pos = await loadPositionForUser(req.user, id, { forEdit: true });
  const body = z.object({
    totalNeed: z.number().int().min(0).max(100000).optional(),
    dept: z.string().trim().min(1).max(200).optional(),
    position: z.string().trim().min(1).max(200).optional(),
    departmentId: z.number().int().nullable().optional(),
  }).parse(req.body);
  if (!R.isHr(req.user)) { delete body.departmentId; delete body.dept; delete body.position; }
  const changes = Object.entries(body).filter(([k, v]) => v !== undefined && v !== pos[k]);
  if (!changes.length) return res.json(pos);
  const updated = await prisma.$transaction(async tx => {
    const u = await tx.hiringPosition.update({ where: { id }, data: Object.fromEntries(changes) });
    for (const [k, v] of changes) {
      await tx.hiringAudit.create({ data: { entity: 'requirement', entityId: id, positionId: id, field: k, oldValue: String(pos[k] ?? ''), newValue: String(v ?? ''), ...who(req) } });
    }
    return u;
  });
  emit(req);
  res.json(updated);
}));

// Upsert HOD requirement / remarks / exception for one requirement + month
router.put('/positions/:id/months/:month', wrap(async (req, res) => {
  requireStaff(req);
  const id = parseInt(req.params.id, 10);
  const month = req.params.month;
  if (!R.MONTH_RE.test(month)) throw bad('Month must be YYYY-MM.');
  await loadPositionForUser(req.user, id, { forEdit: true });
  if (!(await prisma.hiringPeriod.findUnique({ where: { month } }))) throw bad(`${R.monthLabel(month)} is not configured. Ask HR to add the month first.`);
  const body = z.object({
    hodCount: z.number().int().min(0).max(100000).optional(),
    remarks: z.string().max(2000).nullable().optional(),
    allowExceed: z.boolean().optional(),
    exceedNote: z.string().max(500).nullable().optional(),
  }).parse(req.body);
  if ((body.allowExceed !== undefined || body.exceedNote !== undefined) && !R.isHr(req.user)) throw bad('Only HR can approve an exception.', 403);

  const result = await prisma.$transaction(async tx => {
    const cur = await tx.hiringMonth.findUnique({ where: { positionId_month: { positionId: id, month } } });
    const before = cur || { hodCount: 0, remarks: null, allowExceed: false, exceedNote: null };
    const data = {};
    if (body.hodCount !== undefined) data.hodCount = body.hodCount;
    if (body.remarks !== undefined) data.remarks = body.remarks || null;
    if (body.allowExceed !== undefined) {
      data.allowExceed = body.allowExceed;
      data.exceedApprovedBy = body.allowExceed ? who(req).userName : null;
    }
    if (body.exceedNote !== undefined) data.exceedNote = body.exceedNote || null;

    // Lowering HOD below already-selected candidates is allowed but must be explicit
    if (data.hodCount !== undefined && !(data.allowExceed ?? before.allowExceed)) {
      const selected = await tx.hiringCandidate.count({ where: { positionId: id, plannedMonth: month, status: { in: R.SELECTED_STATUSES } } });
      if (data.hodCount < selected) {
        throw bad(`${selected} candidates are already selected for ${R.monthLabel(month)}. Set the requirement to at least ${selected}, or ask HR to approve an exception.`);
      }
    }
    const row = cur
      ? await tx.hiringMonth.update({ where: { id: cur.id }, data: { ...data, updatedBy: who(req).userName } })
      : await tx.hiringMonth.create({ data: { positionId: id, month, ...data, updatedBy: who(req).userName } });
    for (const k of Object.keys(data)) {
      if (k === 'exceedApprovedBy') continue;
      if (String(before[k] ?? '') === String(data[k] ?? '')) continue;
      await tx.hiringAudit.create({ data: { entity: 'month', entityId: row.id, positionId: id, month, field: k, oldValue: String(before[k] ?? ''), newValue: String(data[k] ?? ''), ...who(req) } });
    }
    return row;
  });
  emit(req);
  res.json(result);
}));

router.get('/audit', wrap(async (req, res) => {
  requireStaff(req);
  const positionId = parseInt(req.query.positionId, 10);
  if (!positionId) throw bad('positionId is required.');
  await loadPositionForUser(req.user, positionId);
  const rows = await prisma.hiringAudit.findMany({ where: { positionId }, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json(rows);
}));

// ---------------------------------------------------------------- candidates
async function assertCapacity(tx, positionId, month, extra = 1) {
  const cell = await tx.hiringMonth.findUnique({ where: { positionId_month: { positionId, month } } });
  const selected = await tx.hiringCandidate.count({ where: { positionId, plannedMonth: month, status: { in: R.SELECTED_STATUSES } } });
  const hod = cell?.hodCount || 0;
  if (selected + extra > hod && !cell?.allowExceed) {
    throw bad(`HOD requirement for ${R.monthLabel(month)} is ${hod} and ${selected} candidate(s) are already selected. Increase the requirement or approve an exception for this month.`, 409);
  }
}

router.get('/candidates', wrap(async (req, res) => {
  requireStaff(req);
  const f = parseFilters(req.query);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
  const posWhere = positionWhere(req.user, f);
  const where = { position: posWhere };
  if (req.query.positionId) where.positionId = parseInt(req.query.positionId, 10);
  if (f.month) where.plannedMonth = f.month;
  else if (f.year) where.plannedMonth = { startsWith: `${f.year}-` };
  if (f.ownerId) where.ownerId = f.ownerId;
  if (f.stage) where.stage = f.stage;
  if (f.status) where.status = f.status;
  if (f.search) {
    const s = { contains: f.search, mode: 'insensitive' };
    const idMatch = f.search.match(/^c-?0*(\d+)$/i);
    where.OR = [
      ...(R.isHr(req.user) ? [{ name: s }] : []),
      { position: { ...posWhere, dept: s } },
      { position: { ...posWhere, position: s } },
      ...(idMatch ? [{ id: parseInt(idMatch[1], 10) }] : []),
    ];
  }
  const [total, items] = await Promise.all([
    prisma.hiringCandidate.count({ where }),
    prisma.hiringCandidate.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ plannedMonth: 'asc' }, { id: 'asc' }],
      include: { position: { select: { id: true, dept: true, position: true } }, owner: { select: { id: true, name: true } } },
    }),
  ]);
  res.json({ total, page, pageSize, items: items.map(c => maskCandidate(c, req.user)) });
}));

router.get('/candidates/:id', wrap(async (req, res) => {
  requireStaff(req);
  const c = await prisma.hiringCandidate.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { position: true, owner: { select: { id: true, name: true } }, history: { orderBy: { createdAt: 'desc' } } },
  });
  if (!c) throw bad('Candidate not found.', 404);
  await loadPositionForUser(req.user, c.positionId);
  res.json(maskCandidate(c, req.user));
}));

const candSchema = z.object({
  positionId: z.number().int(),
  plannedMonth: z.string().regex(R.MONTH_RE, 'must be YYYY-MM'),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional().or(z.literal('')),
  ownerId: z.number().int().nullable().optional(),
  stage: z.enum(R.STAGES).default('sourcing'),
  sourcingDate: z.string().nullable().optional(),
  sourceDetails: z.string().max(500).nullable().optional(),
  onboardingDate: z.string().nullable().optional(),
  offerIssuedDate: z.string().nullable().optional(),
  offerStatus: z.enum(['pending', 'accepted', 'declined']).nullable().optional(),
  expectedJoiningDate: z.string().nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

const DATE_FIELDS = ['sourcingDate', 'onboardingDate', 'offerIssuedDate', 'expectedJoiningDate', 'actualJoiningDate'];
function normalizeDates(obj) {
  for (const k of DATE_FIELDS) {
    if (obj[k] === undefined) continue;
    if (obj[k] === null || obj[k] === '') { obj[k] = null; continue; }
    const d = new Date(obj[k]);
    if (isNaN(d)) throw bad(`${k} is not a valid date.`);
    obj[k] = d;
  }
  return obj;
}

router.post('/candidates', wrap(async (req, res) => {
  requireHr(req);
  const data = normalizeDates(candSchema.parse(req.body));
  if (data.email === '') data.email = null;
  const pos = await prisma.hiringPosition.findUnique({ where: { id: data.positionId } });
  if (!pos) throw bad('Requirement not found.', 404);
  if (!(await prisma.hiringPeriod.findUnique({ where: { month: data.plannedMonth } }))) throw bad(`${R.monthLabel(data.plannedMonth)} is not a configured month.`);
  if (data.stage === 'sourcing' && !data.sourcingDate) data.sourcingDate = new Date();
  const created = await prisma.$transaction(async tx => {
    await assertCapacity(tx, data.positionId, data.plannedMonth);
    return tx.hiringCandidate.create({
      data: {
        ...data, originalMonth: data.plannedMonth, status: 'active', createdById: req.user.id,
        history: { create: { action: 'created', toValue: data.stage, note: `Allocated to ${R.monthLabel(data.plannedMonth)}`, ...who(req) } },
      },
    });
  });
  emit(req);
  res.status(201).json(maskCandidate(created, req.user));
}));

// Edit details (contact, dates, owner, remarks) — not stage/status/month
router.put('/candidates/:id', wrap(async (req, res) => {
  requireHr(req);
  const id = parseInt(req.params.id, 10);
  const body = normalizeDates(candSchema.omit({ positionId: true, plannedMonth: true, stage: true }).partial().extend({
    onboardingProgress: z.number().int().min(0).max(100).optional(),
    actualJoiningDate: z.string().nullable().optional(),
  }).parse(req.body));
  if (body.email === '') body.email = null;
  const cur = await prisma.hiringCandidate.findUnique({ where: { id } });
  if (!cur) throw bad('Candidate not found.', 404);
  if (cur.status === 'joined' && body.actualJoiningDate === null) throw bad('A joined candidate must keep an actual joining date.');
  const changed = Object.keys(body).filter(k => String(cur[k] instanceof Date ? dateStr(cur[k]) : cur[k] ?? '') !== String(body[k] instanceof Date ? dateStr(body[k]) : body[k] ?? ''));
  const updated = await prisma.$transaction(async tx => {
    const u = await tx.hiringCandidate.update({ where: { id }, data: body });
    if (changed.length) await tx.hiringCandidateHistory.create({ data: { candidateId: id, action: 'details', note: `Updated: ${changed.join(', ')}`, ...who(req) } });
    return u;
  });
  emit(req);
  res.json(maskCandidate(updated, req.user));
}));

router.post('/candidates/:id/stage', wrap(async (req, res) => {
  requireHr(req);
  const id = parseInt(req.params.id, 10);
  const { stage, date, note } = z.object({ stage: z.enum(R.STAGES), date: z.string().nullable().optional(), note: z.string().max(1000).optional() }).parse(req.body);
  const updated = await prisma.$transaction(async tx => {
    const cur = await tx.hiringCandidate.findUnique({ where: { id } });
    if (!cur) throw bad('Candidate not found.', 404);
    if (cur.status !== 'active') throw bad(`Candidate is ${R.STATUS_LABEL[cur.status]}. Re-activate it before changing the stage.`);
    if (cur.stage === stage) throw bad(`Candidate is already in ${R.STAGE_LABEL[stage]}.`);
    const field = R.STAGE_DATE_FIELD[stage];
    const data = { stage };
    const d = date ? new Date(date) : (field === 'expectedJoiningDate' ? cur.expectedJoiningDate : new Date());
    if (date && isNaN(d)) throw bad('Invalid date.');
    if (d) data[field] = d;
    if (stage === 'onboarding' && cur.onboardingProgress === 0) data.onboardingProgress = 10;
    if (stage === 'offer_issued' && !cur.offerStatus) data.offerStatus = 'pending';
    const u = await tx.hiringCandidate.update({ where: { id }, data });
    await tx.hiringCandidateHistory.create({ data: { candidateId: id, action: 'stage', fromValue: cur.stage, toValue: stage, note: note || null, ...who(req) } });
    return u;
  });
  emit(req);
  res.json(maskCandidate(updated, req.user));
}));

router.post('/candidates/:id/status', wrap(async (req, res) => {
  requireHr(req);
  const id = parseInt(req.params.id, 10);
  const { status, actualJoiningDate, note } = z.object({
    status: z.enum(R.STATUSES), actualJoiningDate: z.string().nullable().optional(), note: z.string().max(1000).optional(),
  }).parse(req.body);
  const updated = await prisma.$transaction(async tx => {
    const cur = await tx.hiringCandidate.findUnique({ where: { id } });
    if (!cur) throw bad('Candidate not found.', 404);
    if (cur.status === status) throw bad(`Candidate is already ${R.STATUS_LABEL[status]}.`);
    const data = { status };
    if (status === 'joined') {
      const d = actualJoiningDate ? new Date(actualJoiningDate) : null;
      if (!d || isNaN(d)) throw bad('Actual joining date is required to mark a candidate as joined.');
      data.actualJoiningDate = d;
      data.stage = 'joining';
    }
    if (cur.status === 'joined' && status !== 'joined') data.actualJoiningDate = null; // undo a wrong "joined"
    // Coming back into the selected pool from rejected / withdrawn uses a slot again
    const wasCounted = R.SELECTED_STATUSES.includes(cur.status);
    const willCount = R.SELECTED_STATUSES.includes(status);
    if (!wasCounted && willCount) await assertCapacity(tx, cur.positionId, cur.plannedMonth);
    const u = await tx.hiringCandidate.update({ where: { id }, data });
    await tx.hiringCandidateHistory.create({ data: { candidateId: id, action: 'status', fromValue: cur.status, toValue: status, note: note || (status === 'joined' ? `Joined on ${dateStr(data.actualJoiningDate)}` : null), ...who(req) } });
    return u;
  });
  emit(req);
  res.json(maskCandidate(updated, req.user));
}));

// Change planned joining month (carry-forward). Never duplicates the person.
router.post('/candidates/:id/move', wrap(async (req, res) => {
  requireHr(req);
  const id = parseInt(req.params.id, 10);
  const { plannedMonth, note } = z.object({ plannedMonth: z.string().regex(R.MONTH_RE), note: z.string().max(1000).optional() }).parse(req.body);
  if (!(await prisma.hiringPeriod.findUnique({ where: { month: plannedMonth } }))) throw bad(`${R.monthLabel(plannedMonth)} is not a configured month.`);
  const updated = await prisma.$transaction(async tx => {
    const cur = await tx.hiringCandidate.findUnique({ where: { id } });
    if (!cur) throw bad('Candidate not found.', 404);
    if (cur.plannedMonth === plannedMonth) throw bad('Candidate is already planned for that month.');
    if (cur.status === 'joined') throw bad('A joined candidate cannot be moved to another month.');
    if (R.SELECTED_STATUSES.includes(cur.status)) await assertCapacity(tx, cur.positionId, plannedMonth);
    const u = await tx.hiringCandidate.update({ where: { id }, data: { plannedMonth } });
    await tx.hiringCandidateHistory.create({ data: { candidateId: id, action: 'planned_month', fromValue: cur.plannedMonth, toValue: plannedMonth, note: note || null, ...who(req) } });
    return u;
  });
  emit(req);
  res.json(maskCandidate(updated, req.user));
}));

// ---------------------------------------------------------------- summary
async function buildSummary(user, f) {
  const periods = await filteredPeriods(f);
  const months = periods.map(p => p.month);
  const positions = await prisma.hiringPosition.findMany({
    where: positionWhere(user, f),
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { months: { where: { month: { in: months } } } },
  });
  const counts = await candidateCounts({ positionIds: positions.map(p => p.id), months, ownerId: f.ownerId, stage: f.stage });
  const cards = R.emptyCounts();
  const sections = periods.map(per => {
    const totals = R.emptyCounts();
    const rows = [];
    for (const p of positions) {
      const cell = p.months.find(x => x.month === per.month);
      const c = { ...(counts.get(`${p.id}|${per.month}`) || R.emptyCounts()), hod: cell?.hodCount || 0 };
      if (!c.hod && !c.selected && !c.rejected && !c.withdrawn) continue;
      R.finish(c);
      rows.push({ positionId: p.id, dept: p.dept, position: p.position, totalNeed: p.totalNeed, remarks: cell?.remarks || null, counts: c });
      R.sumInto(totals, c);
    }
    R.finish(totals);
    R.sumInto(cards, totals);
    return { month: per.month, label: R.monthLabel(per.month), rows, totals };
  });
  R.finish(cards);
  return { sections, cards, rules: RULES_TEXT };
}

const RULES_TEXT = [
  'HR Selected counts candidates who are Active, On Hold or Joined. Rejected and Withdrawn are not counted.',
  'Stage columns count only Active candidates by their current stage — each person appears in one column only.',
  'Actually Joined counts candidates marked Joined with an actual joining date.',
  'Balance = HOD requirement − Actually Joined. Pending allocation = HOD requirement − HR Selected.',
  'A candidate is counted in the month they are currently planned for; moving the month keeps the original month in history.',
];

router.get('/summary', wrap(async (req, res) => {
  requireStaff(req);
  res.json(await buildSummary(req.user, parseFilters(req.query)));
}));

// ---------------------------------------------------------------- export (Excel)
router.get('/export', wrap(async (req, res) => {
  requireStaff(req);
  let ExcelJS;
  try { ExcelJS = require('exceljs'); } catch { throw bad('Excel export needs the "exceljs" package. Run npm install in the server folder.', 500); }
  const f = parseFilters(req.query);
  const type = req.query.type === 'summary' ? 'summary' : 'work';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WorkSpace C26';
  const headStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } };
  const style = (row, s) => row.eachCell(c => Object.assign(c, s));

  if (type === 'work') {
    const periods = await filteredPeriods(f);
    const months = periods.map(p => p.month);
    const positions = await prisma.hiringPosition.findMany({ where: positionWhere(req.user, f), orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], include: { months: { where: { month: { in: months } } } } });
    const counts = await candidateCounts({ positionIds: positions.map(p => p.id), months });
    const ws = wb.addWorksheet('Work Plan', { views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }] });
    const top = ['Department', 'Position', 'No. of Workers Needed'];
    const sub = ['', '', ''];
    months.forEach(m => { top.push(R.monthLabel(m), '', ''); sub.push('HOD', 'HR', 'Remarks'); });
    style(ws.addRow(top), headStyle); style(ws.addRow(sub), headStyle);
    ['A', 'B', 'C'].forEach(col => ws.mergeCells(`${col}1:${col}2`));
    months.forEach((m, i) => ws.mergeCells(1, 4 + i * 3, 1, 6 + i * 3));
    for (const p of positions) {
      const row = [p.dept, p.position, p.totalNeed];
      for (const m of months) {
        const cell = p.months.find(x => x.month === m);
        const c = counts.get(`${p.id}|${m}`) || R.emptyCounts();
        row.push(cell?.hodCount || null, c.selected || null, cell?.remarks || null);
      }
      ws.addRow(row);
    }
    ws.columns.forEach((c, i) => { c.width = i === 0 ? 34 : i === 1 ? 26 : (i - 3) % 3 === 2 ? 30 : 10; });
  } else {
    const s = await buildSummary(req.user, f);
    const ws = wb.addWorksheet('Summary', { views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }] });
    const cols = ['Department', 'Position', 'No. of Workers Needed', 'HOD', 'HR Selected', 'Sourcing', 'Onboarding', 'Offer Issued', 'Joining Date', 'On Hold', 'Actually Joined', 'Balance', 'Pending Allocation', 'Remarks'];
    for (const sec of s.sections) {
      const t = ws.addRow([sec.label]); t.font = { bold: true, size: 13 };
      style(ws.addRow(cols), headStyle);
      for (const r of sec.rows) {
        const c = r.counts;
        ws.addRow([r.dept, r.position, r.totalNeed, c.hod, c.selected, c.sourcing, c.onboarding, c.offer_issued, c.joining, c.on_hold, c.joined, c.balance, c.pendingAllocation, r.remarks]);
      }
      const c = sec.totals;
      const tot = ws.addRow(['TOTAL', '', '', c.hod, c.selected, c.sourcing, c.onboarding, c.offer_issued, c.joining, c.on_hold, c.joined, c.balance, c.pendingAllocation, '']);
      tot.font = { bold: true };
      ws.addRow([]);
    }
    ws.addRow(['Counting rules']).font = { bold: true };
    s.rules.forEach(r => ws.addRow([r]));
    ws.columns.forEach((c, i) => { c.width = i === 0 ? 34 : i === 1 ? 26 : i === 13 ? 40 : 12; });
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Recruitment_${type === 'work' ? 'Work_Plan' : 'Summary'}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}));

module.exports = router;
module.exports._test = { setup, ensureReady };
