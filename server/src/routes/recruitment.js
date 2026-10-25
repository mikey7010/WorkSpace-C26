const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireHr } = require('../middleware/auth');

const prisma = new PrismaClient();

const demandSchema = z.object({
  clientName:           z.string().min(1),
  jobProfile:           z.string().min(1),
  departmentId:         z.number().optional().nullable(),
  requiredCount:        z.number().min(1),
  targetDeploymentDate: z.string().optional().nullable(),
  sourcingMonth:        z.string().default('October'),
  interviewMonth:       z.string().default('November'),
  consultationMonth:    z.string().default('December'),
  currentPhase:         z.string().default('Sourcing (Oct)'),
  budgetPerRole:        z.string().optional().nullable(),
  notes:                z.string().optional().nullable(),
});

const candidateSchema = z.object({
  clientDemandId:      z.number().optional().nullable(),
  departmentId:        z.number().optional().nullable(),
  name:                z.string().min(1),
  email:               z.string().email(),
  phone:               z.string().optional().nullable(),
  appliedRole:         z.string().min(1),
  currentStage:        z.string().default('Applied'),
  interviewDate:       z.string().optional().nullable(),
  consultationDate:    z.string().optional().nullable(),
  joiningDate:         z.string().optional().nullable(),
  expectedSalary:      z.string().optional().nullable(),
  offeredSalary:       z.string().optional().nullable(),
  notes:               z.string().optional().nullable(),
});

// GET /api/recruitment/demands — all client staffing demands with candidate count
router.get('/demands', requireAuth, async (req, res, next) => {
  try {
    const demands = await prisma.clientDemand.findMany({
      include: {
        department: { select: { id: true, name: true, code: true } },
        candidates: {
          select: { id: true, name: true, appliedRole: true, currentStage: true, onboardingProgress: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(demands);
  } catch (err) { next(err); }
});

// POST /api/recruitment/demands — HR creates a new client workforce demand
router.post('/demands', requireHr, async (req, res, next) => {
  try {
    const data = demandSchema.parse(req.body);
    const demand = await prisma.clientDemand.create({
      data: {
        ...data,
        targetDeploymentDate: data.targetDeploymentDate ? new Date(data.targetDeploymentDate) : null,
      },
      include: { department: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: `Created recruitment demand for ${demand.requiredCount} ${demand.jobProfile} (Client: ${demand.clientName})`,
      },
    });

    res.status(201).json(demand);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PUT /api/recruitment/demands/:id — update demand phase/status
router.put('/demands/:id', requireHr, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { currentPhase, status, notes } = req.body;
    const updated = await prisma.clientDemand.update({
      where: { id },
      data: { currentPhase, status, notes },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// GET /api/recruitment/candidates — list candidates
router.get('/candidates', requireAuth, async (req, res, next) => {
  try {
    const where = {};
    if (req.query.stage) where.currentStage = req.query.stage;
    if (req.query.demandId) where.clientDemandId = parseInt(req.query.demandId);

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        clientDemand: { select: { id: true, clientName: true, jobProfile: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(candidates);
  } catch (err) { next(err); }
});

// POST /api/recruitment/candidates — add candidate
router.post('/candidates', requireHr, async (req, res, next) => {
  try {
    const data = candidateSchema.parse(req.body);
    const candidate = await prisma.candidate.create({
      data: {
        ...data,
        interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
        consultationDate: data.consultationDate ? new Date(data.consultationDate) : null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: `Added candidate ${candidate.name} for role ${candidate.appliedRole}`,
      },
    });

    res.status(201).json(candidate);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// PATCH /api/recruitment/candidates/:id/stage — advance stage
router.patch('/candidates/:id/stage', requireHr, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { currentStage, interviewDate, consultationDate, joiningDate, offeredSalary, notes } = req.body;
    
    // Auto calculate progress
    let progress = 0;
    if (currentStage === 'Applied') progress = 10;
    else if (currentStage === 'Interview') progress = 30;
    else if (currentStage === 'Consultation') progress = 50;
    else if (currentStage === 'Offered') progress = 70;
    else if (currentStage === 'Onboarding') progress = 85;
    else if (currentStage === 'Joined') progress = 100;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        currentStage,
        interviewDate: interviewDate ? new Date(interviewDate) : undefined,
        consultationDate: consultationDate ? new Date(consultationDate) : undefined,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        offeredSalary: offeredSalary !== undefined ? offeredSalary : undefined,
        onboardingProgress: progress,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: `Updated candidate ${candidate.name} stage to "${currentStage}"`,
      },
    });

    res.json(candidate);
  } catch (err) { next(err); }
});

// PATCH /api/recruitment/candidates/:id/onboarding — update onboarding checklist
router.patch('/candidates/:id/onboarding', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { docVerification, bgvCheck, safetyInductionDone, workstationAssigned, mentorAssigned } = req.body;

    const existing = await prisma.candidate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Candidate not found' });

    const checks = [
      docVerification ?? existing.docVerification,
      bgvCheck ?? existing.bgvCheck,
      safetyInductionDone ?? existing.safetyInductionDone,
      workstationAssigned ?? existing.workstationAssigned,
      mentorAssigned ?? existing.mentorAssigned,
    ];
    const completedCount = checks.filter(Boolean).length;
    const progress = Math.round((completedCount / 5) * 100);

    const updated = await prisma.candidate.update({
      where: { id },
      data: {
        docVerification: docVerification !== undefined ? docVerification : undefined,
        bgvCheck: bgvCheck !== undefined ? bgvCheck : undefined,
        safetyInductionDone: safetyInductionDone !== undefined ? safetyInductionDone : undefined,
        workstationAssigned: workstationAssigned !== undefined ? workstationAssigned : undefined,
        mentorAssigned: mentorAssigned !== undefined ? mentorAssigned : undefined,
        onboardingProgress: progress,
        currentStage: progress === 100 ? 'Joined' : 'Onboarding',
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
