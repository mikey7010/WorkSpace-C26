// Website: /departments — "10 Factory Departments Hub"
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  C, Screen, PageHeader, Card, SectionTitle, Badge, Btn, Field, Sheet, Progress, Avatar,
  MiniStat, Loading, Empty, Icon, fmtDate, u,
} from '../ui';
import { useData } from '../useData';

export default function DepartmentsHub({ api, refreshSignal }) {
  const { data: depts, loading, error, reload, refreshControl } = useData(() => api('/departments'), [refreshSignal]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail]         = useState(null);
  const [showEdit, setShowEdit]     = useState(false);
  const [target, setTarget]         = useState('');
  const [desc, setDesc]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState(null);

  // Department list only carries the latest log; fetch full detail for recent logs
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    api(`/departments/${selectedId}`).then(setDetail).catch(() => setDetail(null));
  }, [selectedId, depts]);

  if (loading && !depts) return <Loading text="Loading departments..." />;

  const selected = depts?.find(d => d.id === selectedId);

  async function save() {
    setSaving(true); setErr(null);
    try {
      await api(`/departments/${selected.id}`, 'PUT', { targetManpower: parseInt(target, 10), description: desc });
      setShowEdit(false);
      reload();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  if (selected) {
    const sel = { ...selected, ...(detail || {}) };
    const gap = sel.targetManpower - sel.currentManpower;
    const latest = sel.workLogs?.[0];
    return (
      <Screen refreshControl={refreshControl}>
        <TouchableOpacity onPress={() => setSelectedId(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Icon name="arrow-back" size={16} color={C.indigoText} />
          <Text style={{ color: C.indigoText, fontWeight: '700', fontSize: 13 }}>All 10 Departments</Text>
        </TouchableOpacity>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ backgroundColor: '#6366f133', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text style={{ color: C.indigoText, fontWeight: '900', fontSize: 13 }}>{sel.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={u.h3}>{sel.name}</Text>
              <Text style={u.small}>{sel.description || 'Core production department'}</Text>
            </View>
          </View>
          <Btn small kind="ghost" icon="create-outline" title="Edit Targets" style={{ alignSelf: 'flex-start', marginTop: 12 }}
            onPress={() => { setTarget(String(sel.targetManpower)); setDesc(sel.description || ''); setErr(null); setShowEdit(true); }} />

          <View style={{ marginTop: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#1e293b80', borderRadius: 14, padding: 12 }}>
              <Text style={[u.small, { marginTop: 0, marginBottom: 8, fontWeight: '700' }]}>Department Head</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={sel.head?.name || ''} id={sel.head?.id} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{sel.head?.name || 'No Head'}</Text>
                  <Text style={{ color: C.indigoText, fontSize: 11 }}>{sel.head?.designation}</Text>
                  <Text style={{ color: C.sub, fontSize: 11 }}>{sel.head?.phone || sel.head?.email}</Text>
                </View>
              </View>
            </View>
            <View style={{ backgroundColor: '#1e293b80', borderRadius: 14, padding: 12 }}>
              <Text style={[u.small, { marginTop: 0, fontWeight: '700' }]}>Manpower Health</Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginVertical: 4 }}>{sel.currentManpower} <Text style={{ color: C.sub, fontSize: 13 }}>/ {sel.targetManpower}</Text></Text>
              <Progress value={sel.targetManpower ? (sel.currentManpower / sel.targetManpower) * 100 : 0} />
              <Text style={{ color: gap > 0 ? C.amber : C.emerald, fontSize: 11, marginTop: 6 }}>
                {gap > 0 ? `${gap} staff vacancies needing recruitment` : 'Full capacity reached'}
              </Text>
            </View>
            <View style={{ backgroundColor: '#1e293b80', borderRadius: 14, padding: 12 }}>
              <Text style={[u.small, { marginTop: 0, fontWeight: '700' }]}>Latest Shift Output</Text>
              <Text style={{ color: C.emerald, fontSize: 22, fontWeight: '900', marginVertical: 4 }}>{latest?.actualOutput || '—'} <Text style={{ color: C.sub, fontSize: 12 }}>/ {latest?.targetOutput || '—'} units</Text></Text>
              <Badge label={`Status: ${latest?.status || 'Active'}`} tone={latest?.status === 'Delayed' ? 'red' : 'green'} />
            </View>
          </View>
        </Card>

        <Card>
          <SectionTitle title={`Recent Shift Work Logs from ${sel.name}`} subtitle={`Updates submitted by ${sel.head?.name || 'the department head'} directly from factory floor`} />
          {(sel.workLogs || []).map(log => (
            <View key={log.id} style={{ backgroundColor: '#1e293b66', borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{log.shift} <Text style={{ color: C.sub, fontWeight: '500' }}>• {fmtDate(log.createdAt)}</Text></Text>
                <Badge label={log.status} tone={log.status === 'Delayed' ? 'red' : 'green'} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <MiniStat label="Target Output" value={`${log.targetOutput} units`} />
                <MiniStat label="Actual Output" value={`${log.actualOutput} units`} color={C.emerald} />
                <MiniStat label="Present Staff" value={`${log.manpowerPresent} workers`} />
                <MiniStat label="Efficiency" value={`${log.targetOutput ? Math.round((log.actualOutput / log.targetOutput) * 100) : 0}%`} color={C.indigoText} />
              </View>
              {log.blockers ? <Text style={{ color: '#fca5a5', fontSize: 12, marginTop: 8 }}><Text style={{ fontWeight: '800' }}>Blocker Reported: </Text>{log.blockers}</Text> : null}
              {log.notes ? <Text style={{ color: C.sub, fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>"{log.notes}"</Text> : null}
            </View>
          ))}
          {!sel.workLogs?.length && <Text style={u.small}>No shift work logs submitted yet today.</Text>}
        </Card>

        <Sheet visible={showEdit} title={`Edit ${sel.name} Target`} subtitle="Set the approved workforce requirement for this department." onClose={() => setShowEdit(false)}
          footer={<>
            <Btn kind="ghost" title="Cancel" onPress={() => setShowEdit(false)} style={{ flex: 1 }} />
            <Btn title="Save Changes" onPress={save} loading={saving} style={{ flex: 1 }} />
          </>}>
          <Field label="Approved Target Manpower" value={target} onChange={setTarget} keyboardType="number-pad" />
          <Field label="Department Description / Scope" value={desc} onChange={setDesc} multiline />
          {err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>{err}</Text> : null}
        </Sheet>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={refreshControl}>
      <PageHeader title="10 Factory Departments Hub" subtitle="Comprehensive operational monitoring, manpower allocation, and direct oversight for all 10 department heads." />
      {error ? <Empty text={error} /> : null}
      <Text style={[u.h3, { marginBottom: 10 }]}>All {depts?.length || 0} Departments</Text>
      {(depts || []).map(d => {
        const gap = d.targetManpower - d.currentManpower;
        return (
          <Card key={d.id} onPress={() => setSelectedId(d.id)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ backgroundColor: '#6366f133', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, minWidth: 48, alignItems: 'center' }}>
              <Text style={{ color: C.indigoText, fontWeight: '900', fontSize: 11 }}>{d.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{d.name}</Text>
              <Text style={{ color: C.sub, fontSize: 11 }} numberOfLines={1}>{d.head?.name || 'No Head'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{d.currentManpower}<Text style={{ color: C.sub, fontSize: 11 }}>/{d.targetManpower}</Text></Text>
              {gap > 0 && <Text style={{ color: C.amber, fontSize: 10, fontWeight: '700' }}>-{gap} vacancies</Text>}
            </View>
            <Icon name="chevron-forward" size={16} color={C.dim} />
          </Card>
        );
      })}
    </Screen>
  );
}
