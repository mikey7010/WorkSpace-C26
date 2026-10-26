// Mobile: Recruitment Management → Summary (calculated from candidate records)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C, Screen, PageHeader, Card, Kpi, KpiGrid, Select, Row, Btn, Loading, Empty, Badge, u } from '../../ui';
import { useData } from '../../useData';
import { toQuery, useMeta, STAGE_LABEL } from './common';

const STAGE_COLS = [['sourcing', 'Sourcing', '#60a5fa'], ['onboarding', 'Onboarding', '#a78bfa'], ['offer_issued', 'Offer Issued', '#fbbf24'], ['joining', 'Joining Date', '#67e8f9'], ['on_hold', 'On Hold', '#fb923c'], ['joined', 'Joined', '#34d399']];

export default function Summary({ api, refreshSignal, navigate }) {
  const { meta, error: metaErr } = useMeta(api, refreshSignal);
  const [f, setF] = useState({ month: '', dept: '', ownerId: '', stage: '' });
  const [rules, setRules] = useState(false);
  const { data, loading, error, refreshControl } = useData(() => api(`/hiring/summary${toQuery(f)}`), [f.month, f.dept, f.ownerId, f.stage, refreshSignal]);
  const set = k => v => setF(x => ({ ...x, [k]: v }));

  if ((loading && !data) || !meta) return metaErr ? <Empty text={metaErr} /> : <Loading text="Loading summary..." />;
  const c = data?.cards || {};

  return (
    <Screen refreshControl={refreshControl}>
      <PageHeader live eyebrow="Recruitment Management" eyebrowColor={C.indigoText} title="Recruitment Summary"
        subtitle="Month-wise requirement vs. progress. Every number is calculated live from candidate records."
        actions={<Btn small kind="ghost" icon="information-circle-outline" title="Counting rules" onPress={() => setRules(r => !r)} />} />
      {rules && data && (
        <Card tone="indigo">{data.rules.map(r => <Text key={r} style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 4 }}>• {r}</Text>)}</Card>
      )}
      {error ? <Empty text={error} /> : null}
      <Row>
        <Select label="Month" value={f.month} onChange={set('month')} options={[{ value: '', label: 'All months' }, ...meta.periods.map(p => ({ value: p.month, label: p.label }))]} />
        <Select label="Department" value={f.dept} onChange={set('dept')} options={[{ value: '', label: 'All departments' }, ...meta.depts.map(d => ({ value: d, label: d }))]} />
      </Row>
      <Row>
        <Select label="HR executive" value={f.ownerId} onChange={set('ownerId')} options={[{ value: '', label: 'All' }, ...meta.hrUsers.map(x => ({ value: x.id, label: x.name }))]} />
        <Select label="Stage" value={f.stage} onChange={set('stage')} options={[{ value: '', label: 'All stages' }, ...meta.stages]} />
      </Row>

      <KpiGrid>
        <Kpi label="Total Workers Required" value={c.hod ?? 0} />
        <Kpi label="Total HR-Selected" value={c.selected ?? 0} color={C.emerald} />
        <Kpi label="Currently in Sourcing" value={c.sourcing ?? 0} color={C.blue} />
        <Kpi label="Currently in Onboarding" value={c.onboarding ?? 0} color={C.purple} />
        <Kpi label="Offers Issued" value={c.offer_issued ?? 0} color={C.amber} />
        <Kpi label="Actual Joined" value={c.joined ?? 0} color={C.emerald} />
        <Kpi label="Remaining Requirement" value={c.balance ?? 0} color={C.red} note={`Pending allocation: ${c.pendingAllocation ?? 0}`} />
        <Kpi label="At Joining Date" value={c.joining ?? 0} color={C.cyan} />
      </KpiGrid>

      {(data?.sections || []).map(sec => (
        <View key={sec.month} style={{ marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={u.h3}>{sec.label}</Text>
            <Text style={u.small}>HOD {sec.totals.hod} · HR {sec.totals.selected} · Joined {sec.totals.joined} · Balance {sec.totals.balance}</Text>
          </View>
          {sec.rows.map(r => {
            const k = r.counts;
            return (
              <Card key={r.positionId} style={{ padding: 13 }} onPress={() => navigate('rm-candidates', { positionId: r.positionId, month: sec.month, label: `${r.position} · ${sec.label}` })}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={{ color: C.indigoText, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' }} numberOfLines={1}>{r.dept}</Text>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{r.position}</Text>
                    <Text style={u.small}>{r.totalNeed} needed overall</Text>
                  </View>
                  {[['HOD', k.hod, C.indigoText], ['HR', k.selected, k.selected < k.hod ? C.red : C.emerald], ['Bal.', k.balance, C.red]].map(([l, v, col]) => (
                    <View key={l} style={{ alignItems: 'center', minWidth: 40 }}>
                      <Text style={{ color: col, fontSize: 9, fontWeight: '800' }}>{l}</Text>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{v}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {STAGE_COLS.map(([key, label, col]) => (
                    <Text key={key} style={{ fontSize: 10.5, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: k[key] ? col + '66' : C.border, color: k[key] ? col : C.dim }}>{label}: {k[key]}</Text>
                  ))}
                </View>
                {r.remarks ? <Text style={[u.small, { marginTop: 6 }]} numberOfLines={2}>{r.remarks}</Text> : null}
              </Card>
            );
          })}
          {!sec.rows.length && <Empty text="Nothing planned for this month." />}
        </View>
      ))}
    </Screen>
  );
}
