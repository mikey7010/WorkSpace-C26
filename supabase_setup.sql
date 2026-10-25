-- =========================================================
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
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (23, 'Priya Sharma (HR Head)', 'hr@workspace.app', '$2b$10$r9k2fnov7hbeL5iR5bOBk.FW.jQxXpyOVHodkCdmRTLFST94ryLsy', 'hr_admin', 'Chief HR Officer & Workforce Planning Director', '+91 98765 43210') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (24, 'Tamil selvan', 'tamil.assembly@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Sr. Supervisor (Assembly - 1st Wave Appointed)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (25, 'Rajasekar', 'rajasekar.cutting@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Sr. Line Leader (Cutting/Stitching - 1st Wave)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (26, 'Manogar', 'manogar.acut@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Sr. Line Leader (Auto Cutting - 1st Wave)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (27, 'Santhana Krishnan', 'santhana.prnt@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Supervisor (Printing & Purchasing - 1st Wave)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (28, 'Shathis S', 'shathis.emb@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Supervisor (Embroidery & Technical)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (29, 'Vijaya Kumar C', 'vijay.stock@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Supervisor (Stockfitting - 1st Wave Appointed)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (30, 'Mani G', 'mani.rb@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Sr. Engineer (RB / CE - 1st Wave Appointed)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (31, 'Dai wei', 'daiwei.ip@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Manager (Sole & IP Injection Production)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (32, 'Tulip', 'tulip.qc@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Manager (Quality Control & Compliance)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (33, 'Venkatesan M', 'venkatesan.me@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Sr. Line Leader (ME Maintenance - 1st Wave)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (34, 'Ryan', 'ryan.sourcing@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Manager (Sourcing / Production Planning / IE / LEAN)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (35, 'Balar', 'balar.director@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Operation Director (GAP Admin & Plant Lead)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (36, 'Johnny', 'johnny.gap@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Sr Manager (GAP Regional Office)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (37, 'Md. Imroz', 'imroz.purchasing@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Manager (Purchasing)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (38, 'Riti', 'riti.it@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Manager (IT & MES)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (39, 'Eric', 'eric.lean@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Manager (Lean Production)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (40, 'Schum', 'schum.planning@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Sr. Supervisor (Production Plan)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "designation", "phone") VALUES (41, 'Duty Manager', 'duty.manager@workspace.app', '$2b$10$4w4gA4ZKr9KZdLI2n.922OKV5gSqxtoDIvZLBvMPLBkSjqEpev606', 'dept_head', 'Duty Manager (Assembly Floor)', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (11, 'Assembly', 'ASSY', 'Footwear & garment assembly lines, conveyor stitching, duty management.', 24, 176, 12) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (12, 'Cutting / Stitching (C26)', 'CUT', 'Computerized laser cutting, high-speed stitching, die cutting.', 25, 226, 15) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (13, 'Auto Cutting / Printing / No Sew (C26)', 'ACUT', 'Automated digital cutting, high-frequency embossing & no-sew bonding.', 26, 43, 5) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (14, 'Printing & No Sew', 'PRNT', 'Screen printing, sublimation transfer, heat seal & no-sew laminates.', 27, 75, 8) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (15, 'Embroidery & Logistics (C26)', 'EMB', 'Multi-head Tajima embroidery, monogramming, internal logistics.', 28, 121, 10) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (16, 'Stockfitting (Spray / Degreasing / Sole)', 'STCK', 'Sole assembly, UV treatment, chemical degreasing, spray painting.', 29, 221, 14) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (17, 'RB (Material Mixing / Hot Pressing)', 'RB', 'Rubber compound mixing, curing, refinement & hot compression pressing.', 30, 60, 6) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (18, 'IP (Injection & Pelleting)', 'IP', 'EVA pelleting, color matching, high-precision injection molding.', 31, 123, 8) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (19, 'Quality Control & Lab (QC / MES)', 'QC', 'Inline QC inspection, physical testing lab, AQL audits & MES tracking.', 32, 78, 12) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (20, 'Mechanical & Chemical Engineering (ME/CE)', 'ENG', 'Preventive plant maintenance, equipment calibration, civil & chemical safety.', 33, 33, 8) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (21, 'Sourcing, Purchasing & Production Plan', 'SCM', 'Vendor sourcing, material procurement, ERP production scheduling & IE/LEAN.', 34, 30, 9) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Department" ("id", "name", "code", "description", "headId", "targetManpower", "currentManpower") VALUES (22, 'Warehouse (RMW / FGW) & GAP Administration', 'ADM', 'Raw material warehouse, finished goods warehouse, regional admin.', 35, 35, 7) ON CONFLICT ("id") DO NOTHING;
UPDATE "User" SET "departmentId" = 11 WHERE "id" = 24;
UPDATE "User" SET "departmentId" = 12 WHERE "id" = 25;
UPDATE "User" SET "departmentId" = 13 WHERE "id" = 26;
UPDATE "User" SET "departmentId" = 14 WHERE "id" = 27;
UPDATE "User" SET "departmentId" = 15 WHERE "id" = 28;
UPDATE "User" SET "departmentId" = 16 WHERE "id" = 29;
UPDATE "User" SET "departmentId" = 17 WHERE "id" = 30;
UPDATE "User" SET "departmentId" = 18 WHERE "id" = 31;
UPDATE "User" SET "departmentId" = 19 WHERE "id" = 32;
UPDATE "User" SET "departmentId" = 20 WHERE "id" = 33;
UPDATE "User" SET "departmentId" = 21 WHERE "id" = 34;
UPDATE "User" SET "departmentId" = 22 WHERE "id" = 35;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (1, 'Assembly', NULL, 'Duty Manager', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Duty Manager') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (2, 'Assembly', NULL, 'Sr. Supervisor', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 'Appointed - 1st wave - Tamil selvan', 'appointed', 'Tamil selvan') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (3, 'Assembly', NULL, 'Supervisor', 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 'Dec Deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (4, 'Assembly', NULL, 'Sr. Line Leader', 2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 2, 'Appointed - 1st wave Manogar', 'appointed', 'Manogar') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (5, 'Assembly', NULL, 'Line Leader', 6, 0, 2, 0, 2, 0, 0, 2, 0, 0, 6, 'Appointed 2 - 1st wave - Mohan Raj & Thatchan murthy', 'appointed', 'Mohan Raj, Thatchan murthy') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (6, 'Assembly', NULL, 'Assistant Engineer', 5, 0, 0, 0, 3, 0, 0, 2, 0, 0, 5, 'Dec (3) & Mar (2)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (7, 'Assembly', NULL, 'High Skilled Operator', 2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 2, 'Dec (1) & Mar (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (8, 'Assembly', NULL, 'Unskilled Operator', 156, 0, 0, 0, 80, 0, 0, 76, 0, 0, 156, 'Heavy Operator Ramp: Dec 80, Mar 76', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (9, 'Cutting/Stitching (C26)', NULL, 'Sr. Line Leader', 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 'Appointed 2 - 1st wave - Rajasekar, Sarath Kumar', 'appointed', 'Rajasekar, Sarath Kumar') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (10, 'Cutting/Stitching (C26)', NULL, 'Line Leader', 4, 0, 3, 0, 1, 0, 0, 0, 0, 0, 4, 'Appointed 3 - 1st wave - Jagan kumar, Sathish kumar, Sathiyamoorthy', 'appointed', 'Jagan kumar, Sathish kumar, Sathiyamoorthy') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (11, 'Cutting/Stitching (C26)', NULL, 'Unskilled Operator', 220, 0, 0, 0, 60, 0, 0, 60, 100, 0, 220, 'Ramp-up: Dec 60, Mar 60, Apr 100', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (12, 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', NULL, 'Sr. Supervisor', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (13, 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', NULL, 'Sr. Line Leader', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (14, 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', NULL, 'Line Leader', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (15, 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', NULL, 'Executive Assistant', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (16, 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', NULL, 'High Skilled Operator', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (17, 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', NULL, 'Unskilled Operator', 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 'March deployment (3)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (18, 'Auto Cutting/Printing', NULL, 'Supervisor', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (19, 'Auto Cutting (Printing/HF/No Sew (C26))', NULL, 'Sr. Line Leader', 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 'Dec deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (20, 'Auto Cutting (Printing/HF/No Sew (C26))', NULL, 'Line Leader', 2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 2, 'Dec (1) & Mar (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (21, 'Auto Cutting (Printing/HF/No Sew (C26))', NULL, 'Unskilled Operator', 15, 0, 0, 0, 0, 0, 0, 8, 7, 0, 15, 'Mar (8) & Apr (7)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (22, 'Printing', NULL, 'Sr. Line Leader', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (23, 'Printing', NULL, 'Line Leader', 2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 2, 'Dec (1) & Mar (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (24, 'Printing', NULL, 'Assistant Engineer', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (25, 'Printing', NULL, 'Unskilled Operator', 18, 0, 0, 0, 0, 0, 0, 10, 8, 0, 18, 'Mar (10) & Apr (8)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (26, 'HF/No Sew', NULL, 'Supervisor', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (27, 'HF/No Sew', NULL, 'Sr. Line Leader', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (28, 'HF', NULL, 'Unskilled Operator', 8, 0, 0, 0, 0, 0, 0, 4, 4, 0, 8, 'Mar (4) & Apr (4)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (29, 'No Sew', NULL, 'Line Leader', 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 'Dec deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (30, 'No Sew', NULL, 'Unskilled Operator', 45, 0, 0, 0, 0, 0, 0, 25, 20, 0, 45, 'Mar (25) & Apr (20)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (31, 'Embroidery/Logistics (C26)', NULL, 'Sr. Supervisor', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (32, 'Embroidery (C26)', NULL, 'Supervisor', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (33, 'Embroidery (C26)', NULL, 'Sr. Line Leader', 2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 2, 'Dec (1) & Mar (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (34, 'Embroidery (C26)', NULL, 'Line Leader', 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 'March deployment (3)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (35, 'Embroidery (C26)', NULL, 'Executive Assistant', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (36, 'Embroidery (C26)', NULL, 'High Skilled Operator', 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 'March deployment (3)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (37, 'Embroidery (C26)', NULL, 'Unskilled Operator', 109, 0, 0, 0, 0, 0, 0, 60, 49, 0, 109, 'Ramp-up: Mar 60, Apr 49', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (38, 'Stockfitting (spray paint)', NULL, 'Sr. Line Leader', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (39, 'Stockfitting (spray paint)', NULL, 'Line Leader', 5, 0, 0, 0, 0, 0, 0, 3, 2, 0, 5, 'Mar (3) & Apr (2)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (40, 'Stockfitting (spray paint)', NULL, 'Unskilled Operator', 95, 0, 0, 0, 0, 0, 0, 50, 45, 0, 95, 'Ramp-up: Mar 50, Apr 45', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (41, 'Stockfitting (Degreasing & UV Treatment)', NULL, 'Line Leader', 2, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2, 'Mar (1) & Apr (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (42, 'Stockfitting (Degreasing & UV Treatment)', NULL, 'Unskilled Operator', 32, 0, 0, 0, 0, 0, 0, 20, 12, 0, 32, 'Mar (20) & Apr (12)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (43, 'Stockfitting (Sole Assembly)', NULL, 'Sr. Line Leader', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (44, 'Stockfitting (Sole Assembly)', NULL, 'Line Leader', 2, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2, 'Mar (1) & Apr (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (45, 'Stockfitting (Sole Assembly)', NULL, 'Unskilled Operator', 80, 0, 0, 0, 0, 0, 0, 50, 30, 0, 80, 'Mar (50) & Apr (30)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (46, 'RB(Material Mixing/Material Prep)', NULL, 'Supervisor', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (47, 'RB(Material Mixing/Material Prep)', NULL, 'Sr. Line Leader', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 'March deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (48, 'RB(Material Mixing/Material Prep)', NULL, 'Line Leader', 2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 2, 'Dec (1) & Mar (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (49, 'RB(Material Mixing/Material Prep)', NULL, 'Engineer', 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 'Dec deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (50, 'RB(Material Mixing/Material Prep)', NULL, 'Unskilled Operator', 14, 0, 0, 0, 0, 0, 0, 6, 8, 0, 14, 'Mar (6) & Apr (8)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (51, 'RB(Hot pressing/Refinement)', NULL, 'Unskilled Operator', 40, 0, 0, 0, 0, 0, 0, 20, 20, 0, 40, 'Mar (20) & Apr (20)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (52, 'IP(Injection)', NULL, 'Supervisor', 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 'Dec deployment', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (53, 'IP(Injection)', NULL, 'Sr. Line Leader', 3, 0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 'Dec (1) & Mar (2)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (54, 'IP(Injection)', NULL, 'Line Leader', 4, 0, 0, 0, 0, 0, 0, 1, 2, 1, 4, 'Mar (1), Apr (2), May (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (55, 'IP(Injection)', NULL, 'Unskilled Operator', 110, 0, 0, 0, 0, 0, 0, 60, 50, 0, 110, 'Ramp-up: Mar 60, Apr 50', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (56, 'GAP Regional Office', NULL, 'Sr Manager(Johnny)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Johnny') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (57, 'GAP Regional Office', NULL, 'Sr. Executive Assistant', 3, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 'Need Johnny DOI OF Candidate- 27.10.2026- Not now - Johnny will give date later', 'pending_doi', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (58, 'GAP Regional Office', NULL, 'Executive Assistant', 4, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 'Need Johnny DOI OF Candidate- 27.10.2026- Not now - Johnny will give date later', 'pending_doi', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (59, 'Sourcing/Production Planning/IE/LEAN', NULL, 'Manager(Ryan)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Ryan') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (60, 'Production Planning/IE/LEAN', NULL, 'Sr. Supervisor (Schum)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Schum') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (61, 'Purchasing', NULL, 'Manager(Md. Imroz)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Md. Imroz') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (62, 'Purchasing', NULL, 'Supervisor', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 'Appointed - Santhana Krishnan 1st wave', 'appointed', 'Santhana Krishnan') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (63, 'Purchasing', NULL, 'Executive Assistant', 2, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, 'Appointed - Abbas 1st wave (1) & Mar (1)', 'appointed', 'Abbas') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (64, 'IT', NULL, 'Manager(Riti)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Riti') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (65, 'IT', NULL, 'Sr. Executive Assistant', 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 'Appointed Shathis S Supervisor', 'appointed', 'Shathis S') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (66, 'IT', NULL, 'Executive Assistant', 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 'Appointed - Srinivasan', 'appointed', 'Srinivasan') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (67, 'MES', NULL, 'Manager(Riti)', 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 'To be discussed with HOD', 'discussion', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (68, 'MES', NULL, 'Executive Assistant', 3, 0, 0, 2, 1, 0, 0, 0, 0, 0, 3, 'To be discussed with HOD', 'discussion', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (69, 'QC', NULL, 'Manager(Tulip)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Tulip') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (70, 'QC', NULL, 'Supervisor', 2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 2, 'Oct (Sourcing) & Nov (Discuss with HOD)', 'sourcing', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (71, 'QC', NULL, 'Sr. Line Leader', 5, 0, 2, 2, 1, 0, 0, 0, 0, 0, 5, 'Dilip Kumar & Sr line leader 1st WAVE', 'appointed', 'Dilip Kumar') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (72, 'QC', NULL, 'Line Leader/Assistant', 7, 0, 2, 2, 2, 0, 0, 1, 0, 0, 7, 'Venkatesh K Line leader 1st wave', 'appointed', 'Venkatesh K') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (73, 'QC', NULL, 'Assistant Engineer', 16, 0, 0, 16, 0, 0, 0, 0, 0, 0, 16, 'Nov Batch 16 Engineers', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (74, 'QC', NULL, 'Operator', 45, 0, 0, 45, 0, 0, 0, 0, 0, 0, 45, 'Nov Batch 45 Operators', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (75, 'QC (Lab)', NULL, 'Sr. Line Leader', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 'DHINAKARAN T - SR Line leader', 'appointed', 'DHINAKARAN T') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (76, 'QC (Lab)', NULL, 'Line Leader/Assistant', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 'SRINIVASAN V - Line leader', 'appointed', 'SRINIVASAN V') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (77, 'QC (Lab)', NULL, 'Assistant Engineer', 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 5, 'Sep Appointed (5)', 'appointed', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (78, 'ME', NULL, 'Manager', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 'Oct (Sourcing)', 'sourcing', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (79, 'ME', NULL, 'Supervisor', 3, 1, 0, 1, 1, 0, 0, 0, 0, 0, 3, 'Sep (1), Nov (1), Dec (1)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (80, 'ME', NULL, 'Sr. Line Leader', 3, 0, 1, 1, 1, 0, 0, 0, 0, 0, 3, 'Venkatesan M - Sr line leader appointed 1st wave', 'appointed', 'Venkatesan M') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (81, 'ME', NULL, 'Line Leader/Assistant', 8, 0, 0, 4, 4, 0, 0, 0, 0, 0, 8, 'Nov (4), Dec (4)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (82, 'ME', NULL, 'Technician/High Skilled', 13, 0, 0, 7, 6, 0, 0, 0, 0, 0, 13, 'Nov (7), Dec (6)', 'planned', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (83, 'CE', NULL, 'Supervisor', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 'Appointed - Vijaya Kumar c - 1st wave', 'appointed', 'Vijaya Kumar c') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (84, 'CE', NULL, 'Sr. Engineer', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 'Appointed - Mani G - 1st wave', 'appointed', 'Mani G') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (85, 'Sole Production', NULL, 'Manager(Dai wei)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Dai wei') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (86, 'Lean Production', NULL, 'Manager(Eric)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Eric') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ManpowerPlan" ("id", "dept", "subDept", "position", "plannedTotal", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "total", "remarks", "status", "appointedNames") VALUES (87, 'GAP Admin', NULL, 'Operation Director(Balar)', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Sep Appointed', 'appointed', 'Balar') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "DailyWorkLog" ("id", "departmentId", "reportedById", "shift", "targetOutput", "actualOutput", "manpowerPresent", "manpowerRequired", "status", "blockers", "notes") VALUES (7, 11, 24, 'Day Shift', 4200, 4050, 12, 15, 'On Schedule', 'Tamil selvan & Manogar supervising conveyor line 1. Waiting for December unskilled operator ramp (80 operators).', 'Assembly line running sample runs for C26 client verification.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "DailyWorkLog" ("id", "departmentId", "reportedById", "shift", "targetOutput", "actualOutput", "manpowerPresent", "manpowerRequired", "status", "blockers", "notes") VALUES (8, 12, 25, 'Day Shift', 6500, 6420, 15, 18, 'On Schedule', 'Rajasekar and Sarath Kumar lead cutters active. Laser table #3 calibration complete.', 'Jagan, Sathish, and Sathiyamoorthy managing bundle dispatch to printing.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "DailyWorkLog" ("id", "departmentId", "reportedById", "shift", "targetOutput", "actualOutput", "manpowerPresent", "manpowerRequired", "status", "blockers", "notes") VALUES (9, 19, 32, 'Day Shift', 5000, 4980, 12, 14, 'On Schedule', 'Dhinakaran T and Srinivasan V conducting bond strength tests in QC Lab.', 'AQL 2.5 audit passed with 0.8% defect score.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "DailyWorkLog" ("id", "departmentId", "reportedById", "shift", "targetOutput", "actualOutput", "manpowerPresent", "manpowerRequired", "status", "blockers", "notes") VALUES (10, 20, 33, 'Day Shift', 20, 20, 8, 8, 'Ahead', 'None. Venkatesan M and Mani G completed high-voltage wiring for IP Injection floor.', 'Ready for machinery installation.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ClientDemand" ("id", "clientName", "jobProfile", "departmentId", "requiredCount", "sourcingMonth", "interviewMonth", "consultationMonth", "currentPhase", "status", "budgetPerRole", "notes") VALUES (4, 'GAP Global Inc. (C26 Footwear Project)', 'Factory Headcount Ramp-up (Assembly, Cutting, Stockfitting, IP Injection, QC)', NULL, 1180, 'October (Wave 1 Technical)', 'November (Wave 2 Technical)', 'December (Mass Operator Wave)', 'Wave 1 Appointed & Wave 2 Technical Interviews', 'Active', 'Industry Competitive (Operators to Directors)', 'Master headcount plan approved for C26 plant. 1st wave appointed in Oct (Tamil selvan, Rajasekar, Manogar, Mohan Raj, Jagan, Dhinakaran, Mani G). March 1st week validation scheduled.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (7, 4, 11, 'Tamil selvan', 'tamil.selvan@c26plant.com', '+91 94441 10001', 'Sr. Supervisor', 'Joined', 100, true, true, true, true, true, 'Appointed in 1st wave - Assembly floor lead. Operating on line A1.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (8, 4, 11, 'Manogar', 'manogar@c26plant.com', '+91 94441 10002', 'Sr. Line Leader', 'Joined', 100, true, true, true, true, true, 'Appointed in 1st wave - Assembly Line 2 lead.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (9, 4, 11, 'Mohan Raj', 'mohan.raj@c26plant.com', '+91 94441 10003', 'Line Leader', 'Joined', 100, true, true, true, true, true, 'Appointed in 1st wave - Assembly Line leader.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (10, 4, 11, 'Thatchan murthy', 'thatchan.m@c26plant.com', '+91 94441 10004', 'Line Leader', 'Joined', 100, true, true, true, true, true, 'Appointed in 1st wave - Assembly Line leader.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (11, 4, 12, 'Rajasekar', 'rajasekar@c26plant.com', '+91 94441 10005', 'Sr. Line Leader', 'Joined', 100, true, true, true, true, true, 'Appointed 2 in 1st wave - Cutting/Stitching C26.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (12, 4, 12, 'Sarath Kumar', 'sarath.k@c26plant.com', '+91 94441 10006', 'Sr. Line Leader', 'Joined', 100, true, true, true, true, true, 'Appointed 2 in 1st wave - Cutting/Stitching C26.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (13, 4, 12, 'Jagan kumar', 'jagan.k@c26plant.com', '+91 94441 10007', 'Line Leader', 'Joined', 100, true, true, true, true, true, 'Appointed 3 in 1st wave - 1. Jagan kumar.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (14, 4, 12, 'Sathish kumar', 'sathish.k@c26plant.com', '+91 94441 10008', 'Line Leader', 'Joined', 100, true, true, true, true, true, 'Appointed 3 in 1st wave - 2. Sathish kumar.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (15, 4, 12, 'Sathiyamoorthy', 'sathiyamoorthy@c26plant.com', '+91 94441 10009', 'Line Leader', 'Joined', 100, true, true, true, true, true, 'Appointed 3 in 1st wave - 3. Sathiyamoorthy.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (16, 4, 21, 'Santhana Krishnan', 'santhana.k@c26plant.com', '+91 94441 10010', 'Supervisor', 'Joined', 100, true, true, true, true, true, 'Appointed - Santhana Krishnan 1st wave (Purchasing).') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (17, 4, 21, 'Abbas', 'abbas@c26plant.com', '+91 94441 10011', 'Executive Assistant', 'Joined', 100, true, true, true, true, true, 'Appointed - Abbas 1st wave (Purchasing).') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (18, 4, 21, 'Shathis S', 'shathis.s@c26plant.com', '+91 94441 10012', 'Sr. Executive Assistant / Supervisor', 'Onboarding', 80, true, true, true, true, false, 'Appointed Shathis S Supervisor (IT) - November deployment.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (19, 4, 21, 'Srinivasan', 'srinivasan.it@c26plant.com', '+91 94441 10013', 'Executive Assistant', 'Joined', 100, true, true, true, true, false, 'Appointed - Srinivasan (IT) - November deployment.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (20, 4, 19, 'Dhinakaran T', 'dhinakaran.t@c26plant.com', '+91 94441 10014', 'Sr. Line Leader', 'Joined', 100, true, true, true, true, true, 'DHINAKARAN T - SR Line leader (QC Lab).') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (21, 4, 19, 'Srinivasan V', 'srinivasan.v@c26plant.com', '+91 94441 10015', 'Line Leader/Assistant', 'Joined', 100, true, true, true, true, true, 'SRINIVASAN V - Line leader (QC Lab).') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (22, 4, 20, 'Venkatesan M', 'venkatesan.m@c26plant.com', '+91 94441 10016', 'Sr. Line Leader', 'Joined', 100, true, true, true, true, true, 'Venkatesan M - Sr line leader appointed 1st wave (ME Maintenance).') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (23, 4, 20, 'Vijaya Kumar C', 'vijayakumar.c@c26plant.com', '+91 94441 10017', 'Supervisor', 'Joined', 100, true, true, true, true, true, 'Appointed - Vijaya Kumar c - 1st wave (CE).') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Candidate" ("id", "clientDemandId", "departmentId", "name", "email", "phone", "appliedRole", "currentStage", "onboardingProgress", "docVerification", "bgvCheck", "safetyInductionDone", "workstationAssigned", "mentorAssigned", "notes") VALUES (24, 4, 20, 'Mani G', 'mani.g@c26plant.com', '+91 94441 10018', 'Sr. Engineer', 'Joined', 100, true, true, true, true, true, 'Appointed - Mani G - 1st wave (CE Sr. Engineer).') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "HrDirective" ("id", "authorId", "title", "content", "category", "priority", "targetDepartmentId") VALUES (4, 23, 'C26 Master Headcount Plan: 1st Wave Appointed Staff Announcement', '1st Wave appointments completed: Tamil selvan (Assembly Sr. Supervisor), Manogar, Mohan Raj, Thatchan murthy, Rajasekar, Sarath Kumar, Jagan, Sathish, Sathiyamoorthy, Santhana Krishnan, Abbas, Dhinakaran T, Srinivasan V, Venkatesan M, Vijaya Kumar C, Mani G. Welcome to C26 operations!', 'Recruitment Milestone', 'Urgent', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "HrDirective" ("id", "authorId", "title", "content", "category", "priority", "targetDepartmentId") VALUES (5, 23, 'Pending Johnny Date of Interview (DOI) for GAP Regional Executive Assistants', 'Candidates for Sr. Executive Assistant (3) and Executive Assistant (4) are in pipeline. Waiting for Johnny DOI Confirmation: 27.10.2026 (Johnny will confirm exact date later).', 'Recruitment Milestone', 'High', NULL) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "HrDirective" ("id", "authorId", "title", "content", "category", "priority", "targetDepartmentId") VALUES (6, 23, 'HOD Discussion Notice: MES & QC Supervisor Positions', 'Pending interviews for MES Manager, MES Executive Assistant, and QC Supervisor to be discussed with HOD (Riti & Tulip) before November rollout.', 'Policy Update', 'Normal', NULL) ON CONFLICT ("id") DO NOTHING;

-- Reset sequences
SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max("id"), 1)) FROM "User";
SELECT setval(pg_get_serial_sequence('"Department"', 'id'), coalesce(max("id"), 1)) FROM "Department";
SELECT setval(pg_get_serial_sequence('"ManpowerPlan"', 'id'), coalesce(max("id"), 1)) FROM "ManpowerPlan";
SELECT setval(pg_get_serial_sequence('"DailyWorkLog"', 'id'), coalesce(max("id"), 1)) FROM "DailyWorkLog";
SELECT setval(pg_get_serial_sequence('"ClientDemand"', 'id'), coalesce(max("id"), 1)) FROM "ClientDemand";
SELECT setval(pg_get_serial_sequence('"Candidate"', 'id'), coalesce(max("id"), 1)) FROM "Candidate";
SELECT setval(pg_get_serial_sequence('"HrDirective"', 'id'), coalesce(max("id"), 1)) FROM "HrDirective";
SELECT setval(pg_get_serial_sequence('"Task"', 'id'), coalesce(max("id"), 1)) FROM "Task";
