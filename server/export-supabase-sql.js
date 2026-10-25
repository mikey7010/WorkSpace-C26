/**
 * Export current database schema and all 87 C26 headcount records to supabase_setup.sql
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  const depts = await prisma.department.findMany();
  const plans = await prisma.manpowerPlan.findMany();
  const logs = await prisma.dailyWorkLog.findMany();
  const demands = await prisma.clientDemand.findMany();
  const candidates = await prisma.candidate.findMany();
  const directives = await prisma.hrDirective.findMany();
  const tasks = await prisma.task.findMany();

  let sql = `-- =========================================================
-- C26 MASTER WORKSPACE & HEADCOUNT PLATFORM
-- Complete Supabase PostgreSQL Schema & Factory Data
-- Paste into Supabase Dashboard -> SQL Editor -> Run
-- =========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "ActivityLog" CASCADE;
DROP TABLE IF EXISTS "Comment" CASCADE;
DROP TABLE IF EXISTS "Task" CASCADE;
DROP TABLE IF EXISTS "HrDirective" CASCADE;
DROP TABLE IF EXISTS "Candidate" CASCADE;
DROP TABLE IF EXISTS "ClientDemand" CASCADE;
DROP TABLE IF EXISTS "DailyWorkLog" CASCADE;
DROP TABLE IF EXISTS "ManpowerPlan" CASCADE;
DROP TABLE IF EXISTS "Department" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- 1. User Table
CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'dept_head',
  "designation" TEXT,
  "phone" TEXT,
  "departmentId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3)
);

-- 2. Department Table
CREATE TABLE "Department" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "code" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "headId" INTEGER UNIQUE,
  "targetManpower" INTEGER NOT NULL DEFAULT 25,
  "currentManpower" INTEGER NOT NULL DEFAULT 20,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "User" ADD CONSTRAINT "fk_user_department" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL;
ALTER TABLE "Department" ADD CONSTRAINT "fk_department_head" FOREIGN KEY ("headId") REFERENCES "User"("id") ON DELETE SET NULL;

-- 3. ManpowerPlan Table (All 87 C26 positions, 1,157 headcount)
CREATE TABLE "ManpowerPlan" (
  "id" SERIAL PRIMARY KEY,
  "dept" TEXT NOT NULL,
  "subDept" TEXT,
  "position" TEXT NOT NULL,
  "plannedTotal" INTEGER NOT NULL DEFAULT 1,
  "sep" INTEGER NOT NULL DEFAULT 0,
  "oct" INTEGER NOT NULL DEFAULT 0,
  "nov" INTEGER NOT NULL DEFAULT 0,
  "dec" INTEGER NOT NULL DEFAULT 0,
  "jan" INTEGER NOT NULL DEFAULT 0,
  "feb" INTEGER NOT NULL DEFAULT 0,
  "mar" INTEGER NOT NULL DEFAULT 0,
  "apr" INTEGER NOT NULL DEFAULT 0,
  "may" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "appointedNames" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. DailyWorkLog Table
CREATE TABLE "DailyWorkLog" (
  "id" SERIAL PRIMARY KEY,
  "departmentId" INTEGER NOT NULL REFERENCES "Department"("id") ON DELETE CASCADE,
  "reportedById" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "shiftDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "shift" TEXT NOT NULL DEFAULT 'Day Shift',
  "targetOutput" INTEGER NOT NULL DEFAULT 0,
  "actualOutput" INTEGER NOT NULL DEFAULT 0,
  "manpowerPresent" INTEGER NOT NULL DEFAULT 0,
  "manpowerRequired" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'On Schedule',
  "blockers" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. ClientDemand Table
CREATE TABLE "ClientDemand" (
  "id" SERIAL PRIMARY KEY,
  "clientName" TEXT NOT NULL,
  "jobProfile" TEXT NOT NULL,
  "departmentId" INTEGER REFERENCES "Department"("id") ON DELETE SET NULL,
  "requiredCount" INTEGER NOT NULL DEFAULT 10,
  "targetDeploymentDate" TIMESTAMP(3),
  "sourcingMonth" TEXT NOT NULL DEFAULT 'October',
  "interviewMonth" TEXT NOT NULL DEFAULT 'November',
  "consultationMonth" TEXT NOT NULL DEFAULT 'December',
  "currentPhase" TEXT NOT NULL DEFAULT 'Sourcing (Oct)',
  "status" TEXT NOT NULL DEFAULT 'Active',
  "budgetPerRole" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Candidate Table
CREATE TABLE "Candidate" (
  "id" SERIAL PRIMARY KEY,
  "clientDemandId" INTEGER REFERENCES "ClientDemand"("id") ON DELETE SET NULL,
  "departmentId" INTEGER REFERENCES "Department"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "appliedRole" TEXT NOT NULL,
  "currentStage" TEXT NOT NULL DEFAULT 'Applied',
  "interviewDate" TIMESTAMP(3),
  "consultationDate" TIMESTAMP(3),
  "joiningDate" TIMESTAMP(3),
  "expectedSalary" TEXT,
  "offeredSalary" TEXT,
  "onboardingProgress" INTEGER NOT NULL DEFAULT 0,
  "docVerification" BOOLEAN NOT NULL DEFAULT false,
  "bgvCheck" BOOLEAN NOT NULL DEFAULT false,
  "safetyInductionDone" BOOLEAN NOT NULL DEFAULT false,
  "workstationAssigned" BOOLEAN NOT NULL DEFAULT false,
  "mentorAssigned" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. HrDirective Table
CREATE TABLE "HrDirective" (
  "id" SERIAL PRIMARY KEY,
  "authorId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Recruitment Milestone',
  "priority" TEXT NOT NULL DEFAULT 'Normal',
  "targetDepartmentId" INTEGER REFERENCES "Department"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Task Table
CREATE TABLE "Task" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assignedTo" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "createdBy" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "departmentId" INTEGER REFERENCES "Department"("id") ON DELETE SET NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'todo',
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3)
);

-- 9. Comment Table
CREATE TABLE "Comment" (
  "id" SERIAL PRIMARY KEY,
  "taskId" INTEGER REFERENCES "Task"("id") ON DELETE CASCADE,
  "candidateId" INTEGER REFERENCES "Candidate"("id") ON DELETE CASCADE,
  "dailyWorkLogId" INTEGER REFERENCES "DailyWorkLog"("id") ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. ActivityLog Table
CREATE TABLE "ActivityLog" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enable Supabase Realtime Publication for instant client broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE "DailyWorkLog";
ALTER PUBLICATION supabase_realtime ADD TABLE "HrDirective";
ALTER PUBLICATION supabase_realtime ADD TABLE "ManpowerPlan";
ALTER PUBLICATION supabase_realtime ADD TABLE "Task";

-- =========================================================
-- SEED DATA INSERTION
-- =========================================================
`;

  function escapeSql(str) {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
  }

  // Insert Users
  for (const u of users) {
    sql += `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (${u.id}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.passwordHash)}, ${escapeSql(u.role)}, ${escapeSql(u.designation)}, ${escapeSql(u.phone)}) ON CONFLICT ("id") DO NOTHING;\n`;
  }

  // Insert Departments
  for (const d of depts) {
    sql += `INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (${d.id}, ${escapeSql(d.name)}, ${escapeSql(d.code)}, ${escapeSql(d.description)}, ${d.headId || 'NULL'}, ${d.targetManpower}, ${d.currentManpower}) ON CONFLICT ("id") DO NOTHING;\n`;
  }

  // Update Users departmentId
  for (const u of users) {
    if (u.departmentId) {
      sql += `UPDATE "User" SET "departmentId" = ${u.departmentId} WHERE "id" = ${u.id};\n`;
    }
  }

  // Insert ManpowerPlan (all 87)
  for (const p of plans) {
    sql += `INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (${p.id}, ${escapeSql(p.dept)}, ${escapeSql(p.subDept)}, ${escapeSql(p.position)}, ${p.plannedTotal}, ${p.sep}, ${p.oct}, ${p.nov}, ${p.dec}, ${p.jan}, ${p.feb}, ${p.mar}, ${p.apr}, ${p.may}, ${p.total}, ${escapeSql(p.remarks)}, ${escapeSql(p.status)}, ${escapeSql(p.appointedNames)}) ON CONFLICT ("id") DO NOTHING;\n`;
  }

  // Insert DailyWorkLogs
  for (const l of logs) {
    sql += `INSERT INTO "DailyWorkLog" ("id", "departmentId", "reportedById", "shift", "targetOutput", "actualOutput", "manpowerPresent", "manpowerRequired", "status", "blockers", "notes") VALUES (${l.id}, ${l.departmentId}, ${l.reportedById}, ${escapeSql(l.shift)}, ${l.targetOutput}, ${l.actualOutput}, ${l.manpowerPresent}, ${l.manpowerRequired}, ${escapeSql(l.status)}, ${escapeSql(l.blockers)}, ${escapeSql(l.notes)}) ON CONFLICT ("id") DO NOTHING;\n`;
  }

  // Insert ClientDemand
  for (const cd of demands) {
    sql += `INSERT INTO "ClientDemand" ("id", "clientName", "jobProfile", "departmentId", "requiredCount", "sourcingMonth", "interviewMonth", "consultationMonth", "currentPhase", "status", "budgetPerRole", "notes") VALUES (${cd.id}, ${escapeSql(cd.clientName)}, ${escapeSql(cd.jobProfile)}, ${cd.departmentId || 'NULL'}, ${cd.requiredCount}, ${escapeSql(cd.sourcingMonth)}, ${escapeSql(cd.interviewMonth)}, ${escapeSql(cd.consultationMonth)}, ${escapeSql(cd.currentPhase)}, ${escapeSql(cd.status)}, ${escapeSql(cd.budgetPerRole)}, ${escapeSql(cd.notes)}) ON CONFLICT ("id") DO NOTHING;\n`;
  }

  // Insert Candidates
  for (const c of candidates) {
    sql += `INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (${c.id}, ${c.clientDemandId || 'NULL'}, ${c.departmentId || 'NULL'}, ${escapeSql(c.name)}, ${escapeSql(c.email)}, ${escapeSql(c.phone)}, ${escapeSql(c.appliedRole)}, ${escapeSql(c.currentStage)}, ${c.onboardingProgress}, ${c.docVerification}, ${c.bgvCheck}, ${c.safetyInductionDone}, ${c.workstationAssigned}, ${c.mentorAssigned}, ${escapeSql(c.notes)}) ON CONFLICT ("id") DO NOTHING;\n`;
  }

  // Insert HrDirectives
  for (const hd of directives) {
    sql += `INSERT INTO "HrDirective" ("id", "authorId", "title", "content", "category", "priority", "targetDepartmentId") VALUES (${hd.id}, ${hd.authorId}, ${escapeSql(hd.title)}, ${escapeSql(hd.content)}, ${escapeSql(hd.category)}, ${escapeSql(hd.priority)}, ${hd.targetDepartmentId || 'NULL'}) ON CONFLICT ("id") DO NOTHING;\n`;
  }

  // Insert Tasks
  for (const t of tasks) {
    sql += `INSERT INTO "Task" ("id", "title", "description", "assignedTo", "createdBy", "departmentId", "priority", "status") VALUES (${t.id}, ${escapeSql(t.title)}, ${escapeSql(t.description)}, ${t.assignedTo}, ${t.createdBy}, ${t.departmentId || 'NULL'}, ${escapeSql(t.priority)}, ${escapeSql(t.status)}) ON CONFLICT ("id") DO NOTHING;\n`;
  }

  sql += `
-- Reset sequences
SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max("id"), 1)) FROM "User";
SELECT setval(pg_get_serial_sequence('"Department"', 'id'), coalesce(max("id"), 1)) FROM "Department";
SELECT setval(pg_get_serial_sequence('"ManpowerPlan"', 'id'), coalesce(max("id"), 1)) FROM "ManpowerPlan";
SELECT setval(pg_get_serial_sequence('"DailyWorkLog"', 'id'), coalesce(max("id"), 1)) FROM "DailyWorkLog";
SELECT setval(pg_get_serial_sequence('"ClientDemand"', 'id'), coalesce(max("id"), 1)) FROM "ClientDemand";
SELECT setval(pg_get_serial_sequence('"Candidate"', 'id'), coalesce(max("id"), 1)) FROM "Candidate";
SELECT setval(pg_get_serial_sequence('"HrDirective"', 'id'), coalesce(max("id"), 1)) FROM "HrDirective";
SELECT setval(pg_get_serial_sequence('"Task"', 'id'), coalesce(max("id"), 1)) FROM "Task";
`;

  const outputPath = path.join(__dirname, '..', 'supabase_setup.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`✔ Generated Supabase setup SQL at: ${outputPath} (${plans.length} manpower rows)`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
