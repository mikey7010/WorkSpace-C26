// Shared bits for Recruitment Management pages (Work Plan / Summary / Candidate Tracking)
import { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = m => (m ? `${MONTHS[parseInt(m.slice(5), 10) - 1]} ${m.slice(0, 4)}` : '');
export const shortMonth = m => (m ? `${MONTHS[parseInt(m.slice(5), 10) - 1]} '${m.slice(2, 4)}` : '');
export const fmtDate = d => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const isoDate = d => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const errMsg = e => e?.response?.data?.error || e?.message || 'Something went wrong';

export const STAGE_STYLE = {
  sourcing: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  onboarding: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  offer_issued: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  joining: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};
export const STATUS_STYLE = {
  active: 'bg-slate-700/60 text-slate-200 border-slate-600',
  on_hold: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
  withdrawn: 'bg-red-500/10 text-red-300/80 border-red-500/20',
  joined: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};
export const STAGE_LABEL = { sourcing: 'Sourcing', onboarding: 'Onboarding', offer_issued: 'Offer Issued', joining: 'Joining Date' };
export const STATUS_LABEL = { active: 'Active', on_hold: 'On Hold', rejected: 'Rejected', withdrawn: 'Withdrawn', joined: 'Joined' };

export function Pill({ className = '', children }) {
  return <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${className}`}>{children}</span>;
}

export function useMeta() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api.get('/hiring/meta').then(r => setMeta(r.data)).catch(e => setError(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);
  return { meta, error, reloadMeta: load };
}

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Recruitment Management</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Btn({ kind = 'primary', className = '', ...p }) {
  const k = kind === 'primary' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
    : kind === 'danger' ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
    : kind === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700';
  return <button {...p} className={`text-xs px-3.5 py-2 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${k} ${className}`} />;
}

export const inputCls = 'w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none';
export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-slate-900 border border-slate-700 rounded-3xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col shadow-2xl`}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto space-y-3">{children}</div>
        {footer && <div className="p-4 border-t border-slate-800 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// Confirmation dialog for important changes
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (message, { title = 'Please confirm', okText = 'Confirm', danger } = {}) =>
    new Promise(resolve => setState({ message, title, okText, danger, resolve }));
  const dialog = state && (
    <Modal title={state.title} onClose={() => { state.resolve(false); setState(null); }}
      footer={<>
        <Btn kind="ghost" onClick={() => { state.resolve(false); setState(null); }}>Cancel</Btn>
        <Btn kind={state.danger ? 'danger' : 'primary'} onClick={() => { state.resolve(true); setState(null); }}>{state.okText}</Btn>
      </>}>
      <p className="text-sm text-slate-300">{state.message}</p>
    </Modal>
  );
  return { confirm, dialog };
}

export function useToast() {
  const [t, setT] = useState(null);
  const show = (text, tone = 'ok') => { setT({ text, tone }); setTimeout(() => setT(null), 3500); };
  const node = t && (
    <div className={`fixed bottom-5 right-5 z-[60] text-xs font-semibold px-4 py-3 rounded-xl border shadow-xl ${t.tone === 'ok' ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40' : 'bg-red-950 text-red-200 border-red-500/40'}`}>
      {t.text}
    </div>
  );
  return { show, node };
}

// Filters bar — pass which filters to show
export function Filters({ meta, value, onChange, show = ['year', 'month', 'dept', 'position'] }) {
  if (!meta) return null;
  const set = k => e => onChange({ ...value, [k]: e.target.value });
  const months = meta.periods.filter(p => !value.year || String(p.year) === String(value.year));
  const sel = (k, label, opts) => (
    <select key={k} value={value[k] || ''} onChange={set(k)} className="bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-[220px]">
      <option value="">{label}</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
  const all = {
    year: () => sel('year', 'All years', meta.years.map(y => ({ value: y, label: y }))),
    month: () => sel('month', 'All months', months.map(p => ({ value: p.month, label: p.label }))),
    dept: () => sel('dept', 'All departments', meta.depts.map(d => ({ value: d, label: d }))),
    position: () => sel('position', 'All positions', meta.positions.map(d => ({ value: d, label: d }))),
    departmentId: () => meta.permissions.canManage && sel('departmentId', 'All HODs', meta.departments.map(d => ({ value: d.id, label: `${d.head?.name || 'No HOD'} — ${d.name}` }))),
    ownerId: () => sel('ownerId', 'All HR executives', meta.hrUsers.map(u => ({ value: u.id, label: u.name }))),
    stage: () => sel('stage', 'All stages', meta.stages),
    status: () => sel('status', 'All statuses', meta.statuses),
  };
  const active = Object.values(value).some(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-3">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filters</span>
      {show.map(k => all[k]?.())}
      {active && <button onClick={() => onChange({})} className="text-xs text-indigo-300 hover:text-white ml-1">Clear</button>}
    </div>
  );
}

export function toQuery(obj) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== null) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function downloadExport(type, filters) {
  const res = await api.get(`/hiring/export${toQuery({ ...filters, type })}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Recruitment_${type === 'work' ? 'Work_Plan' : 'Summary'}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function Loader() {
  return <div className="flex items-center justify-center py-24"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
}

export function ErrorBox({ text }) {
  return <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl p-4">{text}</div>;
}
