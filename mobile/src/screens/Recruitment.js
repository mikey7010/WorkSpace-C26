// Website: /recruitment — "Client Recruitment & Workforce Demands"
import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  C, Screen, PageHeader, Card, SectionTitle, Badge, Btn, Field, Select, Sheet, Row, Avatar,
  Loading, Empty, fmtDate, toISODate, u,
} from '../ui';
import { useData } from '../useData';

export const STAGES = ['Applied', 'Interview', 'Consultation', 'Offered', 'Onboarding', 'Joined'];
const STAGE_TONE = { Applied: 'slate', Interview: 'blue', Consultation: 'purple', Offered: 'amber', Onboarding: 'cyan', Joined: 'green' };

const blankDemand = () => ({
  clientName: '', jobProfile: '', requiredCount: '10', targetDeploymentDate: '2027-01-15',
  sourcingMonth: 'October', interviewMonth: 'November', consultationMonth: 'December',
  currentPhase: 'Sourcing (Oct)', departmentId: '', budgetPerRole: '', notes: '',
});
const blankCand = () => ({
  name: '', email: '', phone: '', appliedRole: 'Production Engineer', clientDemandId: '', departmentId: '',
  expectedSalary: '', interviewDate: '', consultationDate: '', joiningDate: '', notes: '',
});

