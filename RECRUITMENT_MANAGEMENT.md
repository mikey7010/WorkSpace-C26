# Recruitment Management (Work Plan · Summary · Candidate Tracking)

Reference: **SMART MASTER.xlsx**. The Work Plan is based on sheet `招募總表+10%直工` (1st visible sheet) and the Summary on sheet `SUMMARY`.

## Where to find it
- **Website:** sidebar → *Recruitment Management* → Work / Recruitment Plan, Summary, Candidate Tracking (`/recruitment/plan`, `/recruitment/summary`, `/recruitment/candidates`)
- **Mobile app:** menu (☰) → *Recruitment Management* (HR bottom bar: Plan, Candidates; HOD bottom bar: Plan, Summary)

## Data model (Prisma / PostgreSQL)
| Table | Purpose |
|---|---|
| `HiringPosition` | Recruitment requirement: Department, Position, No. of workers needed, linked factory `departmentId` (decides which HOD may edit) |
| `HiringPeriod` | Configured planning months (the month columns). Unique per `YYYY-MM` |
| `HiringMonth` | HOD requirement + remarks for one requirement in one month; HR-Head exception flag. Unique per requirement + month |
| `HiringCandidate` | One row per person HR selects: requirement, planned month, original month, HR owner, stage, status, all dates |
| `HiringCandidateHistory` | Every stage / status / planned-month / detail change with user + time (never deleted) |
| `HiringAudit` | Audit of requirement, month and period changes (old → new, who, when) |

The old `hrCount / sourcing / onboarding / offerIssued / joined` columns on `HiringMonth` are kept only so no data is lost. They are **not** used any more: on first start they are converted into individual candidate records named *"Name pending (Excel import)"* (16 people from the Excel). HR should rename them.

## Counting rules
- **HR Selected** = candidates allocated to that requirement + planned month whose status is **Active, On Hold or Joined**. Rejected and Withdrawn are not counted.
- **Sourcing / Onboarding / Offer Issued / Joining Date** = only **Active** candidates by their current stage. Each person is in exactly one column, so the columns are a breakdown and are never added as extra people.
- **On Hold** is shown separately (still allocated, paused).
- **Actually Joined** = status Joined with an actual joining date (the date is mandatory).
- **Balance** (remaining requirement) = HOD requirement − Actually Joined (never below 0).
- **Pending allocation** (remaining to recruit) = HOD requirement − HR Selected (never below 0).
- A candidate is counted only in the month they are **currently planned** for. Moving the month keeps `originalMonth` and writes history, so nobody is counted twice.
- HR cannot select more candidates than the HOD requirement for a month unless the **HR Head approves an exception** on that month. A requirement cannot be lowered below the number already selected without that exception.

## Permissions (existing roles)
| Role | Can do |
|---|---|
| `hr_admin` / `admin` (HR) | Everything: months, requirements for any department, exceptions, candidates, stages, status, exports |
| `dept_head` / `supervisor` (HOD) | Requirements of **their own department** only: create requirement, set No. needed, HOD numbers and remarks per month; view progress and candidate stages. **Cannot** see candidate names/phone/email or change HR records |
| `member` | No access |

## Setup on an existing database
```powershell
cd server
npm install              # adds exceljs (Excel export)
npx prisma db push       # adds new tables/columns only — existing data is kept
npm run dev              # first request runs the one-time migration
```
Then push to GitHub so Render redeploys, and rebuild the APK for the mobile app.

## Remaining decisions for HR
- HOD changes apply immediately (with full audit history). A separate "pending approval" step for HOD changes is not built yet.
- Excel department names were linked to the 12 factory departments automatically (e.g. TPM, Mold Repair → Mechanical & Chemical Engineering; IT, Finance, Customs → Warehouse & GAP Administration). HR can change the link per requirement in the Work Plan.
