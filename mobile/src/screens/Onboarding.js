// Website: /onboarding — "Factory Employee Onboarding Tracker" (HR) / "New Recruits & Hires" (Dept Head)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C, Screen, PageHeader, Card, Badge, Chips, Progress, Avatar, Loading, Empty, Icon, fmtDate, u } from '../ui';
import { useData } from '../useData';

const STEPS = [
  { key: 'docVerification',     title: '1. Doc Verification',  desc: 'ID, Education & Experience certs' },
  { key: 'bgvCheck',            title: '2. Background Check',  desc: 'Criminal & previous employer check' },
  { key: 'safetyInductionDone', title: '3. Safety Induction',  desc: 'PPE kit, machine safety & fire drill' },
  { key: 'workstationAssigned', title: '4. Asset & Badge',     desc: 'Floor badge, locker, CAD access' },
  { key: 'mentorAssigned',      title: '5. Mentor Assigned',   desc: 'Paired with Department Head' },
];

export default function Onboarding({ api, isHr, refreshSignal }) {
  const { data, setData, loading, error, reload, refreshControl } = useData(() => api('/recruitment/candidates'), [refreshSignal]);
  const [filter, setFilter] = useState('all');
  const [err, setErr]       = useState(null);

  if (loading && !data) return <Loading text="Loading onboarding..." />;

  const list = (data || []).filter(c => {
    if (filter === 'onboarding') return c.currentStage === 'Onboarding';
    if (filter === 'joined') return c.currentStage === 'Joined';
    return c.currentStage === 'Onboarding' || c.currentStage === 'Joined' || c.onboardingProgress > 0;
  });

  async function toggle(c, key) {
    setErr(null);
    // optimistic update
    setData(prev => prev.map(x => (x.id === c.id ? { ...x, [key]: !c[key] } : x)));
    try {
      await api(`/recruitment/candidates/${c.id}/onboarding`, 'PATCH', { [key]: !c[key] });
      reload();
    } catch (e) {
      setErr('Failed to update onboarding step: ' + e.message);
      reload();
    }
  }

  return (
    <Screen refreshControl={refreshControl}>
      <PageHeader
        title={isHr ? 'Factory Employee Onboarding Tracker' : 'New Recruits & Hires'}
        subtitle="5-point compliance checklist for new engineers, supervisors, and floor operators before deploying to departments."
      />
      {error ? <Empty text={error} /> : null}
      {err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700', marginBottom: 10 }}>{err}</Text> : null}
      <Chips value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'All Candidates' }, { value: 'onboarding', label: 'In-Progress' }, { value: 'joined', label: '100% Completed' },
      ]} />

      {list.map(c => {
        const done = c.onboardingProgress === 100;
        return (
          <Card key={c.id} tone={done ? 'green' : undefined}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <Avatar name={c.name} id={c.id} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{c.name}</Text>
                <Badge label={done ? '✓ Fully Onboarded' : `${c.onboardingProgress}% Onboarded`} tone={done ? 'green' : 'cyan'} style={{ marginTop: 4 }} />
                <Text style={[u.small, { marginTop: 6 }]}>{c.appliedRole} • {c.department?.name || 'Department Allocation Pending'}</Text>
                <Text style={u.small}>
                  {c.clientDemand?.clientName ? `Client Contract: ${c.clientDemand.clientName}` : 'Factory Direct'} • Joining Date: <Text style={{ color: '#fff', fontWeight: '700' }}>{c.joiningDate ? fmtDate(c.joiningDate) : 'Pending'}</Text>
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={u.small}>Onboarding Health</Text>
                <Text style={{ color: done ? C.emerald : C.indigoText, fontWeight: '800', fontSize: 12 }}>{c.onboardingProgress}%</Text>
              </View>
              <Progress value={c.onboardingProgress} color={done ? '#10b981' : C.indigo} />
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              {STEPS.map(s => {
                const on = !!c[s.key];
                return (
                  <TouchableOpacity key={s.key} onPress={() => toggle(c, s.key)} activeOpacity={0.7}
                    style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: on ? '#10b9814d' : C.border, backgroundColor: on ? '#10b9811a' : '#1e293b66' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#10b981' : C.card2, borderWidth: on ? 0 : 1, borderColor: '#475569', marginTop: 1 }}>
                      {on && <Icon name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: on ? '#6ee7b7' : '#fff', fontWeight: '800', fontSize: 12.5 }}>{s.title}</Text>
                      <Text style={u.small}>{s.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        );
      })}
      {!list.length && <Empty text="No candidates currently in onboarding. Advance candidates from the Recruitment Pipeline to begin onboarding!" />}
    </Screen>
  );
}
