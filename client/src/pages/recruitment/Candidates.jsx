// Recruitment Management → Candidate Tracking (one record per person, independent stage + history)
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import {
  PageTitle, Btn, Filters, Modal, Field, inputCls, Pill, useMeta, useToast, useConfirm, toQuery,
  monthLabel, fmtDate, isoDate, errMsg, Loader, ErrorBox, STAGE_STYLE, STATUS_STYLE, STAGE_LABEL, STATUS_LABEL,
} from './shared';

const STAGES = ['sourcing', 'onboarding', 'offer_issued', 'joining'];

export default function Candidates() {
  const [params, setParams] = useSearchParams();
  const { meta, error: metaErr } = useMeta();
  const [filters, setFilters] = useState(() => ({ month: params.get('month') || '' }));
  const [positionId, setPositionId] = useState(params.get('positionId') || '');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const { show, node } = useToast();
  const { confirm, dialog } = useConfirm();

  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [filters, positionId]);

  const load = useCallback(() => api.get(`/hiring/candidates${toQuery({ ...filters, positionId, search: q, page, pageSize: 25 })}`)
    .then(r => { setData(r.data); setErr(null); }).catch(e => setErr(errMsg(e))), [filters, positionId, q, page]);
  useEffect(() => { load(); }, [load]);

  if (metaErr) return <div className="p-7"><ErrorBox text={metaErr} /></div>;
  if (!meta) return <Loader />;
  const canManage = meta.permissions.canManage;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="p-7 space-y-5 max-w-[1600px] mx-auto">
      <PageTitle title="Candidate Tracking" subtitle="Each selected person has their own record, stage and history. Moving one candidate never changes another.">
        {canManage && <Btn onClick={() => setAdding(true)}>+ Add Candidate</Btn>}
      </PageTitle>

      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={canManage ? 'Search candidate name, ID (C-00012), department or position…' : 'Search ID, department or position…'}
          className="flex-1 min-w-[260px] bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        {positionId && <button onClick={() => { setPositionId(''); params.delete('positionId'); setParams(params); }} className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-xl px-3 py-2">Requirement #{positionId} ✕</button>}
      </div>
      <Filters meta={meta} value={filters} onChange={setFilters} show={['year', 'month', 'dept', 'position', 'departmentId', 'ownerId', 'stage', 'status']} />
      {err && <ErrorBox text={err} />}
      {!canManage && <p className="text-[11px] text-slate-500">Candidate names and contact details are visible to HR only.</p>}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 bg-slate-800/40">
                {['ID', 'Candidate', 'Department', 'Position', 'Planned Month', 'Stage', 'Status', 'HR Owner', 'Expected Join', 'Actual Join', 'Updated'].map(h => <th key={h} className="text-left px-3 py-2.5 font-bold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {!data ? <tr><td colSpan={11}><Loader /></td></tr> : data.items.map(c => (
                <tr key={c.id} onClick={() => setOpenId(c.id)} className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer">
                  <td className="px-3 py-2.5 text-slate-400 font-mono whitespace-nowrap">{c.code}</td>
                  <td className="px-3 py-2.5 text-white font-semibold">{c.name}</td>
                  <td className="px-3 py-2.5 text-indigo-300 max-w-[200px] truncate" title={c.position.dept}>{c.position.dept}</td>
                  <td className="px-3 py-2.5 text-slate-200">{c.position.position}</td>
                  <td className="px-3 py-2.5 text-slate-200 whitespace-nowrap">{monthLabel(c.plannedMonth)}{c.originalMonth !== c.plannedMonth && <span className="text-slate-500"> (from {monthLabel(c.originalMonth)})</span>}</td>
                  <td className="px-3 py-2.5"><Pill className={STAGE_STYLE[c.stage]}>{c.stageLabel}</Pill></td>
                  <td className="px-3 py-2.5"><Pill className={STATUS_STYLE[c.status]}>{c.statusLabel}</Pill></td>
                  <td className="px-3 py-2.5 text-slate-300">{c.owner?.name || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{fmtDate(c.expectedJoiningDate)}</td>
                  <td className="px-3 py-2.5 text-emerald-300 whitespace-nowrap">{fmtDate(c.actualJoiningDate)}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(c.updatedAt)}</td>
                </tr>
              ))}
              {data && !data.items.length && <tr><td colSpan={11} className="p-10 text-center text-slate-500">No candidates match. {canManage && 'Use “+ Add Candidate” to allocate someone to a requirement.'}</td></tr>}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
            <span>{data.total} candidates · page {data.page} of {pages}</span>
            <div className="flex gap-2">
              <Btn kind="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
              <Btn kind="ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</Btn>
            </div>
          </div>
        )}
      </div>

      {openId && <CandidateDrawer id={openId} meta={meta} onClose={() => setOpenId(null)} onChanged={msg => { show(msg); load(); }} onError={m => show(m, 'err')} confirm={confirm} />}
      {adding && <AddCandidate meta={meta} presetPosition={positionId} presetMonth={filters.month} onClose={() => setAdding(false)} onSaved={msg => { show(msg); setAdding(false); load(); }} onError={m => show(m, 'err')} />}
      {dialog}{node}
    </div>
  );
}

