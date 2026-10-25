const router = require('express').Router();
const { z }  = require('zod');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

const taskSelect = {
  id:true, title:true, description:true, priority:true, status:true, dueDate:true,
  createdAt:true, completedAt:true,
  assignee: { select: { id:true, name:true, email:true } },
  creator:  { select: { id:true, name:true } },
  _count: { select: { comments: true } },
};

const createSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  assignedTo:  z.number().int(),
  priority:    z.enum(['low','medium','high']).default('medium'),
  dueDate:     z.string().optional(),
});

const updateSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  assignedTo:  z.number().int().optional(),
  priority:    z.enum(['low','medium','high']).optional(),
  status:      z.enum(['todo','inprog','review','done']).optional(),
  dueDate:     z.string().nullable().optional(),
});

// GET /api/tasks — admin: all tasks; member: own tasks
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' ? {} : { assignedTo: req.user.id };
    const { status, priority, assignedTo } = req.query;
    if (status)     where.status   = status;
    if (priority)   where.priority = priority;
    if (assignedTo && req.user.role === 'admin') where.assignedTo = parseInt(assignedTo);

    const tasks = await prisma.task.findMany({
      where, select: taskSelect, orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (err) { next(err); }
});

// GET /api/tasks/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: parseInt(req.params.id) }, select: taskSelect });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (req.user.role !== 'admin' && task.assignee.id !== req.user.id)
      return res.status(403).json({ error: 'Access denied.' });
    res.json(task);
  } catch (err) { next(err); }
});

// POST /api/tasks — admin only
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const task = await prisma.task.create({
      data: {
        title: data.title, description: data.description,
        assignedTo: data.assignedTo, createdBy: req.user.id,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      select: taskSelect,
    });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Created task "${task.title}" and assigned to ${task.assignee.name}` } });
    res.status(201).json(task);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PUT /api/tasks/:id — admin: full edit; member: only status on own tasks
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.task.findUnique({ where: { id }, include: { assignee: true } });
    if (!existing) return res.status(404).json({ error: 'Task not found.' });
    if (req.user.role !== 'admin' && existing.assignedTo !== req.user.id)
      return res.status(403).json({ error: 'Access denied.' });

    // Members can only change status
    let data = updateSchema.parse(req.body);
    if (req.user.role !== 'admin') data = { status: data.status };

    const completedAt = data.status === 'done' && existing.status !== 'done'
      ? new Date() : (data.status && data.status !== 'done' ? null : undefined);

    const task = await prisma.task.update({
      where: { id },
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined, ...(completedAt !== undefined ? { completedAt } : {}) },
      select: taskSelect,
    });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Updated task "${task.title}"` } });
    res.json(task);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// DELETE /api/tasks/:id — admin only
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Task deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
