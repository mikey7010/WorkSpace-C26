// Mobile: Recruitment Management → Work / Recruitment Plan
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch } from 'react-native';
import { C, Card, PageHeader, Btn, Field, Select, Sheet, SearchBox, Badge, Loading, Empty, Notice, Row, Icon, u } from '../../ui';
import { useData } from '../../useData';
import { monthLabel, shortMonth, toQuery, useMeta, useConfirmBar, CountGrid, errorText, hint } from './common';

export default function WorkPlan({ api, refreshSignal, navigate }) {
  const { meta, error: metaErr, reloadMeta } = useMeta(api, refreshSignal);
  const [month, setMonth]   = useState('');
  const [dept, setDept]     = useState('');
  const [search, setSearch] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const { data, loading, error, reload, refreshControl } = useData(() => api(`/hiring/plan${toQuery({ month, dept })}`), [month, dept, refreshSignal]);
  const [cell, setCell]     = useState(null); // { row, month }
  const [reqRow, setReqRow] = useState(null);
  const [addMonth, setAddMonth] = useState(false);
  const [newReq, setNewReq] = useState(false);
  const [notice, setNotice] = useState(null);

  const flash = t => { setNotice(t); setTimeout(() => setNotice(null), 3000); };
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows || []).filter(r => !q || r.dept.toLowerCase().includes(q) || r.position.toLowerCase().includes(q));
  }, [data, search]);

  if ((loading && !data) || !meta) return metaErr ? <Empty text={metaErr} /> : <Loading text="Loading work plan..." />;
  const periods = data?.periods || [];
  const canManage = meta.permissions.canManage;

  const header = (
    <View>
      <PageHeader live eyebrow="Recruitment Management" eyebrowColor={C.indigoText} title="Work / Recruitment Plan"
        subtitle="HOD enters workers needed per month. HR = candidates selected, calculated from Candidate Tracking. Tap a month to update."
        actions={<>
          {canManage && <Btn small kind="ghost" icon="calendar-outline" title="Add Month" onPress={() => setAddMonth(true)} />}
          {meta.permissions.canEditRequirement && <Btn small kind="ghost" icon="add" title="New Requirement" onPress={() => setNewReq(true)} />}
        </>} />
      {notice && <Notice text={notice} />}
      {error ? <Empty text={error} /> : null}
      <SearchBox value={search} onChange={setSearch} placeholder="Search department or position..." />
      <Row>
        <Select label="Month" value={month} onChange={setMonth} options={[{ value: '', label: 'All months' }, ...meta.periods.map(p => ({ value: p.month, label: p.label }))]} />
        <Select label="Department" value={dept} onChange={setDept} options={[{ value: '', label: 'All departments' }, ...meta.depts.map(d => ({ value: d, label: d }))]} />
      </Row>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={u.small}>{rows.length} requirements · {periods.length} months</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={u.small}>Show empty months</Text>
          <Switch value={showEmpty} onValueChange={setShowEmpty} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={rows}
        keyExtractor={r => String(r.id)}
        ListHeaderComponent={header}
        contentContainerStyle={u.screen}
        refreshControl={refreshControl}
        initialNumToRender={8}
        windowSize={7}
        ListEmptyComponent={<Empty text="No requirements match." />}
        renderItem={({ item: r }) => {
          const visible = periods.filter(p => {
            const c = r.cells[p.month];
            return showEmpty || month || c.hodCount || c.counts.selected || c.remarks;
          });
          return (
            <Card style={{ padding: 14 }}>
              <TouchableOpacity onPress={() => setReqRow(r)} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: C.indigoText, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }} numberOfLines={2}>{r.dept}</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{r.position}</Text>
                </View>
                <View style={{ alignItems: 'center', backgroundColor: C.card2, borderRadius: 10, borderWidth: 1, borderColor: C.border2, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{r.totalNeed}</Text>
                  <Text style={{ color: C.sub, fontSize: 8.5, fontWeight: '800' }}>NEEDED</Text>
                </View>
              </TouchableOpacity>
              {visible.map(p => {
                const c = r.cells[p.month];
                const short = c.counts.selected < c.hodCount;
                return (
                  <TouchableOpacity key={p.month} onPress={() => setCell({ row: r, month: p.month })} activeOpacity={0.7}
                    style={{ backgroundColor: '#111c31', borderRadius: 12, padding: 10, marginTop: 8, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#e2e8f0', fontWeight: '800', fontSize: 13, flex: 1 }}>{p.label}</Text>
                      <View style={{ alignItems: 'center', minWidth: 38 }}><Text style={{ color: C.indigoText, fontSize: 9, fontWeight: '800' }}>HOD</Text><Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{c.hodCount}</Text></View>
                      <View style={{ alignItems: 'center', minWidth: 38 }}><Text style={{ color: C.emerald, fontSize: 9, fontWeight: '800' }}>HR</Text><Text style={{ color: short ? C.red : C.emerald, fontWeight: '900', fontSize: 15 }}>{c.counts.selected}{c.allowExceed ? '*' : ''}</Text></View>
                      <Icon name="chevron-forward" size={14} color={C.dim} />
                    </View>
                    {c.remarks ? <Text style={[u.small, { marginTop: 4 }]} numberOfLines={2}>{c.remarks}</Text> : null}
                  </TouchableOpacity>
                );
              })}
              {!visible.length && <Text style={[u.small, { marginTop: 8 }]}>No monthly numbers yet — turn on “Show empty months” to add.</Text>}
            </Card>
          );
        }}
      />

      {cell && <CellSheet api={api} meta={meta} row={cell.row} month={cell.month} onClose={() => setCell(null)}
        onSaved={t => { flash(t); reload(); }} onCandidates={() => { const c = cell; setCell(null); navigate('rm-candidates', { positionId: c.row.id, month: c.month, label: `${c.row.position} · ${monthLabel(c.month)}` }); }} />}
      {reqRow && <RequirementSheet api={api} meta={meta} row={reqRow} onClose={() => setReqRow(null)} onSaved={t => { flash(t); reload(); }} />}
      {addMonth && <AddMonthSheet api={api} meta={meta} onClose={() => setAddMonth(false)} onSaved={t => { flash(t); setAddMonth(false); reloadMeta(); reload(); }} />}
      {newReq && <NewRequirementSheet api={api} meta={meta} onClose={() => setNewReq(false)} onSaved={t => { flash(t); setNewReq(false); reloadMeta(); reload(); }} />}
    </View>
  );
}

function CellSheet({ api, meta, row, month, onClose, onSaved, onCandidates }) {
  const c = row.cells[month];
  const k = c.counts;
  const canEdit = meta.permissions.canEditRequirement && (meta.permissions.canManage || row.departmentId === meta.permissions.departmentId);
  const [hod, setHod] = useState(String(c.hodCount));
  const [remarks, setRemarks] = useState(c.remarks || '');
  const [allowExceed, setAllowExceed] = useState(c.allowExceed);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const { ask, bar } = useConfirmBar();

  async function doSave() {
    setSaving(true); setErr(null);
    try {
      const body = { hodCount: parseInt(hod, 10) || 0, remarks };
      if (meta.permissions.canManage) body.allowExceed = allowExceed;
      await api(`/hiring/positions/${row.id}/months/${month}`, 'PUT', body);
      onSaved('Saved'); onClose();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }
  function save() {
    const n = parseInt(hod, 10);
    if (Number.isNaN(n) || n < 0) { setErr('HOD requirement must be 0 or more.'); return; }
    if (n !== c.hodCount) ask(`Change HOD requirement from ${c.hodCount} to ${n}? It is recorded in the audit history.`, doSave);
    else doSave();
  }

  return (
    <Sheet visible title={`${row.position} — ${monthLabel(month)}`} subtitle={row.dept} onClose={onClose}
      footer={<>
        <Btn kind="ghost" title="Candidates →" onPress={onCandidates} style={{ flex: 1 }} />
        {canEdit && <Btn title="Save" onPress={save} loading={saving} style={{ flex: 1 }} />}
      </>}>
      <CountGrid items={[
        ['HOD need', k.hod, C.indigoText], ['HR selected', k.selected, C.emerald], ['Pending', k.pendingAllocation, k.pendingAllocation ? C.red : C.emerald],
        ['Sourcing', k.sourcing], ['Onboarding', k.onboarding], ['Offer Issued', k.offer_issued], ['Joining Date', k.joining], ['On Hold', k.on_hold, C.amber], ['Joined', k.joined, C.emerald],
      ]} />
      <View style={{ height: 12 }} />
      <Field label="HOD — workers needed this month" value={hod} onChange={setHod} keyboardType="number-pad" editable={canEdit} />
      <Field label="Remarks" value={remarks} onChange={setRemarks} multiline editable={canEdit} />
      {meta.permissions.canManage && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f59e0b0d', borderWidth: 1, borderColor: '#f59e0b33', borderRadius: 12, padding: 10 }}>
          <Switch value={allowExceed} onValueChange={setAllowExceed} />
          <Text style={{ color: '#e2e8f0', fontSize: 12, flex: 1 }}>Approve exception — HR may select more than the HOD requirement{c.exceedApprovedBy ? ` (approved by ${c.exceedApprovedBy})` : ''}</Text>
        </View>
      )}
      {!canEdit && hint('Only HR or this department’s HOD can change the requirement.')}
      {bar}
      {errorText(err)}
    </Sheet>
  );
}

function RequirementSheet({ api, meta, row, onClose, onSaved }) {
  const canEdit = meta.permissions.canEditRequirement && (meta.permissions.canManage || row.departmentId === meta.permissions.departmentId);
  const [total, setTotal] = useState(String(row.totalNeed));
  const [deptId, setDeptId] = useState(row.departmentId || '');
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);
  const { ask, bar } = useConfirmBar();
  useEffect(() => { api(`/hiring/audit?positionId=${row.id}`).then(setAudit).catch(() => setAudit([])); }, [row.id]);

  async function doSave() {
    try {
      const body = { totalNeed: parseInt(total, 10) || 0 };
      if (meta.permissions.canManage) body.departmentId = deptId ? Number(deptId) : null;
      await api(`/hiring/positions/${row.id}`, 'PUT', body);
      onSaved('Requirement updated'); onClose();
    } catch (e) { setErr(e.message); }
  }

  return (
    <Sheet visible title={row.position} subtitle={row.dept} onClose={onClose}
      footer={canEdit ? <Btn title="Save" onPress={() => (parseInt(total, 10) !== row.totalNeed ? ask(`Change total workers needed from ${row.totalNeed} to ${total}?`, doSave) : doSave())} style={{ flex: 1 }} /> : null}>
      <Field label="No. of workers needed (approved total)" value={total} onChange={setTotal} keyboardType="number-pad" editable={canEdit} />
      {meta.permissions.canManage && (
        <Select label="HOD department (who can edit)" value={deptId} onChange={setDeptId}
          options={[{ value: '', label: '— Not linked —' }, ...meta.departments.map(d => ({ value: d.id, label: `${d.name}${d.head ? ` (${d.head.name})` : ''}` }))]} />
      )}
      {bar}
      {errorText(err)}
      <Text style={[u.label, { marginTop: 8 }]}>Change history</Text>
      {audit === null ? hint('Loading…') : !audit.length ? hint('No changes yet.') : audit.map(a => (
        <View key={a.id} style={{ backgroundColor: C.card2, borderRadius: 10, padding: 8, marginBottom: 6 }}>
          <Text style={{ color: '#e2e8f0', fontSize: 12 }}>{a.month ? `${monthLabel(a.month)} · ` : ''}{a.field}: {a.oldValue || '—'} → <Text style={{ fontWeight: '800', color: '#fff' }}>{a.newValue || '—'}</Text></Text>
          <Text style={{ color: C.dim, fontSize: 10, marginTop: 2 }}>{new Date(a.createdAt).toLocaleString()} · {a.userName}</Text>
        </View>
      ))}
    </Sheet>
  );
}

