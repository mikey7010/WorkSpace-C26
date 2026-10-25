import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Avatar } from '../../components/Layout';

export default function OnboardingTracker() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');

  function loadCandidates() {
    api.get('/recruitment/candidates')
      .then(res => setCandidates(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCandidates(); }, []);

  async function toggleCheck(candidateId, field, currentValue) {
    try {
      await api.patch(`/recruitment/candidates/${candidateId}/onboarding`, {
        [field]: !currentValue,
      });
      loadCandidates();
    } catch (err) {
      alert('Failed to update onboarding step');
    }
  }

  const onboardingList = candidates.filter(c => {
    if (filter === 'onboarding') return c.currentStage === 'Onboarding';
    if (filter === 'joined') return c.currentStage === 'Joined';
    return c.currentStage === 'Onboarding' || c.currentStage === 'Joined' || c.onboardingProgress > 0;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="p-7 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Factory Employee Onboarding Tracker</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            5-point compliance checklist for new engineers, supervisors, and floor operators before deploying to departments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Candidates
          </button>
          <button
            onClick={() => setFilter('onboarding')}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'onboarding' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            In-Progress
          </button>
          <button
            onClick={() => setFilter('joined')}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'joined' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            100% Completed
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {onboardingList.map(cand => {
          const isComplete = cand.onboardingProgress === 100;
          return (
            <div
              key={cand.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
            >
              {/* Top info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <Avatar name={cand.name} id={cand.id} size="w-11 h-11" textSize="text-sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white">{cand.name}</h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isComplete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {isComplete ? '✓ Fully Onboarded' : `${cand.onboardingProgress}% Onboarded`}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-400 font-semibold">
                      {cand.appliedRole} • {cand.department?.name || 'Department Allocation Pending'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {cand.clientDemand?.clientName ? `Client Contract: ${cand.clientDemand.clientName}` : 'Factory Direct'} • Joining Date:{' '}
                      <strong className="text-slate-300">
                        {cand.joiningDate ? new Date(cand.joiningDate).toLocaleDateString() : 'Pending'}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full sm:w-56">
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-400">Onboarding Health</span>
                    <span className={isComplete ? 'text-emerald-400' : 'text-indigo-400'}>{cand.onboardingProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${cand.onboardingProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 5-Step Interactive Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                {/* Step 1: Document Verification */}
                <button
                  type="button"
                  onClick={() => toggleCheck(cand.id, 'docVerification', cand.docVerification)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    cand.docVerification
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    cand.docVerification ? 'bg-emerald-500 text-white' : 'border border-slate-600 bg-slate-800'
                  }`}>
                    {cand.docVerification ? '✓' : ''}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-white">1. Doc Verification</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">ID, Education & Experience certs</p>
                  </div>
                </button>

                {/* Step 2: BGV */}
                <button
                  type="button"
                  onClick={() => toggleCheck(cand.id, 'bgvCheck', cand.bgvCheck)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    cand.bgvCheck
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    cand.bgvCheck ? 'bg-emerald-500 text-white' : 'border border-slate-600 bg-slate-800'
                  }`}>
                    {cand.bgvCheck ? '✓' : ''}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-white">2. Background Check</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Criminal & previous employer check</p>
                  </div>
                </button>

                {/* Step 3: Safety Induction */}
                <button
                  type="button"
                  onClick={() => toggleCheck(cand.id, 'safetyInductionDone', cand.safetyInductionDone)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    cand.safetyInductionDone
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    cand.safetyInductionDone ? 'bg-emerald-500 text-white' : 'border border-slate-600 bg-slate-800'
                  }`}>
                    {cand.safetyInductionDone ? '✓' : ''}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-white">3. Safety Induction</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">PPE kit, machine safety & fire drill</p>
                  </div>
                </button>

                {/* Step 4: Asset Allocation */}
                <button
                  type="button"
                  onClick={() => toggleCheck(cand.id, 'workstationAssigned', cand.workstationAssigned)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    cand.workstationAssigned
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    cand.workstationAssigned ? 'bg-emerald-500 text-white' : 'border border-slate-600 bg-slate-800'
                  }`}>
                    {cand.workstationAssigned ? '✓' : ''}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-white">4. Asset & Badge</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Floor badge, locker, CAD access</p>
                  </div>
                </button>

                {/* Step 5: Department Mentor */}
                <button
                  type="button"
                  onClick={() => toggleCheck(cand.id, 'mentorAssigned', cand.mentorAssigned)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    cand.mentorAssigned
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    cand.mentorAssigned ? 'bg-emerald-500 text-white' : 'border border-slate-600 bg-slate-800'
                  }`}>
                    {cand.mentorAssigned ? '✓' : ''}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-white">5. Mentor Assigned</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Paired with Department Head</p>
                  </div>
                </button>
              </div>
            </div>
          );
        })}

        {!onboardingList.length && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
            No candidates currently in onboarding. Advance candidates from the Recruitment Pipeline to begin onboarding!
          </div>
        )}
      </div>
    </div>
  );
}
