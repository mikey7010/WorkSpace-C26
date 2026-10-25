const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

const logSchema = z.object({
  departmentId:     z.number(),
  shift:            z.string().default('Day Shift'),
  targetOutput:     z.number().min(0),
  actualOutput:     z.number().min(0),
  manpowerPresent:  z.number().min(0),
  manpowerRequired: z.number().min(0),
  status:           z.string().default('On Schedule'),
  blockers:         z.string().optional(),
  notes:            z.string().optional(),
});

// GET /api/worklogs — HR gets all departments; Dept Head gets their own dept
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const isHr = req.user.role === 'hr_admin' || req.user.role === 'admin';
    const where = {};
    if (!isHr && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
    }
    if (req.query.departmentId) {
      where.departmentId = parseInt(req.query.departmentId);
    }

    const logs = await prisma.dailyWorkLog.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        reportedBy: { select: { id: true, name: true, designation: true } },
        comments: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (err) { next(err); }
});

// POST /api/worklogs — Dept Head or HR submits work log
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = logSchema.parse(req.body);
    const log = await prisma.dailyWorkLog.create({
      data: {
        ...data,
        reportedById: req.user.id,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        reportedBy: { select: { id: true, name: true } },
      },
    });

    // Update department current manpower based on report
    if (data.manpowerPresent) {
      await prisma.department.update({
        where: { id: data.departmentId },
        data: { currentManpower: data.manpowerPresent },
      });
    }

    // Record activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: `Logged daily work report for ${log.department.name} (${data.actualOutput}/${data.targetOutput} units, Status: ${data.status})`,
      },
    });

    // Realtime broadcast to all web and mobile clients
    req.app.get('io')?.emit('worklog:new', log);

    res.status(201).json(log);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

module.exports = router;