function AddMonthSheet({ api, meta, onClose, onSaved }) {
  const last = meta.periods[meta.periods.length - 1]?.month;
  const next = last ? new Date(+last.slice(0, 4), +last.slice(5), 1) : new Date();
  const [year, setYear] = useState(String(next.getFullYear()));
  const [mon, setMon] = useState(next.getMonth() + 1);
  const [err, setErr] = useState(null);
  const key = `${year}-${String(mon).padStart(2, '0')}`;
  const exists = meta.periods.some(p => p.month === key);
  async function save() {
    try { await api('/hiring/periods', 'POST', { year: Number(year), month: Number(mon) }); onSaved(`${monthLabel(key)} added`); } catch (e) { setErr(e.message); }
  }
  return (
    <Sheet visible title="Add planning month" subtitle="Creates HOD / HR / Remarks for every requirement. Existing months are kept." onClose={onClose}
      footer={<Btn title={`Add ${monthLabel(key)}`} disabled={exists || !/^\d{4}$/.test(year)} onPress={save} style={{ flex: 1 }} />}>
      <Row>
        <Field label="Year" value={year} onChange={setYear} keyboardType="number-pad" />
        <Select label="Month" value={mon} onChange={setMon} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthLabel(`2000-${String(i + 1).padStart(2, '0')}`).slice(0, 3) }))} />
      </Row>
      {exists && <Text style={{ color: C.amber, fontSize: 12 }}>{monthLabel(key)} is already configured.</Text>}
      {hint(`Configured: ${meta.periods.map(p => shortMonth(p.month)).join(', ')}`)}
      {errorText(err)}
    </Sheet>
  );
}

