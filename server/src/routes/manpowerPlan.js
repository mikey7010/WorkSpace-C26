const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireHr } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/manpower-plan — returns all rows from the company spreadsheet
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { dept, status } = req.query;
    const where = {};
    if (dept && dept !== 'all') where.dept = dept;
    if (status && status !== 'all') where.status = status;

    const rows = await prisma.manpowerPlan.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    // Compute monthly breakdown totals
    const totals = {
      plannedTotal: rows.reduce((s, r) => s + r.plannedTotal, 0),
      sep: rows.reduce((s, r) => s + r.sep, 0),
      oct: rows.reduce((s, r) => s + r.oct, 0),
      nov: rows.reduce((s, r) => s + r.nov, 0),
      dec: rows.reduce((s, r) => s + r.dec, 0),
      jan: rows.reduce((s, r) => s + r.jan, 0),
      feb: rows.reduce((s, r) => s + r.feb, 0),
      mar: rows.reduce((s, r) => s + r.mar, 0),
      apr: rows.reduce((s, r) => s + r.apr, 0),
      may: rows.reduce((s, r) => s + r.may, 0),
    };

    // Appointed in 1st wave count
    const appointedCount = rows.filter(r => r.status === 'appointed').length;
    const pendingDoiCount = rows.filter(r => r.status === 'pending_doi').length;
    const sourcingCount = rows.filter(r => r.status === 'sourcing').length;

    res.json({
      rows,
      totals,
      appointedCount,
      pendingDoiCount,
      sourcingCount,
    });
  } catch (err) { next(err); }
});

// PUT /api/manpower-plan/:id — update row status / remarks / appointed names
router.put('/:id', requireHr, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status, remarks, appointedNames } = req.body;
    const updated = await prisma.manpowerPlan.update({
      where: { id },
      data: { status, remarks, appointedNames },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