export default function Recruitment({ api, refreshSignal }) {
  const { data, loading, error, reload, refreshControl } = useData(
    () => Promise.all([api('/recruitment/demands'), api('/recruitment/candidates'), api('/departments')])
      .then(([demands, candidates, departments]) => ({ demands, candidates, departments })),
    [refreshSignal],
  );
  const [demandFilter, setDemandFilter] = useState('all');
  const [stageFilter, setStageFilter]   = useState('all');
  const [showDemand, setShowDemand]     = useState(false);
  const [showCand, setShowCand]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [demandForm, setDemandForm]     = useState(blankDemand());
  const [candForm, setCandForm]         = useState(blankCand());
  const [saving, setSaving]             = useState(false);
  const [err, setErr]                   = useState(null);

  if (loading && !data) return <Loading text="Loading recruitment..." />;
  const { demands = [], candidates = [], departments = [] } = data || {};

  const filtered = candidates.filter(c =>
    (demandFilter === 'all' || c.clientDemandId === demandFilter) && (stageFilter === 'all' || c.currentStage === stageFilter));

  async function run(fn, close) {
    setSaving(true); setErr(null);
    try { await fn(); close(); reload(); } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  const createDemand = () => run(() => api('/recruitment/demands', 'POST', {
    ...demandForm,
    requiredCount: parseInt(demandForm.requiredCount, 10) || 1,
    departmentId: demandForm.departmentId ? Number(demandForm.departmentId) : null,
  }), () => { setShowDemand(false); setDemandForm(blankDemand()); });

  const createCand = () => run(() => api('/recruitment/candidates', 'POST', {
    ...candForm,
    clientDemandId: candForm.clientDemandId ? Number(candForm.clientDemandId) : null,
    departmentId: candForm.departmentId ? Number(candForm.departmentId) : null,
    interviewDate: candForm.interviewDate || null,
  }), () => { setShowCand(false); setCandForm(blankCand()); });

  const advance = (c, stage) => api(`/recruitment/candidates/${c.id}/stage`, 'PATCH', { currentStage: stage }).then(reload).catch(e => setErr(e.message));

  const saveCand = () => run(() => api(`/recruitment/candidates/${editing.id}/stage`, 'PATCH', {
    currentStage: editing.currentStage,
    interviewDate: editing.interviewDate || undefined,
    consultationDate: editing.consultationDate || undefined,
    joiningDate: editing.joiningDate || undefined,
    offeredSalary: editing.offeredSalary,
    notes: editing.notes,
  }), () => setEditing(null));

  const setD = k => v => setDemandForm(f => ({ ...f, [k]: v }));
  const setC = k => v => setCandForm(f => ({ ...f, [k]: v }));
  const setE = k => v => setEditing(f => ({ ...f, [k]: v }));
  const deptOptions = departments.map(d => ({ value: d.id, label: d.name }));
  const errText = err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>{err}</Text> : null;

  return (
    <Screen refreshControl={refreshControl}>
      <PageHeader
        title="Client Recruitment & Workforce Demands"
        subtitle="Client requirement timeline planning: Sourcing in October → Interviews in November → Consultation in December → Onboarding in January."
        actions={<>
          <Btn icon="add" title="New Client Demand" onPress={() => { setErr(null); setShowDemand(true); }} />
          <Btn kind="ghost" icon="person-add-outline" title="Add Candidate" onPress={() => { setErr(null); setShowCand(true); }} />
        </>}
      />
      {error ? <Empty text={error} /> : null}

      <Text style={[u.h3, { marginBottom: 10 }]}>Active Client Hiring Demands & Timelines</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }} style={{ marginBottom: 14 }}>
        {demands.map(d => (
          <View key={d.id} style={[u.card, { width: 290, marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.indigoText, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Client Requirement</Text>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, marginTop: 2 }}>{d.clientName}</Text>
                <Text style={u.small}>{d.jobProfile}</Text>
              </View>
              <View style={{ alignItems: 'center', backgroundColor: '#f59e0b1a', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: C.amber, fontWeight: '900', fontSize: 20 }}>{d.requiredCount}</Text>
                <Text style={{ color: C.sub, fontSize: 9, fontWeight: '800' }}>Openings</Text>
              </View>
            </View>
            <Text style={[u.small, { marginTop: 10 }]}>Target Deployment: <Text style={{ color: '#fff', fontWeight: '800' }}>{d.targetDeploymentDate ? new Date(d.targetDeploymentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2027'}</Text></Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {[['Sourcing', d.sourcingMonth || 'Oct', C.blue], ['Interview', d.interviewMonth || 'Nov', C.purple], ['Consult', d.consultationMonth || 'Dec', C.amber], ['Join', 'Jan 2027', C.emerald]].map(([k, v, col]) => (
                <View key={k} style={{ flex: 1, backgroundColor: C.card2, borderRadius: 10, padding: 6, alignItems: 'center' }}>
                  <Text style={{ color: col, fontSize: 9, fontWeight: '800' }}>{k}</Text>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }} numberOfLines={1}>{v}</Text>
                </View>
              ))}
            </View>
            {d.notes ? <Text style={{ color: C.sub, fontSize: 11, fontStyle: 'italic', marginTop: 8 }} numberOfLines={2}>"{d.notes}"</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 }}>
              <Text style={u.small}>Candidates in pipeline: <Text style={{ color: '#fff', fontWeight: '800' }}>{d.candidates?.length || 0}</Text></Text>
              <Btn small kind="ghost" title="View Pipeline →" onPress={() => { setDemandFilter(d.id); setStageFilter('all'); }} />
            </View>
          </View>
        ))}
        {!demands.length && <Empty text="No client demands yet." />}
      </ScrollView>

      <SectionTitle title="Candidates Recruiting Pipeline" subtitle="Track candidates from initial sourcing to interview, consultation, and onboarding" />
      <Row>
        <Select label="Client Demand" value={demandFilter} onChange={setDemandFilter}
          options={[{ value: 'all', label: 'All Client Demands' }, ...demands.map(d => ({ value: d.id, label: `${d.clientName} - ${d.jobProfile}` }))]} />
        <Select label="Stage" value={stageFilter} onChange={setStageFilter}
          options={[{ value: 'all', label: 'All Stages' }, ...STAGES.map(s => ({ value: s, label: s }))]} />
      </Row>

      {filtered.map(c => {
        const idx = STAGES.indexOf(c.currentStage);
        const next = idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
        return (
          <Card key={c.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={c.name} id={c.id} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{c.name}</Text>
                <Text style={u.small}>{c.appliedRole}</Text>
              </View>
              <Badge label={c.currentStage} tone={STAGE_TONE[c.currentStage] || 'indigo'} />
            </View>
            <Text style={[u.small, { marginTop: 8 }]}>{c.email} • {c.phone || 'No phone'}</Text>
            {c.clientDemand ? <Badge label={c.clientDemand.clientName} tone="indigo" style={{ marginTop: 6 }} /> : null}
            <View style={{ marginTop: 6, gap: 2 }}>
              {c.interviewDate ? <Text style={u.small}>Interview: <Text style={{ color: '#fff', fontWeight: '700' }}>{fmtDate(c.interviewDate)}</Text></Text> : null}
              {c.consultationDate ? <Text style={u.small}>Consultation: <Text style={{ color: '#fff', fontWeight: '700' }}>{fmtDate(c.consultationDate)}</Text></Text> : null}
              {c.joiningDate ? <Text style={u.small}>Joining: <Text style={{ color: C.emerald, fontWeight: '700' }}>{fmtDate(c.joiningDate)}</Text></Text> : null}
              {c.offeredSalary ? <Text style={u.small}>Offer: <Text style={{ color: C.amber, fontWeight: '700' }}>{c.offeredSalary}</Text></Text> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <Btn small kind="ghost" title="Edit Dates / Offer" onPress={() => {
                setErr(null);
                setEditing({ ...c, interviewDate: toISODate(c.interviewDate), consultationDate: toISODate(c.consultationDate), joiningDate: toISODate(c.joiningDate) });
              }} />
              {next ? <Btn small title={`Advance to ${next} →`} onPress={() => advance(c, next)} /> : null}
              {c.currentStage === 'Joined' ? <Badge label="✓ Onboarded & Joined" tone="green" style={{ alignSelf: 'center' }} /> : null}
            </View>
          </Card>
        );
      })}
      {!filtered.length && <Empty text="No candidates match this filter." />}

      <Sheet visible={showDemand} title="Create Client Recruitment Demand" subtitle="e.g. Client needs 10 engineers in January; schedule Sourcing in Oct, Interviews in Nov, Consultation in Dec." onClose={() => setShowDemand(false)}
        footer={<><Btn kind="ghost" title="Cancel" onPress={() => setShowDemand(false)} style={{ flex: 1 }} /><Btn title="Create Demand" onPress={createDemand} loading={saving} style={{ flex: 1 }} /></>}>
        <Field label="Client Name *" value={demandForm.clientName} onChange={setD('clientName')} placeholder="e.g. Nordic Apparel Corp" />
        <Row>
          <Field label="Job Profile *" value={demandForm.jobProfile} onChange={setD('jobProfile')} placeholder="e.g. Production Engineers" />
          <Field label="Required Count *" value={demandForm.requiredCount} onChange={setD('requiredCount')} keyboardType="number-pad" />
        </Row>
        <Field label="Target Deployment Date (YYYY-MM-DD)" value={demandForm.targetDeploymentDate} onChange={setD('targetDeploymentDate')} placeholder="2027-01-15" />
        <Select label="Target Department" value={demandForm.departmentId} onChange={setD('departmentId')} placeholder="Select Department..." options={deptOptions} />
        <Text style={[u.label, { color: C.indigoText }]}>Planned Hiring Schedule</Text>
        <Row>
          <Field label="Sourcing" value={demandForm.sourcingMonth} onChange={setD('sourcingMonth')} placeholder="October" />
          <Field label="Interview" value={demandForm.interviewMonth} onChange={setD('interviewMonth')} placeholder="November" />
          <Field label="Consultation" value={demandForm.consultationMonth} onChange={setD('consultationMonth')} placeholder="December" />
        </Row>
        <Field label="Notes / Client Specifications" value={demandForm.notes} onChange={setD('notes')} multiline placeholder="Technical certifications, machine specs..." />
        {errText}
      </Sheet>

      <Sheet visible={showCand} title="Add Candidate to Pipeline" onClose={() => setShowCand(false)}
        footer={<><Btn kind="ghost" title="Cancel" onPress={() => setShowCand(false)} style={{ flex: 1 }} /><Btn title="Add Candidate" onPress={createCand} loading={saving} style={{ flex: 1 }} /></>}>
        <Field label="Full Name *" value={candForm.name} onChange={setC('name')} placeholder="Rohan Sharma" />
        <Field label="Email *" value={candForm.email} onChange={setC('email')} keyboardType="email-address" placeholder="rohan@gmail.com" />
        <Field label="Phone" value={candForm.phone} onChange={setC('phone')} keyboardType="phone-pad" placeholder="+91 98765 00000" />
        <Field label="Applied Role *" value={candForm.appliedRole} onChange={setC('appliedRole')} placeholder="Production Engineer" />
        <Select label="Link to Client Demand" value={candForm.clientDemandId} onChange={setC('clientDemandId')} placeholder="Select Demand..."
          options={demands.map(d => ({ value: d.id, label: `${d.clientName} (${d.jobProfile})` }))} />
        <Field label="Interview Date (YYYY-MM-DD)" value={candForm.interviewDate} onChange={setC('interviewDate')} placeholder="2026-11-05" />
        <Field label="Candidate Notes" value={candForm.notes} onChange={setC('notes')} multiline placeholder="Experience, skills, evaluation..." />
        {errText}
      </Sheet>

      <Sheet visible={!!editing} title={editing ? `Update ${editing.name}` : ''} onClose={() => setEditing(null)}
        footer={<><Btn kind="ghost" title="Cancel" onPress={() => setEditing(null)} style={{ flex: 1 }} /><Btn title="Save Details" onPress={saveCand} loading={saving} style={{ flex: 1 }} /></>}>
        {editing && <>
          <Select label="Hiring Stage" value={editing.currentStage} onChange={setE('currentStage')} options={STAGES.map(s => ({ value: s, label: s }))} />
          <Row>
            <Field label="Interview Date" value={editing.interviewDate} onChange={setE('interviewDate')} placeholder="YYYY-MM-DD" />
            <Field label="Consultation Date" value={editing.consultationDate} onChange={setE('consultationDate')} placeholder="YYYY-MM-DD" />
          </Row>
          <Row>
            <Field label="Joining / Deployment" value={editing.joiningDate} onChange={setE('joiningDate')} placeholder="YYYY-MM-DD" />
            <Field label="Offered Monthly Salary" value={editing.offeredSalary} onChange={setE('offeredSalary')} placeholder="e.g. ₹65,000" />
          </Row>
          <Field label="Notes" value={editing.notes} onChange={setE('notes')} multiline />
          {errText}
        </>}
      </Sheet>
    </Screen>
  );
}
