const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireHr } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/departments — list all 10 departments with head details and latest work log
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        head: { select: { id: true, name: true, email: true, phone: true, designation: true } },
        workLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { members: true, workLogs: true, tasks: true, candidates: true } },
      },
      orderBy: { id: 'asc' },
    });
    res.json(departments);
  } catch (err) { next(err); }
});

// GET /api/departments/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        head: { select: { id: true, name: true, email: true, phone: true, designation: true } },
        workLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
        demands: true,
        candidates: true,
      },
    });
    if (!department) return res.status(404).json({ error: 'Department not found' });
    res.json(department);
  } catch (err) { next(err); }
});

// PUT /api/departments/:id — HR updates target manpower or info
router.put('/:id', requireHr, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { targetManpower, currentManpower, description } = req.body;
    const updated = await prisma.department.update({
      where: { id },
      data: {
        targetManpower: targetManpower !== undefined ? parseInt(targetManpower) : undefined,
        currentManpower: currentManpower !== undefined ? parseInt(currentManpower) : undefined,
        description,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
