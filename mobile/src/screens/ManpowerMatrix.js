// Website: /manpower-plan — "C26 Master Headcount & Deployment Schedule"
import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Share } from 'react-native';
import {
  C, PageHeader, Card, SectionTitle, Kpi, KpiGrid, Badge, Btn, Field, Select, Sheet,
  BarChart, SearchBox, Loading, Empty, u,
} from '../ui';
import { useData } from '../useData';

export const STATUS_CONFIG = {
  appointed:   { label: 'Appointed (1st Wave)', tone: 'green' },
  pending_doi: { label: 'Pending Johnny DOI',   tone: 'amber' },
  sourcing:    { label: 'Sourcing in Progress', tone: 'red' },
  discussion:  { label: 'Discuss with HOD',     tone: 'purple' },
  planned:     { label: 'Planned Wave',         tone: 'slate' },
};

const MONTHS = ['sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may'];
const cap = s => s[0].toUpperCase() + s.slice(1);

export default function ManpowerMatrix({ api, refreshSignal, isHr }) {
  const { data, loading, error, reload, refreshControl } = useData(() => api('/manpower-plan'), [refreshSignal]);
  const [dept, setDept]       = useState('all');
  const [status, setStatus]   = useState('all');
  const [search, setSearch]   = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState(null);

  const rows = data?.rows || [];
  const allDepts = useMemo(() => Array.from(new Set(rows.map(r => r.dept))), [rows]);
  const filtered = useMemo(() => rows.filter(r => {
    if (dept !== 'all' && r.dept !== dept) return false;
    if (status !== 'all' && r.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![r.position, r.dept, r.remarks, r.appointedNames].some(v => (v || '').toLowerCase().includes(q))) return false;
    }
    return true;
  }), [rows, dept, status, search]);

  async function save() {
    setSaving(true); setErr(null);
    try {
      await api(`/manpower-plan/${editing.id}`, 'PUT', { status: editing.status, remarks: editing.remarks, appointedNames: editing.appointedNames });
      setEditing(null);
      reload();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  function exportCSV() {
    const header = 'Dept,Position,Total,Sep,Oct,Nov,Dec,Jan,Feb,Mar,Apr,May,Status,Remarks,Appointed';
    const lines = rows.map(r => `"${r.dept}","${r.position}",${r.plannedTotal},${MONTHS.map(m => r[m]).join(',')},"${r.status}","${r.remarks || ''}","${r.appointedNames || ''}"`);
    Share.share({ title: 'C26_Master_Manpower_Plan.csv', message: [header, ...lines].join('\n') }).catch(() => {});
  }

  if (loading && !data) return <Loading text="Loading C26 matrix..." />;

  const header = (
    <View>
      <PageHeader
        live eyebrow="Company C26 Master Plan" eyebrowColor={C.indigoText}
        title="C26 Master Headcount & Deployment Schedule"
        subtitle="Full ramp-up matrix: 1,157 planned positions across Assembly, Cutting, Printing, Stockfitting, IP Injection, QC, ME & GAP Admin."
        actions={<Btn small kind="ghost" icon="share-outline" title="Export Sheet (CSV)" onPress={exportCSV} />}
      />
      {error ? <Empty text={error} /> : null}
      <KpiGrid>
        <Kpi label="Total Planned Headcount" value={data?.totals?.plannedTotal ?? 0} suffix="positions" note="Across 87 role specifications" />
        <Kpi label="Appointed (1st Wave)" color={C.emerald} value={data?.appointedCount ?? 0} suffix="leaders" note="Tamil selvan, Rajasekar, Manogar, Mohan Raj, etc." />
        <Kpi label="Pending Johnny DOI" color={C.amber} value={data?.pendingDoiCount ?? 0} suffix="roles" note="GAP Regional Exec Assistants (Target: 27.10)" />
        <Kpi label="Active Sourcing Stage" color={C.red} value={data?.sourcingCount ?? 0} suffix="roles" note="ME Manager, QC Supervisor, QC Assistant" />
      </KpiGrid>

      <Card>
        <SectionTitle title="Monthly Deployment Schedule Ramp-Up" subtitle="Planned joinings per wave: Sep to May (Peak in March: 494 headcount validation)" />
        <Badge label="Validation Milestone: 1st Week of March" tone="indigo" style={{ marginBottom: 12 }} />
        <BarChart data={MONTHS.map(m => ({ label: cap(m), values: [data?.totals?.[m] || 0] }))} series={[{ name: 'Headcount Joining', color: C.indigo }]} height={130} />
      </Card>

      <SearchBox value={search} onChange={setSearch} placeholder="Search position or appointed name (e.g. Tamil, Rajasekar)..." />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Select label="Department" value={dept} onChange={setDept}
            options={[{ value: 'all', label: `All Departments (${allDepts.length})` }, ...allDepts.map(d => ({ value: d, label: d }))]} />
        </View>
        <View style={{ flex: 1 }}>
          <Select label="Status" value={status} onChange={setStatus}
            options={[{ value: 'all', label: 'All Statuses' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))]} />
        </View>
      </View>
      <Text style={[u.small, { marginBottom: 10 }]}>{filtered.length} rows matched</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={filtered}
        keyExtractor={r => String(r.id)}
        ListHeaderComponent={header}
        contentContainerStyle={u.screen}
        refreshControl={refreshControl}
        initialNumToRender={10}
        windowSize={7}
        ListEmptyComponent={<Empty text="No matching positions found." />}
        renderItem={({ item: r }) => {
          const conf = STATUS_CONFIG[r.status] || STATUS_CONFIG.planned;
          return (
            <Card tone={r.status === 'appointed' ? 'green' : r.status === 'pending_doi' ? 'amber' : undefined} style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: C.indigoText, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }} numberOfLines={2}>{r.dept}</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{r.position}</Text>
                </View>
                <View style={{ alignItems: 'center', backgroundColor: C.card2, borderRadius: 10, borderWidth: 1, borderColor: C.border2, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{r.plannedTotal}</Text>
                  <Text style={{ color: C.sub, fontSize: 9, fontWeight: '800' }}>TOTAL</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {MONTHS.filter(m => r[m] > 0).map(m => (
                  <Text key={m} style={{ color: m === 'mar' ? C.blue : '#e2e8f0', fontSize: 11, fontWeight: '800', backgroundColor: C.card2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: m === 'mar' ? '#3b82f655' : C.border2 }}>
                    {cap(m)}{m === 'mar' ? ' (Val)' : ''}: {r[m]}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
                <Badge label={conf.label} tone={conf.tone} />
                {r.appointedNames ? <Text style={{ color: '#6ee7b7', fontSize: 11, fontWeight: '700' }}>👤 {r.appointedNames}</Text> : null}
              </View>
              {r.remarks ? <Text style={{ color: C.sub, fontSize: 11, marginTop: 6 }}>{r.remarks}</Text> : null}
              {isHr && (
                <Btn small kind="ghost" icon="create-outline" title="Edit" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => { setErr(null); setEditing({ ...r }); }} />
              )}
            </Card>
          );
        }}
      />

      <Sheet
        visible={!!editing}
        title="Update Headcount Row"
        subtitle={editing ? `${editing.dept} — ${editing.position} (${editing.plannedTotal} Planned)` : ''}
        onClose={() => setEditing(null)}
        footer={<>
          <Btn kind="ghost" title="Cancel" onPress={() => setEditing(null)} style={{ flex: 1 }} />
          <Btn title="Save Row" onPress={save} loading={saving} style={{ flex: 1 }} />
        </>}
      >
        {editing && <>
          <Select label="Status" value={editing.status} onChange={v => setEditing(r => ({ ...r, status: v }))}
            options={[
              { value: 'appointed', label: 'Appointed (1st Wave)' },
              { value: 'pending_doi', label: 'Pending Johnny DOI' },
              { value: 'sourcing', label: 'Sourcing in Progress' },
              { value: 'discussion', label: 'To be discussed with HOD' },
              { value: 'planned', label: 'Planned' },
            ]} />
          <Field label="Appointed Candidate Name(s)" value={editing.appointedNames} onChange={v => setEditing(r => ({ ...r, appointedNames: v }))} placeholder="e.g. Tamil selvan, Manogar..." />
          <Field label="Remarks" multiline value={editing.remarks} onChange={v => setEditing(r => ({ ...r, remarks: v }))} placeholder="e.g. Need Johnny DOI OF Candidate- 27.10.2026..." />
          {err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>{err}</Text> : null}
        </>}
      </Sheet>
    </View>
  );
}