function AddCandidate({ meta, presetPosition, presetMonth, onClose, onSaved, onError }) {
  const [plan, setPlan] = useState(null);
  const [f, setF] = useState({ dept: '', positionId: presetPosition || '', plannedMonth: presetMonth || '', name: '', phone: '', email: '', ownerId: '', stage: 'sourcing', sourcingDate: isoDate(new Date()), sourceDetails: '', expectedJoiningDate: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  useEffect(() => { api.get('/hiring/plan').then(r => setPlan(r.data)).catch(e => onError(errMsg(e))); }, []);
  const rows = plan?.rows || [];
  useEffect(() => { if (presetPosition && rows.length) { const r = rows.find(x => String(x.id) === String(presetPosition)); if (r) setF(x => ({ ...x, dept: r.dept })); } }, [rows.length]);
  const depts = useMemo(() => [...new Set(rows.map(r => r.dept))], [rows]);
  const positions = rows.filter(r => !f.dept || r.dept === f.dept);
  const req = rows.find(r => String(r.id) === String(f.positionId));
  const cell = req && f.plannedMonth ? req.cells[f.plannedMonth] : null;

  async function save() {
    if (!f.positionId || !f.plannedMonth || !f.name.trim()) return onError('Requirement, planned month and name are required.');
    setSaving(true);
    try {
      await api.post('/hiring/candidates', {
        positionId: Number(f.positionId), plannedMonth: f.plannedMonth, name: f.name.trim(), phone: f.phone || null, email: f.email || null,
        ownerId: f.ownerId ? Number(f.ownerId) : null, stage: f.stage, sourcingDate: f.sourcingDate || null, sourceDetails: f.sourceDetails || null,
        expectedJoiningDate: f.expectedJoiningDate || null, remarks: f.remarks || null,
      });
      onSaved(`${f.name} added`);
    } catch (e) { onError(errMsg(e)); } finally { setSaving(false); }
  }

  return (
    <Modal wide title="Add candidate" subtitle="Allocates one person to a recruitment requirement and planned month." onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add candidate'}</Btn></>}>
      {!plan ? <Loader /> : <>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Department"><select value={f.dept} onChange={e => setF(x => ({ ...x, dept: e.target.value, positionId: '' }))} className={inputCls}><option value="">Select…</option>{depts.map(d => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Position (requirement) *"><select value={f.positionId} onChange={set('positionId')} className={inputCls}><option value="">Select…</option>{positions.map(r => <option key={r.id} value={r.id}>{r.position} (needs {r.totalNeed})</option>)}</select></Field>
          <Field label="Planned joining month *"><select value={f.plannedMonth} onChange={set('plannedMonth')} className={inputCls}><option value="">Select…</option>{meta.periods.map(p => <option key={p.month} value={p.month}>{p.label}</option>)}</select></Field>
        </div>
        {cell && (
          <p className={`text-xs rounded-xl px-3 py-2 border ${cell.counts.selected >= cell.hodCount && !cell.allowExceed ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-slate-800/60 border-slate-700 text-slate-300'}`}>
            {monthLabel(f.plannedMonth)}: HOD needs <b>{cell.hodCount}</b>, HR has selected <b>{cell.counts.selected}</b>.
            {cell.counts.selected >= cell.hodCount && !cell.allowExceed && ' Requirement is full — increase it or approve an exception in the Work Plan first.'}
          </p>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Candidate name *"><input value={f.name} onChange={set('name')} className={inputCls} /></Field>
          <Field label="Phone"><input value={f.phone} onChange={set('phone')} className={inputCls} /></Field>
          <Field label="Email"><input type="email" value={f.email} onChange={set('email')} className={inputCls} /></Field>
          <Field label="HR owner"><select value={f.ownerId} onChange={set('ownerId')} className={inputCls}><option value="">—</option>{meta.hrUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Starting stage"><select value={f.stage} onChange={set('stage')} className={inputCls}>{STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></Field>
          <Field label="Sourcing date"><input type="date" value={f.sourcingDate} onChange={set('sourcingDate')} className={inputCls} /></Field>
          <Field label="Source details"><input value={f.sourceDetails} onChange={set('sourceDetails')} placeholder="Referral, job portal, agency…" className={inputCls} /></Field>
          <Field label="Expected joining date"><input type="date" value={f.expectedJoiningDate} onChange={set('expectedJoiningDate')} className={inputCls} /></Field>
        </div>
        <Field label="Remarks"><textarea rows={2} value={f.remarks} onChange={set('remarks')} className={inputCls} /></Field>
      </>}
    </Modal>
  );
}

function CandidateDrawer({ id, meta, onClose, onChanged, onError, confirm }) {
  const [c, setC] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stageDate, setStageDate] = useState(isoDate(new Date()));
  const [joinDate, setJoinDate] = useState(isoDate(new Date()));
  const [moveTo, setMoveTo] = useState('');
  const [note, setNote] = useState('');
  const canManage = meta.permissions.canManage;

  const load = useCallback(() => api.get(`/hiring/candidates/${id}`).then(r => { setC(r.data); setMoveTo(''); }).catch(e => onError(errMsg(e))), [id]);
  useEffect(() => { load(); }, [load]);

  async function act(fn, msg) {
    setBusy(true);
    try { await fn(); setNote(''); onChanged(msg); await load(); } catch (e) { onError(errMsg(e)); } finally { setBusy(false); }
  }
  const setStage = async s => {
    if (!(await confirm(`Move ${c.name} from ${STAGE_LABEL[c.stage]} to ${STAGE_LABEL[s]}?`))) return;
    act(() => api.post(`/hiring/candidates/${id}/stage`, { stage: s, date: stageDate || null, note: note || undefined }), `Stage → ${STAGE_LABEL[s]}`);
  };
  const setStatus = async s => {
    const danger = s === 'rejected' || s === 'withdrawn';
    if (!(await confirm(s === 'joined' ? `Mark ${c.name} as JOINED on ${joinDate}?` : `Change status of ${c.name} to ${STATUS_LABEL[s]}?`, { danger, okText: STATUS_LABEL[s] }))) return;
    act(() => api.post(`/hiring/candidates/${id}/status`, { status: s, actualJoiningDate: s === 'joined' ? joinDate : undefined, note: note || undefined }), `Status → ${STATUS_LABEL[s]}`);
  };
  const move = async () => {
    if (!moveTo) return;
    if (!(await confirm(`Move ${c.name}'s planned joining month from ${monthLabel(c.plannedMonth)} to ${monthLabel(moveTo)}? The original month stays in history.`))) return;
    act(() => api.post(`/hiring/candidates/${id}/move`, { plannedMonth: moveTo, note: note || undefined }), 'Planned month changed');
  };
  const saveEdit = () => act(() => api.put(`/hiring/candidates/${id}`, {
    name: edit.name, phone: edit.phone || null, email: edit.email || null, ownerId: edit.ownerId ? Number(edit.ownerId) : null,
    sourcingDate: edit.sourcingDate || null, sourceDetails: edit.sourceDetails || null, onboardingDate: edit.onboardingDate || null,
    onboardingProgress: Number(edit.onboardingProgress) || 0, offerIssuedDate: edit.offerIssuedDate || null, offerStatus: edit.offerStatus || null,
    expectedJoiningDate: edit.expectedJoiningDate || null, ...(c.status === 'joined' ? { actualJoiningDate: edit.actualJoiningDate || null } : {}), remarks: edit.remarks || null,
  }).then(() => setEdit(null)), 'Details saved');

  const startEdit = () => setEdit({
    name: c.name, phone: c.phone || '', email: c.email || '', ownerId: c.ownerId || '', sourcingDate: isoDate(c.sourcingDate), sourceDetails: c.sourceDetails || '',
    onboardingDate: isoDate(c.onboardingDate), onboardingProgress: c.onboardingProgress, offerIssuedDate: isoDate(c.offerIssuedDate), offerStatus: c.offerStatus || '',
    expectedJoiningDate: isoDate(c.expectedJoiningDate), actualJoiningDate: isoDate(c.actualJoiningDate), remarks: c.remarks || '',
  });
  const setE = k => e => setEdit(x => ({ ...x, [k]: e.target.value }));
  const histText = h => {
    if (h.action === 'created') return `Created at ${STAGE_LABEL[h.toValue] || h.toValue}`;
    if (h.action === 'stage') return `Stage: ${STAGE_LABEL[h.fromValue]} → ${STAGE_LABEL[h.toValue]}`;
    if (h.action === 'status') return `Status: ${STATUS_LABEL[h.fromValue]} → ${STATUS_LABEL[h.toValue]}`;
    if (h.action === 'planned_month') return `Planned month: ${monthLabel(h.fromValue)} → ${monthLabel(h.toValue)}`;
    return 'Details updated';
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto">
        {!c ? <Loader /> : (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono text-slate-500">{c.code}</p>
                <h2 className="text-lg font-black text-white">{c.name}</h2>
                <p className="text-xs text-slate-400">{c.position.position} · <span className="text-indigo-300">{c.position.dept}</span></p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Pill className={STAGE_STYLE[c.stage]}>{c.stageLabel}</Pill>
                  <Pill className={STATUS_STYLE[c.status]}>{c.statusLabel}</Pill>
                  <Pill className="bg-slate-800 text-slate-300 border-slate-700">Planned {monthLabel(c.plannedMonth)}</Pill>
                  {c.originalMonth !== c.plannedMonth && <Pill className="bg-slate-800 text-slate-400 border-slate-700">Originally {monthLabel(c.originalMonth)}</Pill>}
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none" aria-label="Close">&times;</button>
            </div>

            {/* Stage stepper */}
            <div className="flex items-center gap-1">
              {STAGES.map((s, i) => {
                const idx = STAGES.indexOf(c.stage);
                const done = i < idx || c.status === 'joined';
                const cur = i === idx && c.status !== 'joined';
                return (
                  <div key={s} className="flex-1">
                    <div className={`h-1.5 rounded-full ${done ? 'bg-emerald-500' : cur ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                    <p className={`text-[10px] mt-1 font-semibold ${cur ? 'text-indigo-300' : done ? 'text-emerald-300' : 'text-slate-500'}`}>{STAGE_LABEL[s]}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[['Phone', c.phone], ['Email', c.email], ['HR owner', c.owner?.name], ['Source', c.sourceDetails], ['Sourcing date', fmtDate(c.sourcingDate)], ['Onboarding date', fmtDate(c.onboardingDate)],
                ['Onboarding progress', `${c.onboardingProgress}%`], ['Offer issued', fmtDate(c.offerIssuedDate)], ['Offer status', c.offerStatus], ['Expected joining', fmtDate(c.expectedJoiningDate)],
                ['Actual joining', fmtDate(c.actualJoiningDate)], ['Created', fmtDate(c.createdAt)]].map(([l, v]) => (
                <div key={l} className="bg-slate-800/50 rounded-xl px-3 py-2"><p className="text-[10px] text-slate-500">{l}</p><p className="text-slate-200 font-semibold truncate">{v || '—'}</p></div>
              ))}
            </div>
            {c.remarks && <p className="text-xs text-slate-300 bg-slate-800/40 rounded-xl p-3">{c.remarks}</p>}

            {canManage && !edit && (
              <div className="space-y-3 bg-slate-800/30 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-white">Update</h4>
                <Field label="Note for history (optional)"><input value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="Why is this changing?" /></Field>
                {c.status === 'active' && (
                  <div>
                    <div className="flex items-end gap-2 mb-2">
                      <Field label="Stage date"><input type="date" value={stageDate} onChange={e => setStageDate(e.target.value)} className={inputCls} /></Field>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STAGES.filter(s => s !== c.stage).map(s => <Btn key={s} kind="ghost" disabled={busy} onClick={() => setStage(s)}>→ {STAGE_LABEL[s]}</Btn>)}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2 pt-1">
                  {c.status !== 'joined' && (
                    <>
                      <Field label="Actual joining date"><input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className={inputCls} /></Field>
                      <Btn kind="success" disabled={busy} onClick={() => setStatus('joined')}>Mark Joined</Btn>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.status !== 'active' && <Btn kind="ghost" disabled={busy} onClick={() => setStatus('active')}>Re-activate</Btn>}
                  {c.status === 'active' && <Btn kind="ghost" disabled={busy} onClick={() => setStatus('on_hold')}>Put On Hold</Btn>}
                  {!['rejected', 'joined'].includes(c.status) && <Btn kind="danger" disabled={busy} onClick={() => setStatus('rejected')}>Reject</Btn>}
                  {!['withdrawn', 'joined'].includes(c.status) && <Btn kind="danger" disabled={busy} onClick={() => setStatus('withdrawn')}>Withdrawn</Btn>}
                </div>
                {c.status !== 'joined' && (
                  <div className="flex items-end gap-2 pt-1">
                    <Field label="Change planned joining month">
                      <select value={moveTo} onChange={e => setMoveTo(e.target.value)} className={inputCls}>
                        <option value="">Select month…</option>
                        {meta.periods.filter(p => p.month !== c.plannedMonth).map(p => <option key={p.month} value={p.month}>{p.label}</option>)}
                      </select>
                    </Field>
                    <Btn kind="ghost" disabled={!moveTo || busy} onClick={move}>Move</Btn>
                  </div>
                )}
                <Btn kind="ghost" onClick={startEdit}>Edit details & dates</Btn>
              </div>
            )}

            {edit && (
              <div className="space-y-3 bg-slate-800/30 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-white">Edit details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name"><input value={edit.name} onChange={setE('name')} className={inputCls} /></Field>
                  <Field label="HR owner"><select value={edit.ownerId} onChange={setE('ownerId')} className={inputCls}><option value="">—</option>{meta.hrUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
                  <Field label="Phone"><input value={edit.phone} onChange={setE('phone')} className={inputCls} /></Field>
                  <Field label="Email"><input value={edit.email} onChange={setE('email')} className={inputCls} /></Field>
                  <Field label="Sourcing date"><input type="date" value={edit.sourcingDate} onChange={setE('sourcingDate')} className={inputCls} /></Field>
                  <Field label="Source details"><input value={edit.sourceDetails} onChange={setE('sourceDetails')} className={inputCls} /></Field>
                  <Field label="Onboarding date"><input type="date" value={edit.onboardingDate} onChange={setE('onboardingDate')} className={inputCls} /></Field>
                  <Field label="Onboarding progress %"><input type="number" min="0" max="100" value={edit.onboardingProgress} onChange={setE('onboardingProgress')} className={inputCls} /></Field>
                  <Field label="Offer issued date"><input type="date" value={edit.offerIssuedDate} onChange={setE('offerIssuedDate')} className={inputCls} /></Field>
                  <Field label="Offer status"><select value={edit.offerStatus} onChange={setE('offerStatus')} className={inputCls}><option value="">—</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></Field>
                  <Field label="Expected joining date"><input type="date" value={edit.expectedJoiningDate} onChange={setE('expectedJoiningDate')} className={inputCls} /></Field>
                  {c.status === 'joined' && <Field label="Actual joining date"><input type="date" value={edit.actualJoiningDate} onChange={setE('actualJoiningDate')} className={inputCls} /></Field>}
                </div>
                <Field label="Remarks"><textarea rows={2} value={edit.remarks} onChange={setE('remarks')} className={inputCls} /></Field>
                <div className="flex gap-2 justify-end"><Btn kind="ghost" onClick={() => setEdit(null)}>Cancel</Btn><Btn onClick={saveEdit} disabled={busy}>Save details</Btn></div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-white mb-2">Stage & change history</h4>
              <ol className="relative border-l border-slate-700 ml-2 space-y-3">
                {c.history.map(h => (
                  <li key={h.id} className="ml-4">
                    <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-900" />
                    <p className="text-xs text-white font-semibold">{histText(h)}</p>
                    <p className="text-[10px] text-slate-500">{new Date(h.createdAt).toLocaleString()} · {h.userName || 'System'}</p>
                    {h.note && <p className="text-[11px] text-slate-400 italic">“{h.note}”</p>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
