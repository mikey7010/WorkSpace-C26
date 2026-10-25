const router = require('express').Router();
const { z }  = require('zod');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/comments?taskId=X
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const taskId = parseInt(req.query.taskId);
    if (!taskId) return res.status(400).json({ error: 'taskId required.' });
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (req.user.role !== 'admin' && task.assignedTo !== req.user.id)
      return res.status(403).json({ error: 'Access denied.' });
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { user: { select: { id:true, name:true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  } catch (err) { next(err); }
});

// POST /api/comments
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { taskId, text } = z.object({ taskId: z.number(), text: z.string().min(1) }).parse(req.body);
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (req.user.role !== 'admin' && task.assignedTo !== req.user.id)
      return res.status(403).json({ error: 'Access denied.' });
    const comment = await prisma.comment.create({
      data: { taskId, userId: req.user.id, text },
      include: { user: { select: { id:true, name:true } } },
    });
    res.status(201).json(comment);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

module.exports = router;
