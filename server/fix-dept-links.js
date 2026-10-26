// One-time fix: link managers who were seeded without a department.
// Safe to run more than once — it only fills in users whose department is still empty.
// Run:  node fix-dept-links.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LINKS = {
  'johnny.gap@workspace.app':       'ADM',  // GAP Regional Office → Warehouse & GAP Administration
  'imroz.purchasing@workspace.app': 'SCM',  // Purchasing → Sourcing, Purchasing & Production Plan
  'riti.it@workspace.app':          'QC',   // IT & MES → Quality Control & Lab (QC / MES)
  'eric.lean@workspace.app':        'SCM',  // Lean Production → Sourcing ... IE / LEAN
  'schum.planning@workspace.app':   'SCM',  // Production Plan → Sourcing, Purchasing & Production Plan
  'duty.manager@workspace.app':     'ASSY', // Duty Manager (Assembly Floor) → Assembly
};

(async () => {
  for (const [email, code] of Object.entries(LINKS)) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { console.log(`skip  ${email} (user not found)`); continue; }
    if (user.departmentId) { console.log(`ok    ${email} already linked`); continue; }
    const dept = await prisma.department.findUnique({ where: { code } });
    if (!dept) { console.log(`skip  ${email} (department ${code} not found)`); continue; }
    await prisma.user.update({ where: { id: user.id }, data: { departmentId: dept.id } });
    console.log(`fixed ${email} → ${dept.name}`);
  }
})()
  .catch(e => { console.error('Failed:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