function NewRequirementSheet({ api, meta, onClose, onSaved }) {
  const [f, setF] = useState({ dept: '', position: '', totalNeed: '1', departmentId: meta.permissions.departmentId || '' });
  const [err, setErr] = useState(null);
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  async function save() {
    if (!f.dept.trim() || !f.position.trim()) { setErr('Department and position are required.'); return; }
    try {
      await api('/hiring/positions', 'POST', { dept: f.dept.trim(), position: f.position.trim(), totalNeed: parseInt(f.totalNeed, 10) || 0, departmentId: f.departmentId ? Number(f.departmentId) : null });
      onSaved('Requirement created — set monthly HOD numbers');
    } catch (e) { setErr(e.message); }
  }
  return (
    <Sheet visible title="New recruitment requirement" onClose={onClose} footer={<Btn title="Create" onPress={save} style={{ flex: 1 }} />}>
      <Select label="Department (from plan)" value={f.dept} onChange={set('dept')} placeholder="Pick or type below" options={meta.depts.map(d => ({ value: d, label: d }))} />
      <Field label="…or type a new department" value={f.dept} onChange={set('dept')} />
      <Field label="Position" value={f.position} onChange={set('position')} placeholder="e.g. Line Leader" />
      <Field label="No. of workers needed" value={f.totalNeed} onChange={set('totalNeed')} keyboardType="number-pad" />
      {meta.permissions.canManage && (
        <Select label="HOD department" value={f.departmentId} onChange={set('departmentId')} options={[{ value: '', label: '— Not linked —' }, ...meta.departments.map(d => ({ value: d.id, label: d.name }))]} />
      )}
      {errorText(err)}
    </Sheet>
  );
}
