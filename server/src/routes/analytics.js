const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/analytics/hr-overview
router.get('/hr-overview', requireAuth, async (req, res, next) => {
  try {
    const [departments, demands, candidates, workLogs, directives, activityLogs] = await Promise.all([
      prisma.department.findMany({
        include: {
          head: { select: { id: true, name: true, designation: true } },
          workLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.clientDemand.findMany({
        include: { candidates: true },
      }),
      prisma.candidate.findMany({}),
      prisma.dailyWorkLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          department: { select: { id: true, name: true, code: true } },
          reportedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.hrDirective.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { author: { select: { name: true } } },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: { select: { name: true, role: true } } },
      }),
    ]);

    // Workforce calculations
    const totalTargetManpower = departments.reduce((acc, d) => acc + d.targetManpower, 0);
    const totalCurrentManpower = departments.reduce((acc, d) => acc + d.currentManpower, 0);
    const manpowerGap = totalTargetManpower - totalCurrentManpower;

    // Production output today
    const totalOutputToday = workLogs.reduce((acc, l) => acc + l.actualOutput, 0);
    const totalTargetToday = workLogs.reduce((acc, l) => acc + l.targetOutput, 0);

    // Candidates by stage
    const candidateStages = {
      Applied: candidates.filter(c => c.currentStage === 'Applied').length,
      Interview: candidates.filter(c => c.currentStage === 'Interview').length,
      Consultation: candidates.filter(c => c.currentStage === 'Consultation').length,
      Offered: candidates.filter(c => c.currentStage === 'Offered').length,
      Onboarding: candidates.filter(c => c.currentStage === 'Onboarding').length,
      Joined: candidates.filter(c => c.currentStage === 'Joined').length,
    };

    // Blockers reported by department heads
    const activeBlockers = workLogs
      .filter(l => l.blockers && l.blockers.trim().length > 0)
      .map(l => ({
        id: l.id,
        deptName: l.department.name,
        reporter: l.reportedBy.name,
        blocker: l.blockers,
        status: l.status,
        date: l.createdAt,
      }));

    res.json({
      departmentsCount: departments.length,
      totalTargetManpower,
      totalCurrentManpower,
      manpowerGap,
      totalOutputToday,
      totalTargetToday,
      activeDemandsCount: demands.filter(d => d.status === 'Active').length,
      totalRequiredRecruits: demands.reduce((acc, d) => acc + d.requiredCount, 0),
      candidateStages,
      departments,
      demands,
      recentWorkLogs: workLogs,
      activeBlockers,
      directives,
      activityLogs,
    });
  } catch (err) { next(err); }
});

module.exports = router;
