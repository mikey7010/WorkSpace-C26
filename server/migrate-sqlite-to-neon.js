/**
 * One-Time Migration Script: Local SQLite (dev.db) -> Neon PostgreSQL
 * 
 * Safety features:
 * 1. Pre-flight check: Aborts if Neon PostgreSQL already contains existing data.
 * 2. Dependency-safe ordering: Resolves circular references between User and Department.
 * 3. Exact ID & Timestamp preservation: Preserves all primary keys and original timestamps.
 * 4. Privacy preservation: Never prints personal info, emails, or password hashes to console.
 * 5. Sequence synchronization: Automatically updates PostgreSQL serial sequences after insertion.
 */

const path = require('path');
const { PrismaClient: PostgresClient } = require('@prisma/client');
const { PrismaClient: SqliteClient }   = require('./prisma/sqlite-client');

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('postgres')) {
    console.error('\x1b[31m[ERROR] DATABASE_URL is not set to a valid PostgreSQL connection string.\x1b[0m');
    console.log('Set $env:DATABASE_URL before running this script.');
    process.exit(1);
  }

  const sqliteDbPath = path.resolve(__dirname, 'prisma', 'dev.db');
  console.log('\x1b[36m========================================================\x1b[0m');
  console.log('\x1b[36m  WorkSpace C26: SQLite -> Neon PostgreSQL Migration   \x1b[0m');
  console.log('\x1b[36m========================================================\x1b[0m');
  console.log(`Source DB : Local SQLite (${sqliteDbPath})`);
  console.log(`Target DB : Cloud PostgreSQL (Neon)\n`);

  const sqlite = new SqliteClient({
    datasources: { db: { url: `file:${sqliteDbPath}` } },
  });
  const postgres = new PostgresClient();

  try {
    // -------------------------------------------------------------
    // STEP 1: Pre-Flight Safety Check on Neon Target
    // -------------------------------------------------------------
    console.log('Checking Neon PostgreSQL target state...');
    const [
      pgUsers,
      pgDepts,
      pgPlans,
      pgDemands,
      pgCandidates,
      pgLogs,
      pgDirectives,
      pgTasks,
      pgComments,
      pgActivities,
    ] = await Promise.all([
      postgres.user.count(),
      postgres.department.count(),
      postgres.manpowerPlan.count(),
      postgres.clientDemand.count(),
      postgres.candidate.count(),
      postgres.dailyWorkLog.count(),
      postgres.hrDirective.count(),
      postgres.task.count(),
      postgres.comment.count(),
      postgres.activityLog.count(),
    ]);

    const totalTargetRecords = pgUsers + pgDepts + pgPlans + pgDemands + pgCandidates + pgLogs + pgDirectives + pgTasks + pgComments + pgActivities;
    if (totalTargetRecords > 0) {
      console.error(`\x1b[31m[ABORT] Neon database already contains ${totalTargetRecords} records.\x1b[0m`);
      console.log('To prevent overwriting or duplicating existing data, migration was safely halted.');
      console.log('Summary of existing target data:', {
        users: pgUsers,
        departments: pgDepts,
        manpowerPlans: pgPlans,
        candidates: pgCandidates,
      });
      process.exit(1);
    }
    console.log('✔ Neon target is clean (0 records detected). Proceeding with safe import.\n');

    // -------------------------------------------------------------
    // STEP 2: Read All Source Data from SQLite
    // -------------------------------------------------------------
    console.log('Reading records from local SQLite...');
    const [
      users,
      depts,
      plans,
      demands,
      candidates,
      logs,
      directives,
      tasks,
      comments,
      activityLogs,
    ] = await Promise.all([
      sqlite.user.findMany({ orderBy: { id: 'asc' } }),
      sqlite.department.findMany({ orderBy: { id: 'asc' } }),
      sqlite.manpowerPlan.findMany({ orderBy: { id: 'asc' } }),
      sqlite.clientDemand.findMany({ orderBy: { id: 'asc' } }),
      sqlite.candidate.findMany({ orderBy: { id: 'asc' } }),
      sqlite.dailyWorkLog.findMany({ orderBy: { id: 'asc' } }),
      sqlite.hrDirective.findMany({ orderBy: { id: 'asc' } }),
      sqlite.task.findMany({ orderBy: { id: 'asc' } }),
      sqlite.comment.findMany({ orderBy: { id: 'asc' } }),
      sqlite.activityLog.findMany({ orderBy: { id: 'asc' } }),
    ]);

    console.log(`Found ${users.length} users, ${depts.length} departments, ${plans.length} manpower rows, ${candidates.length} candidates, ${logs.length} work logs.`);

    // -------------------------------------------------------------
    // STEP 3: Dependency-Safe Insertion into Neon PostgreSQL
    // -------------------------------------------------------------

    // 3a. Insert Users (with departmentId = null to avoid cyclic FK deadlock)
    console.log('\n[1/10] Migrating Users (stage 1: credentials & profiles)...');
    for (const u of users) {
      await postgres.user.create({
        data: {
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          designation: u.designation,
          phone: u.phone,
          departmentId: null,
          createdAt: u.createdAt,
          lastActiveAt: u.lastActiveAt,
        },
      });
    }
    console.log(`✔ Migrated ${users.length} users.`);

    // 3b. Insert Departments (referencing valid headId)
    console.log('[2/10] Migrating Departments...');
    for (const d of depts) {
      await postgres.department.create({
        data: {
          id: d.id,
          name: d.name,
          code: d.code,
          description: d.description,
          headId: d.headId,
          targetManpower: d.targetManpower,
          currentManpower: d.currentManpower,
          createdAt: d.createdAt,
        },
      });
    }
    console.log(`✔ Migrated ${depts.length} departments.`);

    // 3c. Link Users to Departments (stage 2)
    console.log('[3/10] Linking User department memberships...');
    for (const u of users) {
      if (u.departmentId) {
        await postgres.user.update({
          where: { id: u.id },
          data: { departmentId: u.departmentId },
        });
      }
    }
    console.log('✔ User department memberships linked successfully.');

    // 3d. Insert Manpower Plans
    console.log('[4/10] Migrating Master Manpower Plan Rows...');
    for (const p of plans) {
      await postgres.manpowerPlan.create({
        data: {
          id: p.id,
          dept: p.dept,
          subDept: p.subDept,
          position: p.position,
          plannedTotal: p.plannedTotal,
          sep: p.sep,
          oct: p.oct,
          nov: p.nov,
          dec: p.dec,
          jan: p.jan,
          feb: p.feb,
          mar: p.mar,
          apr: p.apr,
          may: p.may,
          total: p.total,
          remarks: p.remarks,
          status: p.status,
          appointedNames: p.appointedNames,
          createdAt: p.createdAt,
        },
      });
    }
    console.log(`✔ Migrated ${plans.length} manpower plan positions.`);

    // 3e. Insert Client Demands
    console.log('[5/10] Migrating Client Demands...');
    for (const cd of demands) {
      await postgres.clientDemand.create({
        data: {
          id: cd.id,
          clientName: cd.clientName,
          jobProfile: cd.jobProfile,
          departmentId: cd.departmentId,
          requiredCount: cd.requiredCount,
          targetDeploymentDate: cd.targetDeploymentDate,
          sourcingMonth: cd.sourcingMonth,
          interviewMonth: cd.interviewMonth,
          consultationMonth: cd.consultationMonth,
          currentPhase: cd.currentPhase,
          status: cd.status,
          budgetPerRole: cd.budgetPerRole,
          notes: cd.notes,
          createdAt: cd.createdAt,
        },
      });
    }
    console.log(`✔ Migrated ${demands.length} client demand projects.`);

    // 3f. Insert Candidates & Onboarding Checklists
    console.log('[6/10] Migrating Candidates & Onboarding Data...');
    for (const c of candidates) {
      await postgres.candidate.create({
        data: {
          id: c.id,
          clientDemandId: c.clientDemandId,
          departmentId: c.departmentId,
          name: c.name,
          email: c.email,
          phone: c.phone,
          appliedRole: c.appliedRole,
          currentStage: c.currentStage,
          interviewDate: c.interviewDate,
          consultationDate: c.consultationDate,
          joiningDate: c.joiningDate,
          expectedSalary: c.expectedSalary,
          offeredSalary: c.offeredSalary,
          onboardingProgress: c.onboardingProgress,
          docVerification: c.docVerification,
          bgvCheck: c.bgvCheck,
          safetyInductionDone: c.safetyInductionDone,
          workstationAssigned: c.workstationAssigned,
          mentorAssigned: c.mentorAssigned,
          notes: c.notes,
          createdAt: c.createdAt,
        },
      });
    }
    console.log(`✔ Migrated ${candidates.length} candidates.`);

    // 3g. Insert Daily Work Logs
    console.log('[7/10] Migrating Daily Shift Work Reports...');
    for (const l of logs) {
      await postgres.dailyWorkLog.create({
        data: {
          id: l.id,
          departmentId: l.departmentId,
          reportedById: l.reportedById,
          shiftDate: l.shiftDate,
          shift: l.shift,
          targetOutput: l.targetOutput,
          actualOutput: l.actualOutput,
          manpowerPresent: l.manpowerPresent,
          manpowerRequired: l.manpowerRequired,
          status: l.status,
          blockers: l.blockers,
          notes: l.notes,
          createdAt: l.createdAt,
        },
      });
    }
    console.log(`✔ Migrated ${logs.length} shift work reports.`);

    // 3h. Insert HR Directives
    console.log('[8/10] Migrating HR Directives & Plant Notices...');
    for (const hd of directives) {
      await postgres.hrDirective.create({
        data: {
          id: hd.id,
          authorId: hd.authorId,
          title: hd.title,
          content: hd.content,
          category: hd.category,
          priority: hd.priority,
          targetDepartmentId: hd.targetDepartmentId,
          createdAt: hd.createdAt,
        },
      });
    }
    console.log(`✔ Migrated ${directives.length} HR directives.`);

    // 3i. Insert Tasks & Comments
    console.log('[9/10] Migrating Tasks & Comments...');
    for (const t of tasks) {
      await postgres.task.create({
        data: {
          id: t.id,
          title: t.title,
          description: t.description,
          assignedTo: t.assignedTo,
          createdBy: t.createdBy,
          departmentId: t.departmentId,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          createdAt: t.createdAt,
          completedAt: t.completedAt,
        },
      });
    }
    for (const com of comments) {
      await postgres.comment.create({
        data: {
          id: com.id,
          taskId: com.taskId,
          candidateId: com.candidateId,
          dailyWorkLogId: com.dailyWorkLogId,
          userId: com.userId,
          text: com.text,
          createdAt: com.createdAt,
        },
      });
    }
    console.log(`✔ Migrated ${tasks.length} tasks and ${comments.length} comments.`);

    // 3j. Insert Activity Logs
    console.log('[10/10] Migrating Activity Logs...');
    for (const al of activityLogs) {
      await postgres.activityLog.create({
        data: {
          id: al.id,
          userId: al.userId,
          action: al.action,
          createdAt: al.createdAt,
        },
      });
    }
    console.log(`✔ Migrated ${activityLogs.length} activity logs.`);

    // -------------------------------------------------------------
    // STEP 4: PostgreSQL Serial Sequence Synchronization
    // -------------------------------------------------------------
    console.log('\nSynchronizing PostgreSQL autoincrement sequences...');
    const tables = [
      'User',
      'Department',
      'ManpowerPlan',
      'ClientDemand',
      'Candidate',
      'DailyWorkLog',
      'HrDirective',
      'Task',
      'Comment',
      'ActivityLog',
    ];

    for (const tbl of tables) {
      await postgres.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${tbl}"', 'id'), coalesce(max("id"), 1)) FROM "${tbl}";`
      );
    }
    console.log('✔ All 10 serial sequences synchronized.');

    // -------------------------------------------------------------
    // STEP 5: 1-to-1 Verification Count Comparison
    // -------------------------------------------------------------
    console.log('\n----------------- VERIFICATION AUDIT -----------------');
    const finalCounts = await Promise.all([
      postgres.user.count(),
      postgres.department.count(),
      postgres.manpowerPlan.count(),
      postgres.clientDemand.count(),
      postgres.candidate.count(),
      postgres.dailyWorkLog.count(),
      postgres.hrDirective.count(),
      postgres.task.count(),
      postgres.comment.count(),
      postgres.activityLog.count(),
    ]);

    const sourceCounts = [
      users.length,
      depts.length,
      plans.length,
      demands.length,
      candidates.length,
      logs.length,
      directives.length,
      tasks.length,
      comments.length,
      activityLogs.length,
    ];

    let allMatched = true;
    for (let i = 0; i < tables.length; i++) {
      const match = finalCounts[i] === sourceCounts[i];
      if (!match) allMatched = false;
      const statusIcon = match ? '✔' : '✖';
      console.log(`${statusIcon} ${tables[i].padEnd(16)}: SQLite = ${sourceCounts[i]} | Neon PG = ${finalCounts[i]}`);
    }

    if (allMatched) {
      console.log('\n\x1b[32m✔ MIGRATION COMPLETED SUCCESSFULLY WITH 100% RECORD INTEGRITY!\x1b[0m');
    } else {
      console.warn('\n\x1b[33m⚠ Warning: Record count discrepancy detected. Check table logs.\x1b[0m');
    }
  } catch (err) {
    console.error('\n\x1b[31m[ERROR] Migration failed:\x1b[0m', err.message);
    process.exit(1);
  } finally {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  }
}

migrate();
