// Hiring Tracker — Work (HOD need vs HR selected per month) + Summary (stage pipeline)
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const STAGES = ['sourcing', 'onboarding', 'offerIssued', 'joined'];

const isHr = user => user && (user.role === 'hr_admin' || user.role === 'admin');

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// First run: load the SMART MASTER sheet data if the tracker is empty
let seeding = null;
async function ensureSeeded() {
  const count = await prisma.hiringPosition.count();
  if (count > 0) return;
  if (seeding) return seeding;
  seeding = (async () => {
    const file = path.join(__dirname, '..', '..', 'prisma', 'hiring-seed.json');
    if (!fs.existsSync(file)) return;
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const r of rows) {
      await prisma.hiringPosition.create({
        data: {
          dept: r.dept,
          position: r.position,
          totalNeed: r.totalNeed,
          sortOrder: r.sortOrder,
          months: {
            create: Object.entries(r.months).map(([month, m]) => ({
              month,
              hodCount: m.hodCount || 0,
              hrCount: m.hrCount || 0,
              sourcing: m.sourcing || 0,
              onboarding: m.onboarding || 0,
              offerIssued: m.offerIssued || 0,
              joined: m.joined || 0,
              remarks: m.remarks || null,
              updatedBy: 'Excel import',
            })),
          },
        },
      });
    }
    console.log(`Hiring tracker seeded with ${rows.length} positions from SMART MASTER.`);
  })().finally(() => { seeding = null; });
  return seeding;
}

function emptyTotals() {
  return { hodCount: 0, hrCount: 0, sourcing: 0, onboarding: 0, offerIssued: 0, joined: 0 };
}

function addTo(t, m) {
  t.hodCount += m.hodCount;
  t.hrCount += m.hrCount;
  STAGES.forEach(s => { t[s] += m[s]; });
}

// GET /api/hiring — all positions with their month entries + totals
router.get('/', requireAuth, async (req, res, next) => {
  try {
    await ensureSeeded();
    const positions = await prisma.hiringPosition.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { months: { orderBy: { month: 'asc' } } },
    });

    const monthSet = new Set();
    const byMonth = {};
    const byDept = {};
    const overall = emptyTotals();
    let totalNeed = 0;

    positions.forEach(p => {
      totalNeed += p.totalNeed;
      if (!byDept[p.dept]) byDept[p.dept] = { dept: p.dept, totalNeed: 0, ...emptyTotals() };
      byDept[p.dept].totalNeed += p.totalNeed;
      p.months.forEach(m => {
        monthSet.add(m.month);
        if (!byMonth[m.month]) byMonth[m.month] = emptyTotals();
        addTo(byMonth[m.month], m);
        addTo(byDept[p.dept], m);
        addTo(overall, m);
      });
    });

    res.json({
      positions,
      months: [...monthSet].sort(),
      depts: Object.keys(byDept),
      totals: { totalNeed, ...overall },
      byMonth,
      byDept: Object.values(byDept),
      canEditHr: isHr(req.user),
    });
  } catch (err) { next(err); }
});

// POST /api/hiring/positions — add a new Dept + Position row (HR only)
router.post('/positions', requireAuth, async (req, res, next) => {
  try {
    if (!isHr(req.user)) return res.status(403).json({ error: 'Only HR can add positions.' });
    const dept = String(req.body.dept || '').trim();
    const position = String(req.body.position || '').trim();
    if (!dept || !position) return res.status(400).json({ error: 'Department and position are required.' });
    const max = await prisma.hiringPosition.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.hiringPosition.create({
      data: { dept, position, totalNeed: toInt(req.body.totalNeed), sortOrder: (max._max.sortOrder || 0) + 1 },
      include: { months: true },
    });
    req.app.get('io')?.emit('hiring:update', { positionId: created.id });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/hiring/positions/:id — update total need (HR or HOD)
router.put('/positions/:id', requireAuth, async (req, res, next) => {
  try {
    const id = toInt(req.params.id);
    const updated = await prisma.hiringPosition.update({
      where: { id },
      data: { totalNeed: toInt(req.body.totalNeed) },
      include: { months: { orderBy: { month: 'asc' } } },
    });
    req.app.get('io')?.emit('hiring:update', { positionId: id });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/hiring/positions/:id/months — add a month to a position
router.post('/positions/:id/months', requireAuth, async (req, res, next) => {
  try {
    const positionId = toInt(req.params.id);
    const month = String(req.body.month || '');
    if (!MONTH_RE.test(month)) return res.status(400).json({ error: 'Month must be in YYYY-MM format.' });
    const exists = await prisma.hiringMonth.findUnique({ where: { positionId_month: { positionId, month } } });
    if (exists) return res.status(409).json({ error: 'This month is already added for this position.' });
    const created = await prisma.hiringMonth.create({
      data: {
        positionId,
        month,
        hodCount: toInt(req.body.hodCount),
        remarks: req.body.remarks ? String(req.body.remarks) : null,
        updatedBy: req.user.name,
      },
    });
    req.app.get('io')?.emit('hiring:update', { positionId });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/hiring/months/:id — HOD updates need; HR updates selected + stages
router.put('/months/:id', requireAuth, async (req, res, next) => {
  try {
    const id = toInt(req.params.id);
    const current = await prisma.hiringMonth.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Month entry not found.' });

    const hr = isHr(req.user);
    const data = {};
    if (req.body.hodCount !== undefined) data.hodCount = toInt(req.body.hodCount);
    if (req.body.remarks !== undefined) data.remarks = req.body.remarks ? String(req.body.remarks) : null;

    const hrFields = ['hrCount', ...STAGES, 'joiningDate'];
    const touchesHr = hrFields.some(f => req.body[f] !== undefined);
    if (touchesHr && !hr) {
      return res.status(403).json({ error: 'Only HR can update selected count and hiring stages.' });
    }
    if (hr) {
      if (req.body.hrCount !== undefined) data.hrCount = toInt(req.body.hrCount);
      STAGES.forEach(s => { if (req.body[s] !== undefined) data[s] = toInt(req.body[s]); });
      if (req.body.joiningDate !== undefined) data.joiningDate = req.body.joiningDate ? String(req.body.joiningDate) : null;
    }

    const next_ = { ...current, ...data };
    const stageSum = STAGES.reduce((s, k) => s + next_[k], 0);
    if (stageSum > next_.hrCount) {
      return res.status(400).json({
        error: `Stage total (${stageSum}) cannot be more than HR selected (${next_.hrCount}).`,
      });
    }

    data.updatedBy = req.user.name;
    const updated = await prisma.hiringMonth.update({ where: { id }, data });
    req.app.get('io')?.emit('hiring:update', { positionId: updated.positionId });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/hiring/months/:id — remove a month entry (HR only)
router.delete('/months/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isHr(req.user)) return res.status(403).json({ error: 'Only HR can remove a month.' });
    const id = toInt(req.params.id);
    const removed = await prisma.hiringMonth.delete({ where: { id } });
    req.app.get('io')?.emit('hiring:update', { positionId: removed.positionId });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
