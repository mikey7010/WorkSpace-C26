// Recruitment Management → Work / Recruitment Plan
// Columns: Department | Position | No. of Workers Needed | per month: HOD | HR | Remarks
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  PageTitle, Btn, Filters, Modal, Field, inputCls, useMeta, useToast, useConfirm, toQuery, downloadExport,
  monthLabel, shortMonth, errMsg, Loader, ErrorBox,
} from './shared';

export default function WorkPlan() {
  const navigate = useNavigate();
  const { meta, error: metaErr, reloadMeta } = useMeta();
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [cell, setCell] = useState(null);       // { row, month }
  const [reqEdit, setReqEdit] = useState(null); // row
  const [addMonth, setAddMonth] = useState(false);
  const [newReq, setNewReq] = useState(false);
  const { show, node: toast } = useToast();
  const { confirm, dialog } = useConfirm();

  const load = useCallback(() => {
    const { year, month, dept, position, departmentId } = filters;
    return api.get(`/hiring/plan${toQuery({ year, month, dept, position, departmentId })}`).then(r => { setData(r.data); setErr(null); }).catch(e => setErr(errMsg(e)));
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  if (metaErr) return <div className="p-7"><ErrorBox text={metaErr} /></div>;
  if (!meta || !data) return <Loader />;
  const canManage = meta.permissions.canManage;
  const periods = data.periods;

  return (
    <div className="p-7 space-y-5 max-w-[1600px] mx-auto">
      <PageTitle title="Work / Recruitment Plan" subtitle="HOD enters how many workers are needed each month. HR column = candidates selected (calculated from Candidate Tracking). Click any month cell to update it.">
        {canManage && <Btn kind="ghost" onClick={() => setAddMonth(true)}>+ Add Month</Btn>}
        {meta.permissions.canEditRequirement && <Btn kind="ghost" onClick={() => setNewReq(true)}>+ New Requirement</Btn>}
        <Btn onClick={() => downloadExport('work', filters).catch(e => show(errMsg(e), 'err'))}>Export Excel</Btn>
      </PageTitle>

      <Filters meta={meta} value={filters} onChange={setFilters} show={['year', 'month', 'dept', 'position', 'departmentId']} />
      {err && <ErrorBox text={err} />}

      <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
        <span><b className="text-indigo-300">HOD</b> = workers needed</span>
        <span><b className="text-emerald-300">HR</b> = candidates selected (Active + On Hold + Joined)</span>
        <span className="text-red-300">red = HR selected less than needed</span>
        <span>{data.rows.length} requirements · {periods.length} months</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="text-xs border-separate border-spacing-0 min-w-full">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-800">
                <th rowSpan={2} className="sticky left-0 z-30 bg-slate-800 text-left px-3 py-2 font-bold text-slate-300 min-w-[200px] border-b border-r border-slate-700">Department</th>
                <th rowSpan={2} className="sticky left-[200px] z-30 bg-slate-800 text-left px-3 py-2 font-bold text-slate-300 min-w-[170px] border-b border-r border-slate-700">Position</th>
                <th rowSpan={2} className="sticky left-[370px] z-30 bg-slate-800 text-center px-2 py-2 font-bold text-slate-300 min-w-[80px] border-b border-r border-slate-700">No. of Workers Needed</th>
                {periods.map(p => <th key={p.month} colSpan={3} className="text-center px-2 py-2 font-black text-white border-b border-r border-slate-700">{p.label}</th>)}
              </tr>
              <tr className="bg-slate-800/95">
                {periods.map(p => [
                  <th key={p.month + 'h'} className="px-2 py-1.5 text-indigo-300 font-bold border-b border-slate-700">HOD</th>,
                  <th key={p.month + 'r'} className="px-2 py-1.5 text-emerald-300 font-bold border-b border-slate-700">HR</th>,
                  <th key={p.month + 'm'} className="px-2 py-1.5 text-slate-400 font-bold border-b border-r border-slate-700 min-w-[160px]">Remarks</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/30">
                  <td className="sticky left-0 z-10 bg-slate-900 px-3 py-2 border-b border-r border-slate-800 text-indigo-300 font-semibold max-w-[200px]">
                    <button onClick={() => setReqEdit(r)} className="text-left hover:underline line-clamp-2" title={r.dept}>{r.dept}</button>
                  </td>
                  <td className="sticky left-[200px] z-10 bg-slate-900 px-3 py-2 border-b border-r border-slate-800 text-white font-semibold">{r.position}</td>
                  <td className="sticky left-[370px] z-10 bg-slate-900 px-2 py-2 border-b border-r border-slate-800 text-center font-black text-white">{r.totalNeed}</td>
                  {periods.map(p => {
                    const c = r.cells[p.month];
                    const short = c.counts.selected < c.hodCount;
                    const empty = !c.hodCount && !c.counts.selected && !c.remarks;
                    return [
                      <td key={p.month + 'h'} onClick={() => setCell({ row: r, month: p.month })} className="px-2 py-2 border-b border-slate-800 text-center cursor-pointer hover:bg-indigo-500/10 font-bold text-white">{c.hodCount || (empty ? '' : 0)}</td>,
                      <td key={p.month + 'r'} onClick={() => setCell({ row: r, month: p.month })} className={`px-2 py-2 border-b border-slate-800 text-center cursor-pointer hover:bg-indigo-500/10 font-bold ${short ? 'text-red-300' : 'text-emerald-300'}`}>
                        {empty ? '' : c.counts.selected}{c.allowExceed && <span title="Exception approved" className="ml-0.5 text-amber-300">*</span>}
                      </td>,
                      <td key={p.month + 'm'} onClick={() => setCell({ row: r, month: p.month })} className="px-2 py-2 border-b border-r border-slate-800 text-slate-400 cursor-pointer hover:bg-indigo-500/10 max-w-[220px]">
                        <span className="line-clamp-2" title={c.remarks || ''}>{c.remarks}</span>
                      </td>,
                    ];
                  })}
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={3 + periods.length * 3} className="p-10 text-center text-slate-500">No requirements match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {cell && <CellModal meta={meta} row={cell.row} month={cell.month} onClose={() => setCell(null)} confirm={confirm}
        onSaved={msg => { show(msg); load(); }} onError={m => show(m, 'err')}
        onCandidates={() => navigate(`/recruitment/candidates?positionId=${cell.row.id}&month=${cell.month}`)} />}
      {reqEdit && <RequirementModal meta={meta} row={reqEdit} onClose={() => setReqEdit(null)} confirm={confirm}
        onSaved={msg => { show(msg); load(); reloadMeta(); }} onError={m => show(m, 'err')} />}
      {addMonth && <AddMonthModal meta={meta} onClose={() => setAddMonth(false)} onSaved={msg => { show(msg); setAddMonth(false); reloadMeta(); load(); }} onError={m => show(m, 'err')} />}
      {newReq && <NewRequirementModal meta={meta} onClose={() => setNewReq(false)} onSaved={msg => { show(msg); setNewReq(false); reloadMeta(); load(); }} onError={m => show(m, 'err')} />}
      {dialog}{toast}
    </div>
  );
}

function CellModal({ meta, row, month, onClose, onSaved, onError, onCandidates, confirm }) {
  const c = row.cells[month];
  const canEdit = meta.permissions.canEditRequirement && (meta.permissions.canManage || row.departmentId === meta.permissions.departmentId);
  const [hod, setHod] = useState(String(c.hodCount));
  const [remarks, setRemarks] = useState(c.remarks || '');
  const [allowExceed, setAllowExceed] = useState(c.allowExceed);
  const [saving, setSaving] = useState(false);
  const k = c.counts;

  async function save() {
    const n = parseInt(hod, 10);
    if (Number.isNaN(n) || n < 0) return onError('HOD requirement must be 0 or more.');
    const body = { hodCount: n, remarks };
    if (meta.permissions.canManage) body.allowExceed = allowExceed;
    if (n !== c.hodCount && !(await confirm(`Change HOD requirement for ${row.position} (${monthLabel(month)}) from ${c.hodCount} to ${n}? This is recorded in the audit history.`))) return;
    if (allowExceed && !c.allowExceed && !(await confirm('Approve an exception so HR can select more candidates than the HOD requirement for this month?', { okText: 'Approve exception' }))) return;
    setSaving(true);
    try { await api.put(`/hiring/positions/${row.id}/months/${month}`, body); onSaved('Saved'); onClose(); }
    catch (e) { onError(errMsg(e)); } finally { setSaving(false); }
  }

  return (
    <Modal title={`${row.position} — ${monthLabel(month)}`} subtitle={row.dept} onClose={onClose}
      footer={<>
        <Btn kind="ghost" onClick={onCandidates}>View candidates →</Btn>
        {canEdit && <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>}
      </>}>
      <div className="grid grid-cols-3 gap-2">
        {[['HOD need', k.hod, 'text-indigo-300'], ['HR selected', k.selected, 'text-emerald-300'], ['Pending', k.pendingAllocation, k.pendingAllocation ? 'text-red-300' : 'text-emerald-300'],
          ['Sourcing', k.sourcing], ['Onboarding', k.onboarding], ['Offer Issued', k.offer_issued], ['Joining Date', k.joining], ['On Hold', k.on_hold], ['Joined', k.joined, 'text-emerald-300']].map(([l, v, cl]) => (
          <div key={l} className="bg-slate-800/60 rounded-xl p-2.5"><p className="text-[10px] text-slate-400">{l}</p><p className={`text-lg font-black ${cl || 'text-white'}`}>{v}</p></div>
        ))}
      </div>
      <Field label="HOD — workers needed this month">
        <input type="number" min="0" value={hod} onChange={e => setHod(e.target.value)} disabled={!canEdit} className={inputCls} />
      </Field>
      <Field label="Remarks">
        <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} disabled={!canEdit} className={inputCls} />
      </Field>
      {meta.permissions.canManage && (
        <label className="flex items-start gap-2 text-xs text-slate-300 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
          <input type="checkbox" checked={allowExceed} onChange={e => setAllowExceed(e.target.checked)} className="mt-0.5" />
          <span>Approve exception — allow HR to select more candidates than the HOD requirement {c.exceedApprovedBy && <span className="text-slate-500">(approved by {c.exceedApprovedBy})</span>}</span>
        </label>
      )}
      {!canEdit && <p className="text-[11px] text-slate-500">Only HR or this department's HOD can change the requirement.</p>}
    </Modal>
  );
}

function RequirementModal({ meta, row, onClose, onSaved, onError, confirm }) {
  const canEdit = meta.permissions.canEditRequirement && (meta.permissions.canManage || row.departmentId === meta.permissions.departmentId);
  const [total, setTotal] = useState(String(row.totalNeed));
  const [deptId, setDeptId] = useState(row.departmentId || '');
  const [audit, setAudit] = useState(null);
  useEffect(() => { api.get(`/hiring/audit?positionId=${row.id}`).then(r => setAudit(r.data)).catch(() => setAudit([])); }, [row.id]);

  async function save() {
    const n = parseInt(total, 10);
    if (Number.isNaN(n) || n < 0) return onError('Enter a valid number.');
    if (n !== row.totalNeed && !(await confirm(`Change total workers needed from ${row.totalNeed} to ${n}?`))) return;
    const body = { totalNeed: n };
    if (meta.permissions.canManage) body.departmentId = deptId ? Number(deptId) : null;
    try { await api.put(`/hiring/positions/${row.id}`, body); onSaved('Requirement updated'); onClose(); } catch (e) { onError(errMsg(e)); }
  }

  return (
    <Modal wide title={`${row.position}`} subtitle={row.dept} onClose={onClose} footer={canEdit && <Btn onClick={save}>Save</Btn>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="No. of workers needed (approved total)"><input type="number" min="0" value={total} onChange={e => setTotal(e.target.value)} disabled={!canEdit} className={inputCls} /></Field>
        <Field label="HOD department (who can edit)" hint="Links this requirement to a factory department head">
          <select value={deptId} onChange={e => setDeptId(e.target.value)} disabled={!meta.permissions.canManage} className={inputCls}>
            <option value="">— Not linked —</option>
            {meta.departments.map(d => <option key={d.id} value={d.id}>{d.name}{d.head ? ` (${d.head.name})` : ''}</option>)}
          </select>
        </Field>
      </div>
      <h4 className="text-xs font-bold text-white pt-2">Change history</h4>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {audit === null ? <p className="text-xs text-slate-500">Loading…</p> : audit.length === 0 ? <p className="text-xs text-slate-500">No changes yet.</p> : audit.map(a => (
          <div key={a.id} className="text-[11px] bg-slate-800/50 rounded-lg px-3 py-2 flex flex-wrap gap-x-2">
            <span className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
            <span className="text-indigo-300 font-semibold">{a.userName}</span>
            <span className="text-slate-300">{a.month ? `${monthLabel(a.month)} · ` : ''}{a.field}: <s className="text-slate-500">{a.oldValue || '—'}</s> → <b className="text-white">{a.newValue || '—'}</b></span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function AddMonthModal({ meta, onClose, onSaved, onError }) {
  const now = new Date();
  const last = meta.periods[meta.periods.length - 1]?.month;
  const next = last ? new Date(+last.slice(0, 4), +last.slice(5), 1) : now;
  const [year, setYear] = useState(next.getFullYear());
  const [month, setMonth] = useState(next.getMonth() + 1);
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const exists = meta.periods.some(p => p.month === key);
  async function save() {
    try { await api.post('/hiring/periods', { year: Number(year), month: Number(month) }); onSaved(`${monthLabel(key)} added`); } catch (e) { onError(errMsg(e)); }
  }
  return (
    <Modal title="Add planning month" subtitle="Creates HOD, HR and Remarks columns for every requirement. Existing months are kept." onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={exists}>Add {monthLabel(key)}</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Year"><input type="number" min="2020" max="2100" value={year} onChange={e => setYear(e.target.value)} className={inputCls} /></Field>
        <Field label="Month">
          <select value={month} onChange={e => setMonth(e.target.value)} className={inputCls}>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthLabel(`2000-${String(i + 1).padStart(2, '0')}`).slice(0, 3)}</option>)}
          </select>
        </Field>
      </div>
      {exists && <p className="text-xs text-amber-300">{monthLabel(key)} is already configured.</p>}
      <p className="text-[11px] text-slate-500">Configured: {meta.periods.map(p => shortMonth(p.month)).join(', ')}</p>
    </Modal>
  );
}

function NewRequirementModal({ meta, onClose, onSaved, onError }) {
  const isHr = meta.permissions.canManage;
  const [f, setF] = useState({ dept: '', position: '', totalNeed: '1', departmentId: meta.permissions.departmentId || '' });
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  async function save() {
    if (!f.dept.trim() || !f.position.trim()) return onError('Department and position are required.');
    try {
      await api.post('/hiring/positions', { dept: f.dept.trim(), position: f.position.trim(), totalNeed: parseInt(f.totalNeed, 10) || 0, departmentId: f.departmentId ? Number(f.departmentId) : null });
      onSaved('Requirement created — set the monthly HOD numbers in the plan');
    } catch (e) { onError(errMsg(e)); }
  }
  return (
    <Modal title="New recruitment requirement" onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save}>Create</Btn></>}>
      <Field label="Department (as in plan)">
        <input list="rm-depts" value={f.dept} onChange={set('dept')} className={inputCls} placeholder="e.g. Assembly" />
        <datalist id="rm-depts">{meta.depts.map(d => <option key={d} value={d} />)}</datalist>
      </Field>
      <Field label="Position">
        <input list="rm-pos" value={f.position} onChange={set('position')} className={inputCls} placeholder="e.g. Line Leader" />
        <datalist id="rm-pos">{meta.positions.map(d => <option key={d} value={d} />)}</datalist>
      </Field>
      <Field label="No. of workers needed"><input type="number" min="0" value={f.totalNeed} onChange={set('totalNeed')} className={inputCls} /></Field>
      {isHr && (
        <Field label="HOD department">
          <select value={f.departmentId} onChange={set('departmentId')} className={inputCls}>
            <option value="">— Not linked —</option>
            {meta.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      )}
    </Modal>
  );
}

