const router = require('express').Router();
const bcrypt = require('bcrypt');
const { z }  = require('zod');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// HR Head (hr_admin) has the same rights as admin for listing users
const isManager = u => u && (u.role === 'admin' || u.role === 'hr_admin');

const createUserSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(['admin','member']).default('member'),
});

// GET /api/users — admin sees all, member sees only themselves
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (isManager(req.user)) {
      const users = await prisma.user.findMany({
        select: { id:true, name:true, email:true, role:true, designation:true, departmentId:true, createdAt:true, lastActiveAt:true },
        orderBy: { name: 'asc' },
      });
      return res.json(users);
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id:true, name:true, email:true, role:true, createdAt:true },
    });
    res.json([user]);
  } catch (err) { next(err); }
});

// POST /api/users — admin only
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash, role: data.role },
      select: { id:true, name:true, email:true, role:true, createdAt:true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use.' });
    next(err);
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself.' });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
