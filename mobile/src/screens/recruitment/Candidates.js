// Mobile: Recruitment Management → Candidate Tracking
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { C, Card, PageHeader, Btn, Field, Select, Sheet, SearchBox, Badge, Loading, Empty, Notice, Row, u, fmtDate } from '../../ui';
import {
  monthLabel, toQuery, useMeta, useConfirmBar, errorText, hint, isoDate, today,
  STAGES, STAGE_LABEL, STAGE_TONE, STATUS_LABEL, STATUS_TONE,
} from './common';

export default function Candidates({ api, refreshSignal, params, navigate }) {
  const { meta, error: metaErr } = useMeta(api, refreshSignal);
  const [positionId, setPositionId] = useState(params?.positionId || '');
  const [scopeLabel, setScopeLabel] = useState(params?.label || '');
  const [month, setMonth]   = useState(params?.month || '');
  const [stage, setStage]   = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ]           = useState('');
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => { if (params) { setPositionId(params.positionId || ''); setMonth(params.month || ''); setScopeLabel(params.label || ''); } }, [params]);
  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]);

  const fetchPage = useCallback((p, append) => {
    setLoading(true);
    return api(`/hiring/candidates${toQuery({ positionId, month, stage, status, search: q, page: p, pageSize: 25 })}`)
      .then(d => { setItems(prev => (append ? [...prev, ...d.items] : d.items)); setTotal(d.total); setPage(p); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [api, positionId, month, stage, status, q]);

  useEffect(() => { fetchPage(1, false); }, [fetchPage, refreshSignal]);
  const flash = t => { setNotice(t); setTimeout(() => setNotice(null), 3000); };

  if (!meta) return metaErr ? <Empty text={metaErr} /> : <Loading text="Loading candidates..." />;
  const canManage = meta.permissions.canManage;

  const header = (
    <View>
      <PageHeader live eyebrow="Recruitment Management" eyebrowColor={C.indigoText} title="Candidate Tracking"
        subtitle="One record per person. Each candidate moves through Sourcing → Onboarding → Offer Issued → Joining Date on their own."
        actions={canManage ? <Btn icon="person-add-outline" title="Add Candidate" onPress={() => setAdding(true)} /> : null} />
      {notice && <Notice text={notice} />}
      {error ? <Empty text={error} /> : null}
      {positionId ? (
        <TouchableOpacity onPress={() => { setPositionId(''); setScopeLabel(''); }} style={{ alignSelf: 'flex-start', backgroundColor: '#6366f126', borderWidth: 1, borderColor: '#6366f155', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 }}>
          <Text style={{ color: C.indigoText, fontSize: 12, fontWeight: '700' }}>{scopeLabel || `Requirement #${positionId}`}  ✕</Text>
        </TouchableOpacity>
      ) : null}
      <SearchBox value={search} onChange={setSearch} placeholder={canManage ? 'Search name, ID (C-00012), dept, position...' : 'Search ID, dept, position...'} />
      <Row>
        <Select label="Month" value={month} onChange={setMonth} options={[{ value: '', label: 'All months' }, ...meta.periods.map(p => ({ value: p.month, label: p.label }))]} />
        <Select label="Stage" value={stage} onChange={setStage} options={[{ value: '', label: 'All stages' }, ...meta.stages]} />
        <Select label="Status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, ...meta.statuses]} />
      </Row>
      <Text style={[u.small, { marginBottom: 10 }]}>{total} candidates{!canManage ? ' · names visible to HR only' : ''}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={items}
        keyExtractor={c => String(c.id)}
        ListHeaderComponent={header}
        contentContainerStyle={u.screen}
        onRefresh={() => fetchPage(1, false)}
        refreshing={false}
        ListEmptyComponent={loading ? <ActivityIndicator color={C.indigo} style={{ marginTop: 30 }} /> : <Empty text="No candidates match." />}
        ListFooterComponent={items.length < total ? <Btn kind="ghost" title={loading ? 'Loading…' : `Load more (${total - items.length})`} onPress={() => fetchPage(page + 1, true)} /> : null}
        renderItem={({ item: c }) => (
          <Card style={{ padding: 13 }} onPress={() => setOpenId(c.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.dim, fontSize: 10.5, fontWeight: '700' }}>{c.code}</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{c.name}</Text>
                <Text style={u.small} numberOfLines={1}>{c.position.position} · <Text style={{ color: C.indigoText }}>{c.position.dept}</Text></Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={c.stageLabel} tone={STAGE_TONE[c.stage]} />
                <Badge label={c.statusLabel} tone={STATUS_TONE[c.status]} />
              </View>
            </View>
            <Text style={[u.small, { marginTop: 6 }]}>
              Planned {monthLabel(c.plannedMonth)}{c.originalMonth !== c.plannedMonth ? ` (from ${monthLabel(c.originalMonth)})` : ''}
              {c.actualJoiningDate ? ` · Joined ${fmtDate(c.actualJoiningDate)}` : c.expectedJoiningDate ? ` · Expected ${fmtDate(c.expectedJoiningDate)}` : ''}
              {c.owner ? ` · ${c.owner.name}` : ''}
            </Text>
          </Card>
        )}
      />
      {openId && <CandidateSheet api={api} meta={meta} id={openId} onClose={() => setOpenId(null)} onChanged={t => { flash(t); fetchPage(1, false); }} />}
      {adding && <AddCandidateSheet api={api} meta={meta} presetPosition={positionId} presetMonth={month} onClose={() => setAdding(false)} onSaved={t => { flash(t); setAdding(false); fetchPage(1, false); }} />}
    </View>
  );
}

function AddCandidateSheet({ api, meta, presetPosition, presetMonth, onClose, onSaved }) {
  const [plan, setPlan] = useState(null);
  const [f, setF] = useState({ dept: '', positionId: presetPosition || '', plannedMonth: presetMonth || '', name: '', phone: '', email: '', ownerId: '', stage: 'sourcing', sourcingDate: today(), sourceDetails: '', expectedJoiningDate: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  useEffect(() => { api('/hiring/plan').then(d => { setPlan(d); if (presetPosition) { const r = d.rows.find(x => String(x.id) === String(presetPosition)); if (r) setF(x => ({ ...x, dept: r.dept })); } }).catch(e => setErr(e.message)); }, []);
  const rows = plan?.rows || [];
  const depts = useMemo(() => [...new Set(rows.map(r => r.dept))], [rows]);
  const req = rows.find(r => String(r.id) === String(f.positionId));
  const cell = req && f.plannedMonth ? req.cells[f.plannedMonth] : null;

  async function save() {
    if (!f.positionId || !f.plannedMonth || !f.name.trim()) { setErr('Requirement, planned month and name are required.'); return; }
    setSaving(true); setErr(null);
    try {
      await api('/hiring/candidates', 'POST', {
        positionId: Number(f.positionId), plannedMonth: f.plannedMonth, name: f.name.trim(), phone: f.phone || null, email: f.email || null,
        ownerId: f.ownerId ? Number(f.ownerId) : null, stage: f.stage, sourcingDate: f.sourcingDate || null, sourceDetails: f.sourceDetails || null,
        expectedJoiningDate: f.expectedJoiningDate || null, remarks: f.remarks || null,
      });
      onSaved(`${f.name} added`);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Sheet visible title="Add candidate" subtitle="Allocates one person to a requirement and planned month." onClose={onClose}
      footer={<Btn title="Add candidate" onPress={save} loading={saving} style={{ flex: 1 }} />}>
      {!plan ? <ActivityIndicator color={C.indigo} /> : <>
        <Select label="Department" value={f.dept} onChange={v => setF(x => ({ ...x, dept: v, positionId: '' }))} options={depts.map(d => ({ value: d, label: d }))} />
        <Select label="Position (requirement) *" value={f.positionId} onChange={set('positionId')} placeholder={f.dept ? 'Select…' : 'Pick a department first'}
          options={rows.filter(r => r.dept === f.dept).map(r => ({ value: r.id, label: `${r.position} (needs ${r.totalNeed})` }))} />
        <Select label="Planned joining month *" value={f.plannedMonth} onChange={set('plannedMonth')} options={meta.periods.map(p => ({ value: p.month, label: p.label }))} />
        {cell && (
          <Text style={{ fontSize: 12, marginBottom: 10, color: cell.counts.selected >= cell.hodCount && !cell.allowExceed ? C.red : C.sub }}>
            {monthLabel(f.plannedMonth)}: HOD needs {cell.hodCount}, HR selected {cell.counts.selected}.
            {cell.counts.selected >= cell.hodCount && !cell.allowExceed ? ' Requirement is full — increase it or approve an exception first.' : ''}
          </Text>
        )}
        <Field label="Candidate name *" value={f.name} onChange={set('name')} />
        <Row>
          <Field label="Phone" value={f.phone} onChange={set('phone')} keyboardType="phone-pad" />
          <Field label="Email" value={f.email} onChange={set('email')} keyboardType="email-address" />
        </Row>
        <Row>
          <Select label="HR owner" value={f.ownerId} onChange={set('ownerId')} options={[{ value: '', label: '—' }, ...meta.hrUsers.map(x => ({ value: x.id, label: x.name }))]} />
          <Select label="Starting stage" value={f.stage} onChange={set('stage')} options={STAGES.map(s => ({ value: s, label: STAGE_LABEL[s] }))} />
        </Row>
        <Row>
          <Field label="Sourcing date" value={f.sourcingDate} onChange={set('sourcingDate')} placeholder="YYYY-MM-DD" />
          <Field label="Expected joining" value={f.expectedJoiningDate} onChange={set('expectedJoiningDate')} placeholder="YYYY-MM-DD" />
        </Row>
        <Field label="Source details" value={f.sourceDetails} onChange={set('sourceDetails')} placeholder="Referral, job portal, agency…" />
        <Field label="Remarks" value={f.remarks} onChange={set('remarks')} multiline />
      </>}
      {errorText(err)}
    </Sheet>
  );
}

function CandidateSheet({ api, meta, id, onClose, onChanged }) {
  const [c, setC] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [note, setNote] = useState('');
  const [stageDate, setStageDate] = useState(today());
  const [joinDate, setJoinDate] = useState(today());
  const [moveTo, setMoveTo] = useState('');
  const [edit, setEdit] = useState(null);
  const { ask, bar } = useConfirmBar();
  const canManage = meta.permissions.canManage;

  const load = useCallback(() => api(`/hiring/candidates/${id}`).then(d => { setC(d); setMoveTo(''); }).catch(e => setErr(e.message)), [api, id]);
  useEffect(() => { load(); }, [load]);

  async function act(fn, msg) {
    setBusy(true); setErr(null);
    try { await fn(); setNote(''); onChanged(msg); await load(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const toStage = s => ask(`Move to ${STAGE_LABEL[s]}?`, () => act(() => api(`/hiring/candidates/${id}/stage`, 'POST', { stage: s, date: stageDate || null, note: note || undefined }), `Stage → ${STAGE_LABEL[s]}`));
  const toStatus = s => ask(s === 'joined' ? `Mark as JOINED on ${joinDate}?` : `Change status to ${STATUS_LABEL[s]}?`,
    () => act(() => api(`/hiring/candidates/${id}/status`, 'POST', { status: s, actualJoiningDate: s === 'joined' ? joinDate : undefined, note: note || undefined }), `Status → ${STATUS_LABEL[s]}`),
    s === 'rejected' || s === 'withdrawn');
  const move = () => moveTo && ask(`Move planned month from ${monthLabel(c.plannedMonth)} to ${monthLabel(moveTo)}? Original month stays in history.`,
    () => act(() => api(`/hiring/candidates/${id}/move`, 'POST', { plannedMonth: moveTo, note: note || undefined }), 'Planned month changed'));
  const saveEdit = () => act(() => api(`/hiring/candidates/${id}`, 'PUT', {
    name: edit.name, phone: edit.phone || null, email: edit.email || null, ownerId: edit.ownerId ? Number(edit.ownerId) : null,
    sourceDetails: edit.sourceDetails || null, onboardingDate: edit.onboardingDate || null, onboardingProgress: parseInt(edit.onboardingProgress, 10) || 0,
    offerIssuedDate: edit.offerIssuedDate || null, offerStatus: edit.offerStatus || null, expectedJoiningDate: edit.expectedJoiningDate || null,
    ...(c.status === 'joined' ? { actualJoiningDate: edit.actualJoiningDate || null } : {}), remarks: edit.remarks || null,
  }).then(() => setEdit(null)), 'Details saved');
  const setE = k => v => setEdit(x => ({ ...x, [k]: v }));

  const histText = h => h.action === 'created' ? `Created at ${STAGE_LABEL[h.toValue] || h.toValue}`
    : h.action === 'stage' ? `Stage: ${STAGE_LABEL[h.fromValue]} → ${STAGE_LABEL[h.toValue]}`
    : h.action === 'status' ? `Status: ${STATUS_LABEL[h.fromValue]} → ${STATUS_LABEL[h.toValue]}`
    : h.action === 'planned_month' ? `Planned month: ${monthLabel(h.fromValue)} → ${monthLabel(h.toValue)}` : 'Details updated';

  return (
    <Sheet visible title={c ? c.name : 'Candidate'} subtitle={c ? `${c.code} · ${c.position.position} · ${c.position.dept}` : ''} onClose={onClose}>
      {!c ? <ActivityIndicator color={C.indigo} /> : <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <Badge label={c.stageLabel} tone={STAGE_TONE[c.stage]} />
          <Badge label={c.statusLabel} tone={STATUS_TONE[c.status]} />
          <Badge label={`Planned ${monthLabel(c.plannedMonth)}`} tone="slate" />
          {c.originalMonth !== c.plannedMonth && <Badge label={`Originally ${monthLabel(c.originalMonth)}`} tone="slate" />}
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
          {STAGES.map((s, i) => {
            const idx = STAGES.indexOf(c.stage);
            const done = i < idx || c.status === 'joined';
            const cur = i === idx && c.status !== 'joined';
            return (
              <View key={s} style={{ flex: 1 }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: done ? '#10b981' : cur ? C.indigo : C.border2 }} />
                <Text style={{ fontSize: 9.5, fontWeight: '700', marginTop: 3, color: cur ? C.indigoText : done ? C.emerald : C.dim }}>{STAGE_LABEL[s]}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[['Phone', c.phone], ['Email', c.email], ['HR owner', c.owner?.name], ['Source', c.sourceDetails], ['Sourcing', fmtDate(c.sourcingDate)], ['Onboarding', fmtDate(c.onboardingDate)],
            ['Onboarding %', `${c.onboardingProgress}%`], ['Offer issued', fmtDate(c.offerIssuedDate)], ['Offer status', c.offerStatus], ['Expected join', fmtDate(c.expectedJoiningDate)], ['Actual join', fmtDate(c.actualJoiningDate)], ['Created', fmtDate(c.createdAt)]]
            .map(([l, v]) => (
              <View key={l} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: '#1e293b99', borderRadius: 10, padding: 8 }}>
                <Text style={{ color: C.dim, fontSize: 10 }}>{l}</Text>
                <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{v || '—'}</Text>
              </View>
            ))}
        </View>
        {c.remarks ? <Text style={{ color: '#cbd5e1', fontSize: 12, marginTop: 10 }}>{c.remarks}</Text> : null}

        {canManage && !edit && (
          <View style={{ marginTop: 14, backgroundColor: '#1e293b4d', borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12 }}>
            <Text style={[u.h3, { fontSize: 13, marginBottom: 8 }]}>Update</Text>
            <Field label="Note for history (optional)" value={note} onChange={setNote} placeholder="Why is this changing?" />
            {c.status === 'active' && <>
              <Field label="Stage date" value={stageDate} onChange={setStageDate} placeholder="YYYY-MM-DD" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {STAGES.filter(s => s !== c.stage).map(s => <Btn key={s} small kind="ghost" title={`→ ${STAGE_LABEL[s]}`} disabled={busy} onPress={() => toStage(s)} />)}
              </View>
            </>}
            {c.status !== 'joined' && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}><Field label="Actual joining date" value={joinDate} onChange={setJoinDate} placeholder="YYYY-MM-DD" /></View>
                <Btn kind="success" title="Mark Joined" disabled={busy} onPress={() => toStatus('joined')} style={{ marginBottom: 12 }} />
              </View>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {c.status !== 'active' && <Btn small kind="ghost" title="Re-activate" disabled={busy} onPress={() => toStatus('active')} />}
              {c.status === 'active' && <Btn small kind="ghost" title="Put On Hold" disabled={busy} onPress={() => toStatus('on_hold')} />}
              {!['rejected', 'joined'].includes(c.status) && <Btn small kind="danger" title="Reject" disabled={busy} onPress={() => toStatus('rejected')} />}
              {!['withdrawn', 'joined'].includes(c.status) && <Btn small kind="danger" title="Withdrawn" disabled={busy} onPress={() => toStatus('withdrawn')} />}
            </View>
            {c.status !== 'joined' && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Select label="Change planned month" value={moveTo} onChange={setMoveTo} placeholder="Select month…" options={meta.periods.filter(p => p.month !== c.plannedMonth).map(p => ({ value: p.month, label: p.label }))} />
                </View>
                <Btn kind="ghost" title="Move" disabled={!moveTo || busy} onPress={move} style={{ marginBottom: 12 }} />
              </View>
            )}
            <Btn kind="ghost" icon="create-outline" title="Edit details & dates" onPress={() => setEdit({
              name: c.name, phone: c.phone || '', email: c.email || '', ownerId: c.ownerId || '', sourceDetails: c.sourceDetails || '',
              onboardingDate: isoDate(c.onboardingDate), onboardingProgress: String(c.onboardingProgress), offerIssuedDate: isoDate(c.offerIssuedDate), offerStatus: c.offerStatus || '',
              expectedJoiningDate: isoDate(c.expectedJoiningDate), actualJoiningDate: isoDate(c.actualJoiningDate), remarks: c.remarks || '',
            })} />
          </View>
        )}

        {edit && (
          <View style={{ marginTop: 14, backgroundColor: '#1e293b4d', borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12 }}>
            <Field label="Name" value={edit.name} onChange={setE('name')} />
            <Row><Field label="Phone" value={edit.phone} onChange={setE('phone')} /><Field label="Email" value={edit.email} onChange={setE('email')} /></Row>
            <Select label="HR owner" value={edit.ownerId} onChange={setE('ownerId')} options={[{ value: '', label: '—' }, ...meta.hrUsers.map(x => ({ value: x.id, label: x.name }))]} />
            <Field label="Source details" value={edit.sourceDetails} onChange={setE('sourceDetails')} />
            <Row><Field label="Onboarding date" value={edit.onboardingDate} onChange={setE('onboardingDate')} placeholder="YYYY-MM-DD" /><Field label="Onboarding %" value={edit.onboardingProgress} onChange={setE('onboardingProgress')} keyboardType="number-pad" /></Row>
            <Row><Field label="Offer issued date" value={edit.offerIssuedDate} onChange={setE('offerIssuedDate')} placeholder="YYYY-MM-DD" />
              <Select label="Offer status" value={edit.offerStatus} onChange={setE('offerStatus')} options={[{ value: '', label: '—' }, { value: 'pending', label: 'Pending' }, { value: 'accepted', label: 'Accepted' }, { value: 'declined', label: 'Declined' }]} /></Row>
            <Field label="Expected joining date" value={edit.expectedJoiningDate} onChange={setE('expectedJoiningDate')} placeholder="YYYY-MM-DD" />
            {c.status === 'joined' && <Field label="Actual joining date" value={edit.actualJoiningDate} onChange={setE('actualJoiningDate')} placeholder="YYYY-MM-DD" />}
            <Field label="Remarks" value={edit.remarks} onChange={setE('remarks')} multiline />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn kind="ghost" title="Cancel" onPress={() => setEdit(null)} style={{ flex: 1 }} />
              <Btn title="Save details" onPress={saveEdit} loading={busy} style={{ flex: 1 }} />
            </View>
          </View>
        )}
        {bar}
        {errorText(err)}

        <Text style={[u.label, { marginTop: 16 }]}>Stage & change history</Text>
        {c.history.map(h => (
          <View key={h.id} style={{ borderLeftWidth: 2, borderLeftColor: C.indigo, paddingLeft: 10, marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>{histText(h)}</Text>
            <Text style={{ color: C.dim, fontSize: 10.5 }}>{new Date(h.createdAt).toLocaleString()} · {h.userName || 'System'}</Text>
            {h.note ? <Text style={{ color: C.sub, fontSize: 11, fontStyle: 'italic' }}>“{h.note}”</Text> : null}
          </View>
        ))}
      </>}
    </Sheet>
  );
}
