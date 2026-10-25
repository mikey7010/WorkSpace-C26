const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireHr } = require('../middleware/auth');

const prisma = new PrismaClient();

const directiveSchema = z.object({
  title:              z.string().min(1),
  content:            z.string().min(1),
  category:           z.string().default('Recruitment Milestone'),
  priority:           z.string().default('Normal'),
  targetDepartmentId: z.number().optional().nullable(),
});

// GET /api/directives — all directives
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const directives = await prisma.hrDirective.findMany({
      include: {
        author: { select: { id: true, name: true, designation: true } },
        targetDepartment: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    res.json(directives);
  } catch (err) { next(err); }
});

// POST /api/directives — HR publishes directive / announcement
router.post('/', requireHr, async (req, res, next) => {
  try {
    const data = directiveSchema.parse(req.body);
    const directive = await prisma.hrDirective.create({
      data: {
        ...data,
        authorId: req.user.id,
      },
      include: {
        author: { select: { id: true, name: true, designation: true } },
        targetDepartment: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: `Published HR directive: "${directive.title}"`,
      },
    });

    // Realtime broadcast to all web and mobile clients
    req.app.get('io')?.emit('directive:new', directive);

    res.status(201).json(directive);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

module.exports = router;
