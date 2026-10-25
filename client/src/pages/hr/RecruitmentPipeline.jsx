import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Avatar } from '../../components/Layout';

const STAGES = ['Applied', 'Interview', 'Consultation', 'Offered', 'Onboarding', 'Joined'];

export default function RecruitmentPipeline() {
  const [demands, setDemands]         = useState([]);
  const [candidates, setCandidates]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDemand, setSelectedDemand] = useState('all');
  const [stageFilter, setStageFilter]       = useState('all');
  const [loading, setLoading]         = useState(true);

  // Modals
  const [showDemandModal, setShowDemandModal]       = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate]     = useState(null);

  // Demand Form
  const [demandForm, setDemandForm] = useState({
    clientName: '',
    jobProfile: '',
    requiredCount: 10,
    targetDeploymentDate: '2027-01-15',
    sourcingMonth: 'October',
    interviewMonth: 'November',
    consultationMonth: 'December',
    currentPhase: 'Sourcing (Oct)',
    departmentId: '',
    budgetPerRole: '',
    notes: '',
  });

  // Candidate Form
  const [candForm, setCandForm] = useState({
    name: '',
    email: '',
    phone: '',
    appliedRole: 'Production Engineer',
    clientDemandId: '',
    departmentId: '',
    expectedSalary: '',
    interviewDate: '',
    consultationDate: '',
    joiningDate: '',
    notes: '',
  });

  function fetchData() {
    Promise.all([
      api.get('/recruitment/demands'),
      api.get('/recruitment/candidates'),
      api.get('/departments'),
    ])
      .then(([d, c, depts]) => {
        setDemands(d.data);
        setCandidates(c.data);
        setDepartments(depts.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreateDemand(e) {
    e.preventDefault();
    try {
      await api.post('/recruitment/demands', {
        ...demandForm,
        requiredCount: parseInt(demandForm.requiredCount),
        departmentId: demandForm.departmentId ? parseInt(demandForm.departmentId) : null,
      });
      setShowDemandModal(false);
      setDemandForm({
        clientName: '', jobProfile: '', requiredCount: 10, targetDeploymentDate: '2027-01-15',
        sourcingMonth: 'October', interviewMonth: 'November', consultationMonth: 'December',
        currentPhase: 'Sourcing (Oct)', departmentId: '', budgetPerRole: '', notes: '',
      });
      fetchData();
    } catch (err) {
      alert('Failed to create client demand: ' + (err.response?.data?.error || err.message));
    }
  }

  async function handleCreateCandidate(e) {
    e.preventDefault();
    try {
      await api.post('/recruitment/candidates', {
        ...candForm,
        clientDemandId: candForm.clientDemandId ? parseInt(candForm.clientDemandId) : null,
        departmentId: candForm.departmentId ? parseInt(candForm.departmentId) : null,
      });
      setShowCandidateModal(false);
      setCandForm({
        name: '', email: '', phone: '', appliedRole: 'Production Engineer',
        clientDemandId: '', departmentId: '', expectedSalary: '', interviewDate: '',
        consultationDate: '', joiningDate: '', notes: '',
      });
      fetchData();
    } catch (err) {
      alert('Failed to add candidate');
    }
  }

  async function handleAdvanceStage(candidateId, newStage) {
    try {
      await api.patch(`/recruitment/candidates/${candidateId}/stage`, {
        currentStage: newStage,
      });
      fetchData();
    } catch (err) {
      alert('Failed to advance stage');
    }
  }

  async function handleUpdateCandidateDetails(e) {
    e.preventDefault();
    if (!editingCandidate) return;
    try {
      await api.patch(`/recruitment/candidates/${editingCandidate.id}/stage`, {
        currentStage: editingCandidate.currentStage,
        interviewDate: editingCandidate.interviewDate,
        consultationDate: editingCandidate.consultationDate,
        joiningDate: editingCandidate.joiningDate,
        offeredSalary: editingCandidate.offeredSalary,
        notes: editingCandidate.notes,
      });
      setEditingCandidate(null);
      fetchData();
    } catch (err) {
      alert('Failed to update candidate');
    }
  }

  const filteredCandidates = candidates.filter(c => {
    if (selectedDemand !== 'all' && c.clientDemandId !== parseInt(selectedDemand)) return false;
    if (stageFilter !== 'all' && c.currentStage !== stageFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="p-7 space-y-7 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Client Recruitment & Workforce Demands</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Client requirement timeline planning: Sourcing in October → Interviews in November → Consultation in December → Onboarding in January.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDemandModal(true)}
            className="text-xs px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            + New Client Demand
          </button>
          <button
            onClick={() => setShowCandidateModal(true)}
            className="text-xs px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold transition-all flex items-center gap-1.5"
          >
            + Add Candidate
          </button>
        </div>
      </div>

      {/* Client Demands Roadmap Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Client Hiring Demands & Timelines</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {demands.map(demand => {
            const candCount = demand.candidates?.length || 0;
            return (
              <div
                key={demand.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      Client Requirement
                    </span>
                    <h4 className="text-base font-extrabold text-white mt-1">{demand.clientName}</h4>
                    <p className="text-xs font-semibold text-indigo-400">{demand.jobProfile}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-white">{demand.requiredCount}</span>
                    <span className="text-[10px] text-slate-400 block">Openings</span>
                  </div>
                </div>

                {/* Timeline flow */}
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Target Deployment:</span>
                    <strong className="text-emerald-400">
                      {demand.targetDeploymentDate ? new Date(demand.targetDeploymentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2027'}
                    </strong>
                  </div>

                  {/* 4-Step Milestone Pills */}
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center pt-1">
                    <div className="bg-slate-700/60 p-1.5 rounded-lg border border-slate-600/40">
                      <span className="text-slate-400 block text-[9px]">Sourcing</span>
                      <strong className="text-white">{demand.sourcingMonth || 'Oct'}</strong>
                    </div>
                    <div className="bg-slate-700/60 p-1.5 rounded-lg border border-slate-600/40">
                      <span className="text-slate-400 block text-[9px]">Interview</span>
                      <strong className="text-white">{demand.interviewMonth || 'Nov'}</strong>
                    </div>
                    <div className="bg-slate-700/60 p-1.5 rounded-lg border border-slate-600/40">
                      <span className="text-slate-400 block text-[9px]">Consult</span>
                      <strong className="text-white">{demand.consultationMonth || 'Dec'}</strong>
                    </div>
                    <div className="bg-indigo-600/30 p-1.5 rounded-lg border border-indigo-500/40">
                      <span className="text-indigo-300 block text-[9px]">Join</span>
                      <strong className="text-indigo-200">Jan 2027</strong>
                    </div>
                  </div>
                </div>

                {demand.notes && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 italic">"{demand.notes}"</p>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Candidates in pipeline: <strong className="text-white">{candCount}</strong></span>
                  <button
                    onClick={() => { setSelectedDemand(demand.id.toString()); setStageFilter('all'); }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    View Pipeline →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate Pipeline Filters & Kanban */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-white">Candidates Recruiting Pipeline</h3>
            <p className="text-xs text-slate-400">Track candidates from initial sourcing to interview, consultation, and onboarding</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by demand */}
            <select
              value={selectedDemand}
              onChange={e => setSelectedDemand(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Client Demands</option>
              {demands.map(d => (
                <option key={d.id} value={d.id}>{d.clientName} - {d.jobProfile}</option>
              ))}
            </select>

            {/* Filter by stage */}
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Candidate Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map(c => {
            const nextStageIdx = STAGES.indexOf(c.currentStage);
            const nextStage = nextStageIdx >= 0 && nextStageIdx < STAGES.length - 1 ? STAGES[nextStageIdx + 1] : null;

            return (
              <div
                key={c.id}
                className="bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-4.5 space-y-3 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={c.name} id={c.id} size="w-8 h-8" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{c.name}</h4>
                        <p className="text-[11px] text-indigo-400 font-semibold truncate">{c.appliedRole}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 shrink-0">
                      {c.currentStage}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">{c.email} • {c.phone || 'No phone'}</p>
                  {c.clientDemand && (
                    <span className="inline-block mt-1 text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                      {c.clientDemand.clientName}
                    </span>
                  )}

                  {/* Dates if scheduled */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] space-y-1">
                    {c.interviewDate && (
                      <p className="text-slate-400 flex justify-between">
                        <span>Interview:</span>
                        <strong className="text-white">{new Date(c.interviewDate).toLocaleDateString()}</strong>
                      </p>
                    )}
                    {c.consultationDate && (
                      <p className="text-slate-400 flex justify-between">
                        <span>Consultation:</span>
                        <strong className="text-amber-400">{new Date(c.consultationDate).toLocaleDateString()}</strong>
                      </p>
                    )}
                    {c.joiningDate && (
                      <p className="text-slate-400 flex justify-between">
                        <span>Joining:</span>
                        <strong className="text-emerald-400">{new Date(c.joiningDate).toLocaleDateString()}</strong>
                      </p>
                    )}
                    {c.offeredSalary && (
                      <p className="text-slate-400 flex justify-between">
                        <span>Offer:</span>
                        <strong className="text-white">{c.offeredSalary}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setEditingCandidate(c)}
                    className="text-[11px] text-slate-400 hover:text-white font-semibold underline"
                  >
                    Edit Dates / Offer
                  </button>

                  {nextStage && (
                    <button
                      onClick={() => handleAdvanceStage(c.id, nextStage)}
                      className="text-[11px] px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-sm"
                    >
                      Advance to {nextStage} →
                    </button>
                  )}
                  {c.currentStage === 'Joined' && (
                    <span className="text-[10px] font-bold text-emerald-400">✓ Onboarded & Joined</span>
                  )}
                </div>
              </div>
            );
          })}
          {!filteredCandidates.length && (
            <p className="col-span-3 text-xs text-slate-500 text-center py-10">No candidates match this filter.</p>
          )}
        </div>
      </div>

      {/* New Client Demand Modal */}
      {showDemandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setShowDemandModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-white">Create Client Recruitment Demand</h3>
            <p className="text-xs text-slate-400">e.g. Client needs 10 engineers in January; schedule Sourcing in Oct, Interviews in Nov, Consultation in Dec.</p>

            <form onSubmit={handleCreateDemand} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Client Name *</label>
                <input required value={demandForm.clientName} onChange={e => setDemandForm(f=>({...f, clientName: e.target.value}))} placeholder="e.g. Nordic Apparel Corp" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Job Profile *</label>
                  <input required value={demandForm.jobProfile} onChange={e => setDemandForm(f=>({...f, jobProfile: e.target.value}))} placeholder="e.g. Production Engineers" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Required Count *</label>
                  <input type="number" min="1" required value={demandForm.requiredCount} onChange={e => setDemandForm(f=>({...f, requiredCount: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Deployment Date</label>
                  <input type="date" value={demandForm.targetDeploymentDate} onChange={e => setDemandForm(f=>({...f, targetDeploymentDate: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Department</label>
                  <select value={demandForm.departmentId} onChange={e => setDemandForm(f=>({...f, departmentId: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2">
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {/* 3-Month Plan */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <span className="font-bold text-indigo-400 text-[11px] block">Planned Hiring Schedule</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Sourcing Month</label>
                    <input value={demandForm.sourcingMonth} onChange={e => setDemandForm(f=>({...f, sourcingMonth: e.target.value}))} placeholder="October" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Interview Month</label>
                    <input value={demandForm.interviewMonth} onChange={e => setDemandForm(f=>({...f, interviewMonth: e.target.value}))} placeholder="November" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Consultation Month</label>
                    <input value={demandForm.consultationMonth} onChange={e => setDemandForm(f=>({...f, consultationMonth: e.target.value}))} placeholder="December" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes / Client Specifications</label>
                <textarea rows={2} value={demandForm.notes} onChange={e => setDemandForm(f=>({...f, notes: e.target.value}))} placeholder="Technical certifications, machine specs..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 resize-none" />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowDemandModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Create Demand</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setShowCandidateModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-white">Add Candidate to Pipeline</h3>
            <form onSubmit={handleCreateCandidate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
                  <input required value={candForm.name} onChange={e => setCandForm(f=>({...f, name: e.target.value}))} placeholder="Rohan Sharma" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email *</label>
                  <input type="email" required value={candForm.email} onChange={e => setCandForm(f=>({...f, email: e.target.value}))} placeholder="rohan@gmail.com" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone</label>
                  <input value={candForm.phone} onChange={e => setCandForm(f=>({...f, phone: e.target.value}))} placeholder="+91 98765 00000" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Applied Role *</label>
                  <input required value={candForm.appliedRole} onChange={e => setCandForm(f=>({...f, appliedRole: e.target.value}))} placeholder="Production Engineer" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Link to Client Demand</label>
                  <select value={candForm.clientDemandId} onChange={e => setCandForm(f=>({...f, clientDemandId: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2">
                    <option value="">Select Demand...</option>
                    {demands.map(d => <option key={d.id} value={d.id}>{d.clientName} ({d.jobProfile})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Interview Date</label>
                  <input type="date" value={candForm.interviewDate} onChange={e => setCandForm(f=>({...f, interviewDate: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Candidate Notes</label>
                <textarea rows={2} value={candForm.notes} onChange={e => setCandForm(f=>({...f, notes: e.target.value}))} placeholder="Experience, skills, evaluation..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 resize-none" />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowCandidateModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Add Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Candidate / Dates Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setEditingCandidate(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-white">Update {editingCandidate.name}</h3>
            <form onSubmit={handleUpdateCandidateDetails} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Hiring Stage</label>
                <select
                  value={editingCandidate.currentStage}
                  onChange={e => setEditingCandidate(c=>({...c, currentStage: e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                >
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Interview Date</label>
                  <input
                    type="date"
                    value={editingCandidate.interviewDate ? new Date(editingCandidate.interviewDate).toISOString().slice(0,10) : ''}
                    onChange={e => setEditingCandidate(c=>({...c, interviewDate: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Consultation Date</label>
                  <input
                    type="date"
                    value={editingCandidate.consultationDate ? new Date(editingCandidate.consultationDate).toISOString().slice(0,10) : ''}
                    onChange={e => setEditingCandidate(c=>({...c, consultationDate: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Joining / Deployment Date</label>
                  <input
                    type="date"
                    value={editingCandidate.joiningDate ? new Date(editingCandidate.joiningDate).toISOString().slice(0,10) : ''}
                    onChange={e => setEditingCandidate(c=>({...c, joiningDate: e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Offered Monthly Salary</label>
                  <input
                    value={editingCandidate.offeredSalary || ''}
                    onChange={e => setEditingCandidate(c=>({...c, offeredSalary: e.target.value}))}
                    placeholder="e.g. ₹65,000"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editingCandidate.notes || ''}
                  onChange={e => setEditingCandidate(c=>({...c, notes: e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditingCandidate(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
