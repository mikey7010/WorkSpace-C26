const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Actual Company C26 Manpower Plan & Factory Data...');

  // Clear existing
  await prisma.comment.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.dailyWorkLog.deleteMany({});
  await prisma.hrDirective.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.clientDemand.deleteMany({});
  await prisma.manpowerPlan.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  const hrHash = await bcrypt.hash('hr123', 10);
  const deptHash = await bcrypt.hash('dept123', 10);

  // 1. HR Executive (You)
  const hrUser = await prisma.user.create({
    data: {
      name: 'Priya Sharma (HR Head)',
      email: 'hr@workspace.app',
      passwordHash: hrHash,
      role: 'hr_admin',
      designation: 'Chief HR Officer & Workforce Planning Director',
      phone: '+91 98765 43210',
    },
  });

  // 2. Company Departments
  const departmentsData = [
    { name: 'Assembly',                                 code: 'ASSY', targetManpower: 176, currentManpower: 12, desc: 'Footwear & garment assembly lines, conveyor stitching, duty management.' },
    { name: 'Cutting / Stitching (C26)',                code: 'CUT',  targetManpower: 226, currentManpower: 15, desc: 'Computerized laser cutting, high-speed stitching, die cutting.' },
    { name: 'Auto Cutting / Printing / No Sew (C26)',   code: 'ACUT', targetManpower: 43,  currentManpower: 5,  desc: 'Automated digital cutting, high-frequency embossing & no-sew bonding.' },
    { name: 'Printing & No Sew',                        code: 'PRNT', targetManpower: 75,  currentManpower: 8,  desc: 'Screen printing, sublimation transfer, heat seal & no-sew laminates.' },
    { name: 'Embroidery & Logistics (C26)',             code: 'EMB',  targetManpower: 121, currentManpower: 10, desc: 'Multi-head Tajima embroidery, monogramming, internal logistics.' },
    { name: 'Stockfitting (Spray / Degreasing / Sole)', code: 'STCK', targetManpower: 221, currentManpower: 14, desc: 'Sole assembly, UV treatment, chemical degreasing, spray painting.' },
    { name: 'RB (Material Mixing / Hot Pressing)',      code: 'RB',   targetManpower: 60,  currentManpower: 6,  desc: 'Rubber compound mixing, curing, refinement & hot compression pressing.' },
    { name: 'IP (Injection & Pelleting)',               code: 'IP',   targetManpower: 123, currentManpower: 8,  desc: 'EVA pelleting, color matching, high-precision injection molding.' },
    { name: 'Quality Control & Lab (QC / MES)',         code: 'QC',   targetManpower: 78,  currentManpower: 12, desc: 'Inline QC inspection, physical testing lab, AQL audits & MES tracking.' },
    { name: 'Mechanical & Chemical Engineering (ME/CE)',code: 'ENG',  targetManpower: 33,  currentManpower: 8,  desc: 'Preventive plant maintenance, equipment calibration, civil & chemical safety.' },
    { name: 'Sourcing, Purchasing & Production Plan',   code: 'SCM',  targetManpower: 30,  currentManpower: 9,  desc: 'Vendor sourcing, material procurement, ERP production scheduling & IE/LEAN.' },
    { name: 'Warehouse (RMW / FGW) & GAP Administration',code: 'ADM', targetManpower: 35,  currentManpower: 7,  desc: 'Raw material warehouse, finished goods warehouse, regional admin.' },
  ];

  const createdDepts = [];

  // Key HOD / Managers from company sheet
  const hodProfiles = [
    { name: 'Tamil selvan',   email: 'tamil.assembly@workspace.app',    role: 'dept_head', designation: 'Sr. Supervisor (Assembly - 1st Wave Appointed)' },
    { name: 'Rajasekar',      email: 'rajasekar.cutting@workspace.app', role: 'dept_head', designation: 'Sr. Line Leader (Cutting/Stitching - 1st Wave)' },
    { name: 'Manogar',        email: 'manogar.acut@workspace.app',      role: 'dept_head', designation: 'Sr. Line Leader (Auto Cutting - 1st Wave)' },
    { name: 'Santhana Krishnan', email: 'santhana.prnt@workspace.app',  role: 'dept_head', designation: 'Supervisor (Printing & Purchasing - 1st Wave)' },
    { name: 'Shathis S',      email: 'shathis.emb@workspace.app',       role: 'dept_head', designation: 'Supervisor (Embroidery & Technical)' },
    { name: 'Vijaya Kumar C', email: 'vijay.stock@workspace.app',       role: 'dept_head', designation: 'Supervisor (Stockfitting - 1st Wave Appointed)' },
    { name: 'Mani G',         email: 'mani.rb@workspace.app',           role: 'dept_head', designation: 'Sr. Engineer (RB / CE - 1st Wave Appointed)' },
    { name: 'Dai wei',        email: 'daiwei.ip@workspace.app',         role: 'dept_head', designation: 'Manager (Sole & IP Injection Production)' },
    { name: 'Tulip',          email: 'tulip.qc@workspace.app',          role: 'dept_head', designation: 'Manager (Quality Control & Compliance)' },
    { name: 'Venkatesan M',   email: 'venkatesan.me@workspace.app',     role: 'dept_head', designation: 'Sr. Line Leader (ME Maintenance - 1st Wave)' },
    { name: 'Ryan',           email: 'ryan.sourcing@workspace.app',     role: 'dept_head', designation: 'Manager (Sourcing / Production Planning / IE / LEAN)' },
    { name: 'Balar',          email: 'balar.director@workspace.app',    role: 'dept_head', designation: 'Operation Director (GAP Admin & Plant Lead)' },
  ];

  for (let i = 0; i < departmentsData.length; i++) {
    const dData = departmentsData[i];
    const hData = hodProfiles[i];

    const headUser = await prisma.user.create({
      data: {
        name: hData.name,
        email: hData.email,
        passwordHash: deptHash,
        role: hData.role,
        designation: hData.designation,
      },
    });

    const dept = await prisma.department.create({
      data: {
        name: dData.name,
        code: dData.code,
        description: dData.desc,
        targetManpower: dData.targetManpower,
        currentManpower: dData.currentManpower,
        headId: headUser.id,
      },
    });

    await prisma.user.update({
      where: { id: headUser.id },
      data: { departmentId: dept.id },
    });

    createdDepts.push({ dept, head: headUser });
  }

  // 3. Additional Key Managers & First-Wave Appointed Leaders
  const extraLeaders = [
    { name: 'Johnny',            email: 'johnny.gap@workspace.app',      designation: 'Sr Manager (GAP Regional Office)', role: 'dept_head' },
    { name: 'Md. Imroz',         email: 'imroz.purchasing@workspace.app', designation: 'Manager (Purchasing)',             role: 'dept_head' },
    { name: 'Riti',              email: 'riti.it@workspace.app',         designation: 'Manager (IT & MES)',               role: 'dept_head' },
    { name: 'Eric',              email: 'eric.lean@workspace.app',       designation: 'Manager (Lean Production)',        role: 'dept_head' },
    { name: 'Schum',             email: 'schum.planning@workspace.app',  designation: 'Sr. Supervisor (Production Plan)', role: 'dept_head' },
    { name: 'Duty Manager',      email: 'duty.manager@workspace.app',    designation: 'Duty Manager (Assembly Floor)',    role: 'dept_head' },
  ];

  for (const l of extraLeaders) {
    await prisma.user.create({
      data: {
        name: l.name,
        email: l.email,
        passwordHash: deptHash,
        role: l.role,
        designation: l.designation,
      },
    });
  }

  // 4. Exact Manpower Plan Matrix Rows from the Spreadsheet (All 5 Images)
  const manpowerRows = [
    // --- Image 1: Assembly & Cutting ---
    { dept: 'Assembly', position: 'Duty Manager', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Duty Manager' },
    { dept: 'Assembly', position: 'Sr. Supervisor', plannedTotal: 1, sep: 0, oct: 1, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Appointed - 1st wave - Tamil selvan', status: 'appointed', appointedNames: 'Tamil selvan' },
    { dept: 'Assembly', position: 'Supervisor', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Dec Deployment', status: 'planned' },
    { dept: 'Assembly', position: 'Sr. Line Leader', plannedTotal: 2, sep: 0, oct: 1, nov: 0, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 2, remarks: 'Appointed - 1st wave Manogar', status: 'appointed', appointedNames: 'Manogar' },
    { dept: 'Assembly', position: 'Line Leader', plannedTotal: 6, sep: 0, oct: 2, nov: 0, dec: 2, jan: 0, feb: 0, mar: 2, apr: 0, may: 0, total: 6, remarks: 'Appointed 2 - 1st wave - Mohan Raj & Thatchan murthy', status: 'appointed', appointedNames: 'Mohan Raj, Thatchan murthy' },
    { dept: 'Assembly', position: 'Assistant Engineer', plannedTotal: 5, sep: 0, oct: 0, nov: 0, dec: 3, jan: 0, feb: 0, mar: 2, apr: 0, may: 0, total: 5, remarks: 'Dec (3) & Mar (2)', status: 'planned' },
    { dept: 'Assembly', position: 'High Skilled Operator', plannedTotal: 2, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 2, remarks: 'Dec (1) & Mar (1)', status: 'planned' },
    { dept: 'Assembly', position: 'Unskilled Operator', plannedTotal: 156, sep: 0, oct: 0, nov: 0, dec: 80, jan: 0, feb: 0, mar: 76, apr: 0, may: 0, total: 156, remarks: 'Heavy Operator Ramp: Dec 80, Mar 76', status: 'planned' },

    { dept: 'Cutting/Stitching (C26)', position: 'Sr. Line Leader', plannedTotal: 2, sep: 0, oct: 2, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 2, remarks: 'Appointed 2 - 1st wave - Rajasekar, Sarath Kumar', status: 'appointed', appointedNames: 'Rajasekar, Sarath Kumar' },
    { dept: 'Cutting/Stitching (C26)', position: 'Line Leader', plannedTotal: 4, sep: 0, oct: 3, nov: 0, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 4, remarks: 'Appointed 3 - 1st wave - Jagan kumar, Sathish kumar, Sathiyamoorthy', status: 'appointed', appointedNames: 'Jagan kumar, Sathish kumar, Sathiyamoorthy' },
    { dept: 'Cutting/Stitching (C26)', position: 'Unskilled Operator', plannedTotal: 220, sep: 0, oct: 0, nov: 0, dec: 60, jan: 0, feb: 0, mar: 60, apr: 100, may: 0, total: 220, remarks: 'Ramp-up: Dec 60, Mar 60, Apr 100', status: 'planned' },

    { dept: 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', position: 'Sr. Supervisor', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', position: 'Sr. Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', position: 'Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', position: 'Executive Assistant', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', position: 'High Skilled Operator', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Auto Cutting/Printing/HF/No Sew (C26) (Logistics)', position: 'Unskilled Operator', plannedTotal: 3, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 3, apr: 0, may: 0, total: 3, remarks: 'March deployment (3)', status: 'planned' },

    { dept: 'Auto Cutting/Printing', position: 'Supervisor', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Auto Cutting (Printing/HF/No Sew (C26))', position: 'Sr. Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Dec deployment', status: 'planned' },
    { dept: 'Auto Cutting (Printing/HF/No Sew (C26))', position: 'Line Leader', plannedTotal: 2, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 2, remarks: 'Dec (1) & Mar (1)', status: 'planned' },
    { dept: 'Auto Cutting (Printing/HF/No Sew (C26))', position: 'Unskilled Operator', plannedTotal: 15, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 8, apr: 7, may: 0, total: 15, remarks: 'Mar (8) & Apr (7)', status: 'planned' },

    { dept: 'Printing', position: 'Sr. Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Printing', position: 'Line Leader', plannedTotal: 2, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 2, remarks: 'Dec (1) & Mar (1)', status: 'planned' },
    { dept: 'Printing', position: 'Assistant Engineer', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Printing', position: 'Unskilled Operator', plannedTotal: 18, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 10, apr: 8, may: 0, total: 18, remarks: 'Mar (10) & Apr (8)', status: 'planned' },

    // --- Image 2: No-Sew, Embroidery, Stockfitting ---
    { dept: 'HF/No Sew', position: 'Supervisor', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'HF/No Sew', position: 'Sr. Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'HF', position: 'Unskilled Operator', plannedTotal: 8, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 4, apr: 4, may: 0, total: 8, remarks: 'Mar (4) & Apr (4)', status: 'planned' },
    { dept: 'No Sew', position: 'Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Dec deployment', status: 'planned' },
    { dept: 'No Sew', position: 'Unskilled Operator', plannedTotal: 45, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 25, apr: 20, may: 0, total: 45, remarks: 'Mar (25) & Apr (20)', status: 'planned' },

    { dept: 'Embroidery/Logistics (C26)', position: 'Sr. Supervisor', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Embroidery (C26)', position: 'Supervisor', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Embroidery (C26)', position: 'Sr. Line Leader', plannedTotal: 2, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 2, remarks: 'Dec (1) & Mar (1)', status: 'planned' },
    { dept: 'Embroidery (C26)', position: 'Line Leader', plannedTotal: 3, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 3, apr: 0, may: 0, total: 3, remarks: 'March deployment (3)', status: 'planned' },
    { dept: 'Embroidery (C26)', position: 'Executive Assistant', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Embroidery (C26)', position: 'High Skilled Operator', plannedTotal: 3, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 3, apr: 0, may: 0, total: 3, remarks: 'March deployment (3)', status: 'planned' },
    { dept: 'Embroidery (C26)', position: 'Unskilled Operator', plannedTotal: 109, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 60, apr: 49, may: 0, total: 109, remarks: 'Ramp-up: Mar 60, Apr 49', status: 'planned' },

    { dept: 'Stockfitting (spray paint)', position: 'Sr. Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Stockfitting (spray paint)', position: 'Line Leader', plannedTotal: 5, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 3, apr: 2, may: 0, total: 5, remarks: 'Mar (3) & Apr (2)', status: 'planned' },
    { dept: 'Stockfitting (spray paint)', position: 'Unskilled Operator', plannedTotal: 95, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 50, apr: 45, may: 0, total: 95, remarks: 'Ramp-up: Mar 50, Apr 45', status: 'planned' },
    { dept: 'Stockfitting (Degreasing & UV Treatment)', position: 'Line Leader', plannedTotal: 2, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 1, may: 0, total: 2, remarks: 'Mar (1) & Apr (1)', status: 'planned' },
    { dept: 'Stockfitting (Degreasing & UV Treatment)', position: 'Unskilled Operator', plannedTotal: 32, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 20, apr: 12, may: 0, total: 32, remarks: 'Mar (20) & Apr (12)', status: 'planned' },
    { dept: 'Stockfitting (Sole Assembly)', position: 'Sr. Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'Stockfitting (Sole Assembly)', position: 'Line Leader', plannedTotal: 2, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 1, may: 0, total: 2, remarks: 'Mar (1) & Apr (1)', status: 'planned' },
    { dept: 'Stockfitting (Sole Assembly)', position: 'Unskilled Operator', plannedTotal: 80, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 50, apr: 30, may: 0, total: 80, remarks: 'Mar (50) & Apr (30)', status: 'planned' },

    // --- Image 3: RB, IP Injection & GAP Regional ---
    { dept: 'RB(Material Mixing/Material Prep)', position: 'Supervisor', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'RB(Material Mixing/Material Prep)', position: 'Sr. Line Leader', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 1, remarks: 'March deployment', status: 'planned' },
    { dept: 'RB(Material Mixing/Material Prep)', position: 'Line Leader', plannedTotal: 2, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 2, remarks: 'Dec (1) & Mar (1)', status: 'planned' },
    { dept: 'RB(Material Mixing/Material Prep)', position: 'Engineer', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Dec deployment', status: 'planned' },
    { dept: 'RB(Material Mixing/Material Prep)', position: 'Unskilled Operator', plannedTotal: 14, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 6, apr: 8, may: 0, total: 14, remarks: 'Mar (6) & Apr (8)', status: 'planned' },
    { dept: 'RB(Hot pressing/Refinement)', position: 'Unskilled Operator', plannedTotal: 40, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 20, apr: 20, may: 0, total: 40, remarks: 'Mar (20) & Apr (20)', status: 'planned' },

    { dept: 'IP(Injection)', position: 'Supervisor', plannedTotal: 1, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Dec deployment', status: 'planned' },
    { dept: 'IP(Injection)', position: 'Sr. Line Leader', plannedTotal: 3, sep: 0, oct: 0, nov: 0, dec: 1, jan: 0, feb: 0, mar: 2, apr: 0, may: 0, total: 3, remarks: 'Dec (1) & Mar (2)', status: 'planned' },
    { dept: 'IP(Injection)', position: 'Line Leader', plannedTotal: 4, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 2, may: 1, total: 4, remarks: 'Mar (1), Apr (2), May (1)', status: 'planned' },
    { dept: 'IP(Injection)', position: 'Unskilled Operator', plannedTotal: 110, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 60, apr: 50, may: 0, total: 110, remarks: 'Ramp-up: Mar 60, Apr 50', status: 'planned' },

    { dept: 'GAP Regional Office', position: 'Sr Manager(Johnny)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Johnny' },
    { dept: 'GAP Regional Office', position: 'Sr. Executive Assistant', plannedTotal: 3, sep: 0, oct: 3, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 3, remarks: 'Need Johnny DOI OF Candidate- 27.10.2026- Not now - Johnny will give date later', status: 'pending_doi' },
    { dept: 'GAP Regional Office', position: 'Executive Assistant', plannedTotal: 4, sep: 0, oct: 4, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 4, remarks: 'Need Johnny DOI OF Candidate- 27.10.2026- Not now - Johnny will give date later', status: 'pending_doi' },

    // --- Image 4: Planning, Purchasing, IT, MES & QC ---
    { dept: 'Sourcing/Production Planning/IE/LEAN', position: 'Manager(Ryan)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Ryan' },
    { dept: 'Production Planning/IE/LEAN', position: 'Sr. Supervisor (Schum)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Schum' },
    { dept: 'Purchasing', position: 'Manager(Md. Imroz)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Md. Imroz' },
    { dept: 'Purchasing', position: 'Supervisor', plannedTotal: 1, sep: 0, oct: 1, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Appointed - Santhana Krishnan 1st wave', status: 'appointed', appointedNames: 'Santhana Krishnan' },
    { dept: 'Purchasing', position: 'Executive Assistant', plannedTotal: 2, sep: 0, oct: 1, nov: 0, dec: 0, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 2, remarks: 'Appointed - Abbas 1st wave (1) & Mar (1)', status: 'appointed', appointedNames: 'Abbas' },

    { dept: 'IT', position: 'Manager(Riti)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Riti' },
    { dept: 'IT', position: 'Sr. Executive Assistant', plannedTotal: 1, sep: 0, oct: 0, nov: 1, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Appointed Shathis S Supervisor', status: 'appointed', appointedNames: 'Shathis S' },
    { dept: 'IT', position: 'Executive Assistant', plannedTotal: 1, sep: 0, oct: 0, nov: 1, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Appointed - Srinivasan', status: 'appointed', appointedNames: 'Srinivasan' },

    { dept: 'MES', position: 'Manager(Riti)', plannedTotal: 1, sep: 0, oct: 0, nov: 1, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'To be discussed with HOD', status: 'discussion' },
    { dept: 'MES', position: 'Executive Assistant', plannedTotal: 3, sep: 0, oct: 0, nov: 2, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 3, remarks: 'To be discussed with HOD', status: 'discussion' },

    { dept: 'QC', position: 'Manager(Tulip)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Tulip' },
    { dept: 'QC', position: 'Supervisor', plannedTotal: 2, sep: 0, oct: 1, nov: 1, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 2, remarks: 'Oct (Sourcing) & Nov (Discuss with HOD)', status: 'sourcing' },
    { dept: 'QC', position: 'Sr. Line Leader', plannedTotal: 5, sep: 0, oct: 2, nov: 2, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 5, remarks: 'Dilip Kumar & Sr line leader 1st WAVE', status: 'appointed', appointedNames: 'Dilip Kumar' },
    { dept: 'QC', position: 'Line Leader/Assistant', plannedTotal: 7, sep: 0, oct: 2, nov: 2, dec: 2, jan: 0, feb: 0, mar: 1, apr: 0, may: 0, total: 7, remarks: 'Venkatesh K Line leader 1st wave', status: 'appointed', appointedNames: 'Venkatesh K' },
    { dept: 'QC', position: 'Assistant Engineer', plannedTotal: 16, sep: 0, oct: 0, nov: 16, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 16, remarks: 'Nov Batch 16 Engineers', status: 'planned' },
    { dept: 'QC', position: 'Operator', plannedTotal: 45, sep: 0, oct: 0, nov: 45, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 45, remarks: 'Nov Batch 45 Operators', status: 'planned' },

    { dept: 'QC (Lab)', position: 'Sr. Line Leader', plannedTotal: 1, sep: 0, oct: 1, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'DHINAKARAN T - SR Line leader', status: 'appointed', appointedNames: 'DHINAKARAN T' },
    { dept: 'QC (Lab)', position: 'Line Leader/Assistant', plannedTotal: 1, sep: 0, oct: 1, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'SRINIVASAN V - Line leader', status: 'appointed', appointedNames: 'SRINIVASAN V' },
    { dept: 'QC (Lab)', position: 'Assistant Engineer', plannedTotal: 5, sep: 5, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 5, remarks: 'Sep Appointed (5)', status: 'appointed' },

    // --- Image 5: ME, CE, Sole Production, Admin ---
    { dept: 'ME', position: 'Manager', plannedTotal: 1, sep: 0, oct: 1, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Oct (Sourcing)', status: 'sourcing' },
    { dept: 'ME', position: 'Supervisor', plannedTotal: 3, sep: 1, oct: 0, nov: 1, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 3, remarks: 'Sep (1), Nov (1), Dec (1)', status: 'planned' },
    { dept: 'ME', position: 'Sr. Line Leader', plannedTotal: 3, sep: 0, oct: 1, nov: 1, dec: 1, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 3, remarks: 'Venkatesan M - Sr line leader appointed 1st wave', status: 'appointed', appointedNames: 'Venkatesan M' },
    { dept: 'ME', position: 'Line Leader/Assistant', plannedTotal: 8, sep: 0, oct: 0, nov: 4, dec: 4, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 8, remarks: 'Nov (4), Dec (4)', status: 'planned' },
    { dept: 'ME', position: 'Technician/High Skilled', plannedTotal: 13, sep: 0, oct: 0, nov: 7, dec: 6, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 13, remarks: 'Nov (7), Dec (6)', status: 'planned' },

    { dept: 'CE', position: 'Supervisor', plannedTotal: 1, sep: 0, oct: 1, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Appointed - Vijaya Kumar c - 1st wave', status: 'appointed', appointedNames: 'Vijaya Kumar c' },
    { dept: 'CE', position: 'Sr. Engineer', plannedTotal: 1, sep: 0, oct: 1, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Appointed - Mani G - 1st wave', status: 'appointed', appointedNames: 'Mani G' },

    { dept: 'Sole Production', position: 'Manager(Dai wei)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Dai wei' },
    { dept: 'Lean Production', position: 'Manager(Eric)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Eric' },
    { dept: 'GAP Admin', position: 'Operation Director(Balar)', plannedTotal: 1, sep: 1, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, apr: 0, may: 0, total: 1, remarks: 'Sep Appointed', status: 'appointed', appointedNames: 'Balar' },
  ];

  for (const r of manpowerRows) {
    await prisma.manpowerPlan.create({ data: r });
  }

  // 5. Seed Client Demand from Sheet
  const primaryDemand = await prisma.clientDemand.create({
    data: {
      clientName: 'GAP Global Inc. (C26 Footwear Project)',
      jobProfile: 'Factory Headcount Ramp-up (Assembly, Cutting, Stockfitting, IP Injection, QC)',
      requiredCount: 1180,
      targetDeploymentDate: new Date('2027-03-31'),
      sourcingMonth: 'October (Wave 1 Technical)',
      interviewMonth: 'November (Wave 2 Technical)',
      consultationMonth: 'December (Mass Operator Wave)',
      currentPhase: 'Wave 1 Appointed & Wave 2 Technical Interviews',
      status: 'Active',
      budgetPerRole: 'Industry Competitive (Operators to Directors)',
      notes: 'Master headcount plan approved for C26 plant. 1st wave appointed in Oct (Tamil selvan, Rajasekar, Manogar, Mohan Raj, Jagan, Dhinakaran, Mani G). March 1st week validation scheduled.',
    },
  });

  // 6. Actual Appointed Candidates from the Sheet into Onboarding Pipeline
  const appointedCandidates = [
    {
      name: 'Tamil selvan', email: 'tamil.selvan@c26plant.com', phone: '+91 94441 10001',
      appliedRole: 'Sr. Supervisor', clientDemandId: primaryDemand.id, departmentId: createdDepts[0].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-15'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed in 1st wave - Assembly floor lead. Operating on line A1.',
    },
    {
      name: 'Manogar', email: 'manogar@c26plant.com', phone: '+91 94441 10002',
      appliedRole: 'Sr. Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[0].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-18'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed in 1st wave - Assembly Line 2 lead.',
    },
    {
      name: 'Mohan Raj', email: 'mohan.raj@c26plant.com', phone: '+91 94441 10003',
      appliedRole: 'Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[0].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-20'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed in 1st wave - Assembly Line leader.',
    },
    {
      name: 'Thatchan murthy', email: 'thatchan.m@c26plant.com', phone: '+91 94441 10004',
      appliedRole: 'Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[0].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-20'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed in 1st wave - Assembly Line leader.',
    },
    {
      name: 'Rajasekar', email: 'rajasekar@c26plant.com', phone: '+91 94441 10005',
      appliedRole: 'Sr. Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[1].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-16'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed 2 in 1st wave - Cutting/Stitching C26.',
    },
    {
      name: 'Sarath Kumar', email: 'sarath.k@c26plant.com', phone: '+91 94441 10006',
      appliedRole: 'Sr. Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[1].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-16'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed 2 in 1st wave - Cutting/Stitching C26.',
    },
    {
      name: 'Jagan kumar', email: 'jagan.k@c26plant.com', phone: '+91 94441 10007',
      appliedRole: 'Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[1].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-22'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed 3 in 1st wave - 1. Jagan kumar.',
    },
    {
      name: 'Sathish kumar', email: 'sathish.k@c26plant.com', phone: '+91 94441 10008',
      appliedRole: 'Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[1].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-22'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed 3 in 1st wave - 2. Sathish kumar.',
    },
    {
      name: 'Sathiyamoorthy', email: 'sathiyamoorthy@c26plant.com', phone: '+91 94441 10009',
      appliedRole: 'Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[1].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-22'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed 3 in 1st wave - 3. Sathiyamoorthy.',
    },
    {
      name: 'Santhana Krishnan', email: 'santhana.k@c26plant.com', phone: '+91 94441 10010',
      appliedRole: 'Supervisor', clientDemandId: primaryDemand.id, departmentId: createdDepts[10].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-24'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed - Santhana Krishnan 1st wave (Purchasing).',
    },
    {
      name: 'Abbas', email: 'abbas@c26plant.com', phone: '+91 94441 10011',
      appliedRole: 'Executive Assistant', clientDemandId: primaryDemand.id, departmentId: createdDepts[10].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-24'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed - Abbas 1st wave (Purchasing).',
    },
    {
      name: 'Shathis S', email: 'shathis.s@c26plant.com', phone: '+91 94441 10012',
      appliedRole: 'Sr. Executive Assistant / Supervisor', clientDemandId: primaryDemand.id, departmentId: createdDepts[10].dept.id,
      currentStage: 'Onboarding', joiningDate: new Date('2026-11-05'),
      onboardingProgress: 80, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: false,
      notes: 'Appointed Shathis S Supervisor (IT) - November deployment.',
    },
    {
      name: 'Srinivasan', email: 'srinivasan.it@c26plant.com', phone: '+91 94441 10013',
      appliedRole: 'Executive Assistant', clientDemandId: primaryDemand.id, departmentId: createdDepts[10].dept.id,
      currentStage: 'Onboarding', joiningDate: new Date('2026-11-05'),
      onboardingProgress: 80, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: false,
      notes: 'Appointed - Srinivasan (IT) - November deployment.',
    },
    {
      name: 'Dhinakaran T', email: 'dhinakaran.t@c26plant.com', phone: '+91 94441 10014',
      appliedRole: 'Sr. Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[8].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-25'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'DHINAKARAN T - SR Line leader (QC Lab).',
    },
    {
      name: 'Srinivasan V', email: 'srinivasan.v@c26plant.com', phone: '+91 94441 10015',
      appliedRole: 'Line Leader/Assistant', clientDemandId: primaryDemand.id, departmentId: createdDepts[8].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-25'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'SRINIVASAN V - Line leader (QC Lab).',
    },
    {
      name: 'Venkatesan M', email: 'venkatesan.m@c26plant.com', phone: '+91 94441 10016',
      appliedRole: 'Sr. Line Leader', clientDemandId: primaryDemand.id, departmentId: createdDepts[9].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-20'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Venkatesan M - Sr line leader appointed 1st wave (ME Maintenance).',
    },
    {
      name: 'Vijaya Kumar C', email: 'vijayakumar.c@c26plant.com', phone: '+91 94441 10017',
      appliedRole: 'Supervisor', clientDemandId: primaryDemand.id, departmentId: createdDepts[9].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-18'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed - Vijaya Kumar c - 1st wave (CE).',
    },
    {
      name: 'Mani G', email: 'mani.g@c26plant.com', phone: '+91 94441 10018',
      appliedRole: 'Sr. Engineer', clientDemandId: primaryDemand.id, departmentId: createdDepts[9].dept.id,
      currentStage: 'Joined', joiningDate: new Date('2026-10-18'),
      onboardingProgress: 100, docVerification: true, bgvCheck: true, safetyInductionDone: true, workstationAssigned: true, mentorAssigned: true,
      notes: 'Appointed - Mani G - 1st wave (CE Sr. Engineer).',
    },
  ];

  for (const c of appointedCandidates) {
    await prisma.candidate.create({ data: c });
  }

  // 7. Seed Daily Work Logs from Actual Plant Floors
  const actualWorkLogs = [
    {
      departmentId: createdDepts[0].dept.id, // Assembly
      reportedById: createdDepts[0].head.id,
      shift: 'Day Shift',
      targetOutput: 4200,
      actualOutput: 4050,
      manpowerPresent: 12,
      manpowerRequired: 15,
      status: 'On Schedule',
      blockers: 'Tamil selvan & Manogar supervising conveyor line 1. Waiting for December unskilled operator ramp (80 operators).',
      notes: 'Assembly line running sample runs for C26 client verification.',
    },
    {
      departmentId: createdDepts[1].dept.id, // Cutting/Stitching C26
      reportedById: createdDepts[1].head.id,
      shift: 'Day Shift',
      targetOutput: 6500,
      actualOutput: 6420,
      manpowerPresent: 15,
      manpowerRequired: 18,
      status: 'On Schedule',
      blockers: 'Rajasekar and Sarath Kumar lead cutters active. Laser table #3 calibration complete.',
      notes: 'Jagan, Sathish, and Sathiyamoorthy managing bundle dispatch to printing.',
    },
    {
      departmentId: createdDepts[8].dept.id, // QC
      reportedById: createdDepts[8].head.id,
      shift: 'Day Shift',
      targetOutput: 5000,
      actualOutput: 4980,
      manpowerPresent: 12,
      manpowerRequired: 14,
      status: 'On Schedule',
      blockers: 'Dhinakaran T and Srinivasan V conducting bond strength tests in QC Lab.',
      notes: 'AQL 2.5 audit passed with 0.8% defect score.',
    },
    {
      departmentId: createdDepts[9].dept.id, // ME / CE
      reportedById: createdDepts[9].head.id,
      shift: 'Day Shift',
      targetOutput: 20,
      actualOutput: 20,
      manpowerPresent: 8,
      manpowerRequired: 8,
      status: 'Ahead',
      blockers: 'None. Venkatesan M and Mani G completed high-voltage wiring for IP Injection floor.',
      notes: 'Ready for machinery installation.',
    },
  ];

  for (const w of actualWorkLogs) {
    await prisma.dailyWorkLog.create({ data: w });
  }

  // 8. Directives matching the spreadsheet remarks
  await prisma.hrDirective.create({
    data: {
      authorId: hrUser.id,
      title: 'C26 Master Headcount Plan: 1st Wave Appointed Staff Announcement',
      content: '1st Wave appointments completed: Tamil selvan (Assembly Sr. Supervisor), Manogar, Mohan Raj, Thatchan murthy, Rajasekar, Sarath Kumar, Jagan, Sathish, Sathiyamoorthy, Santhana Krishnan, Abbas, Dhinakaran T, Srinivasan V, Venkatesan M, Vijaya Kumar C, Mani G. Welcome to C26 operations!',
      category: 'Recruitment Milestone',
      priority: 'Urgent',
    },
  });

  await prisma.hrDirective.create({
    data: {
      authorId: hrUser.id,
      title: 'Pending Johnny Date of Interview (DOI) for GAP Regional Executive Assistants',
      content: 'Candidates for Sr. Executive Assistant (3) and Executive Assistant (4) are in pipeline. Waiting for Johnny DOI Confirmation: 27.10.2026 (Johnny will confirm exact date later).',
      category: 'Recruitment Milestone',
      priority: 'High',
    },
  });

  await prisma.hrDirective.create({
    data: {
      authorId: hrUser.id,
      title: 'HOD Discussion Notice: MES & QC Supervisor Positions',
      content: 'Pending interviews for MES Manager, MES Executive Assistant, and QC Supervisor to be discussed with HOD (Riti & Tulip) before November rollout.',
      category: 'Policy Update',
      priority: 'Normal',
    },
  });

  // 9. Activity Logs
  await prisma.activityLog.create({
    data: {
      userId: hrUser.id,
      action: 'Integrated C26 Master Headcount Spreadsheet into platform (1,180+ planned positions across 12 departments)',
    },
  });
  await prisma.activityLog.create({
    data: {
      userId: createdDepts[0].head.id,
      action: 'Tamil selvan logged Assembly daily shift report (4,050 units completed)',
    },
  });

  console.log('Company C26 Master Plan data successfully seeded!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
