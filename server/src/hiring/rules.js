// Recruitment Management — business rules (single place, used by API, summary and export)
//
// COUNTING RULES (documented for HR):
//  • HR Selected     = candidates allocated to the requirement + planned month whose status is
//                      active, on_hold or joined.  Rejected / withdrawn candidates are NOT counted.
//  • Stage columns   = only ACTIVE candidates, by their current stage (Sourcing / Onboarding /
//                      Offer Issued / Joining Date).  Each candidate appears in exactly one column.
//  • On Hold         = on_hold candidates (still allocated, paused) — shown separately.
//  • Actually Joined = status "joined" (requires an actual joining date).
//  • Balance         = HOD requirement − Actually Joined   (never below 0)
//  • Pending allocation (remaining to recruit) = HOD requirement − HR Selected (never below 0)
//  • A candidate belongs to ONE planned month at a time. Moving the planned month keeps the
//    original month (originalMonth) and writes history — the person is never duplicated.
//  • HR cannot allocate more candidates than the HOD requirement for that month unless the
//    HR Head has approved an exception on that month (allowExceed).

const STAGES = ['sourcing', 'onboarding', 'offer_issued', 'joining'];
const STAGE_LABEL = { sourcing: 'Sourcing', onboarding: 'Onboarding', offer_issued: 'Offer Issued', joining: 'Joining Date' };
const STATUSES = ['active', 'on_hold', 'rejected', 'withdrawn', 'joined'];
const STATUS_LABEL = { active: 'Active', on_hold: 'On Hold', rejected: 'Rejected', withdrawn: 'Withdrawn', joined: 'Joined' };
const SELECTED_STATUSES = ['active', 'on_hold', 'joined'];
// date field recorded when a candidate enters a stage
const STAGE_DATE_FIELD = { sourcing: 'sourcingDate', onboarding: 'onboardingDate', offer_issued: 'offerIssuedDate', joining: 'expectedJoiningDate' };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = m => `${MONTH_NAMES[parseInt(m.slice(5), 10) - 1]} ${m.slice(0, 4)}`;

const isHr = u => !!u && (u.role === 'hr_admin' || u.role === 'admin');
const isHod = u => !!u && (u.role === 'dept_head' || u.role === 'supervisor');

function emptyCounts() {
  return { hod: 0, selected: 0, sourcing: 0, onboarding: 0, offer_issued: 0, joining: 0, on_hold: 0, joined: 0, rejected: 0, withdrawn: 0 };
}

// Add one candidate (status, stage, count) into a counts object
function addCandidate(c, status, stage, n = 1) {
  if (SELECTED_STATUSES.includes(status)) c.selected += n;
  if (status === 'active' && c[stage] !== undefined) c[stage] += n;
  else if (status === 'on_hold') c.on_hold += n;
  else if (status === 'joined') c.joined += n;
  else if (status === 'rejected') c.rejected += n;
  else if (status === 'withdrawn') c.withdrawn += n;
}

function finish(c) {
  c.balance = Math.max(0, c.hod - c.joined);
  c.pendingAllocation = Math.max(0, c.hod - c.selected);
  return c;
}

function sumInto(t, c) {
  for (const k of Object.keys(emptyCounts())) t[k] += c[k] || 0;
  return t;
}

// Excel department names → factory Department.code (decides which HOD may edit a requirement)
function guessDeptCode(dept) {
  const d = dept.toLowerCase();
  const rules = [
    [/^assembly/, 'ASSY'], [/^cutting/, 'CUT'], [/^auto cutting/, 'ACUT'], [/^printing|^hf|^no sew/, 'PRNT'],
    [/^embroidery/, 'EMB'], [/^stockfitting/, 'STCK'], [/^rb/, 'RB'], [/^ip/, 'IP'], [/^qc/, 'QC'], [/^mes/, 'QC'],
    [/^me$|^ce$|^tpm|^maintenance|^mold/, 'ENG'],
    [/sourcing|production planning|ie\/lean|^purchasing|non production purchasing|lean production|sole production/, 'SCM'],
    [/gap|rmw|fgw|admin|hr\/compliance|^it$|construction|customs|finance|rsc/, 'ADM'],
  ];
  const hit = rules.find(([re]) => re.test(d));
  return hit ? hit[1] : null;
}

module.exports = {
  STAGES, STAGE_LABEL, STATUSES, STATUS_LABEL, SELECTED_STATUSES, STAGE_DATE_FIELD, MONTH_RE,
  monthLabel, isHr, isHod, emptyCounts, addCandidate, finish, sumInto, guessDeptCode,
};
