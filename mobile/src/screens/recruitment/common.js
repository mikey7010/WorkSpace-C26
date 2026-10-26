// Shared helpers for the mobile Recruitment Management screens
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C, Btn, Select, u } from '../../ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = m => (m ? `${MONTHS[parseInt(m.slice(5), 10) - 1]} ${m.slice(0, 4)}` : '');
export const shortMonth = m => (m ? `${MONTHS[parseInt(m.slice(5), 10) - 1]} '${m.slice(2, 4)}` : '');
export const isoDate = d => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const today = () => new Date().toISOString().slice(0, 10);

export const STAGES = ['sourcing', 'onboarding', 'offer_issued', 'joining'];
export const STAGE_LABEL = { sourcing: 'Sourcing', onboarding: 'Onboarding', offer_issued: 'Offer Issued', joining: 'Joining Date' };
export const STAGE_TONE = { sourcing: 'blue', onboarding: 'purple', offer_issued: 'amber', joining: 'cyan' };
export const STATUS_LABEL = { active: 'Active', on_hold: 'On Hold', rejected: 'Rejected', withdrawn: 'Withdrawn', joined: 'Joined' };
export const STATUS_TONE = { active: 'slate', on_hold: 'amber', rejected: 'red', withdrawn: 'red', joined: 'green' };

export function toQuery(obj) {
  const parts = Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function useMeta(api, refreshSignal) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api('/hiring/meta').then(setMeta).catch(e => setError(e.message)), [api]);
  useEffect(() => { load(); }, [load, refreshSignal]);
  return { meta, error, reloadMeta: load };
}

// Inline "are you sure?" bar — works on Android and web (Alert.alert does not render on web)
export function useConfirmBar() {
  const [pending, setPending] = useState(null);
  const ask = (text, onYes, danger) => setPending({ text, onYes, danger });
  const bar = pending ? (
    <View style={{ backgroundColor: pending.danger ? '#450a0a' : '#1e1b4b', borderWidth: 1, borderColor: pending.danger ? '#7f1d1d' : '#4338ca', borderRadius: 14, padding: 12, marginVertical: 10 }}>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 10 }}>{pending.text}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small kind="ghost" title="Cancel" onPress={() => setPending(null)} style={{ flex: 1 }} />
        <Btn small kind={pending.danger ? 'danger' : 'primary'} title="Confirm" onPress={() => { const f = pending.onYes; setPending(null); f(); }} style={{ flex: 1 }} />
      </View>
    </View>
  ) : null;
  return { ask, bar, clear: () => setPending(null) };
}

export function MonthFilter({ meta, value, onChange, allowAll = true }) {
  if (!meta) return null;
  return (
    <Select label="Month" value={value || ''} onChange={onChange}
      options={[...(allowAll ? [{ value: '', label: 'All months' }] : []), ...meta.periods.map(p => ({ value: p.month, label: p.label }))]} />
  );
}

export function CountGrid({ items }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(([label, value, color]) => (
        <View key={label} style={{ flexBasis: '30%', flexGrow: 1, backgroundColor: '#1e293b99', borderRadius: 12, padding: 10 }}>
          <Text style={{ color: C.sub, fontSize: 10.5 }}>{label}</Text>
          <Text style={{ color: color || '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 }}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export function SegTabs({ value, onChange, options }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
      {options.map(o => (
        <TouchableOpacity key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: value === o.value ? C.indigo6 : 'transparent' }}>
          <Text style={{ color: value === o.value ? '#fff' : C.sub, fontWeight: '800', fontSize: 12 }}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export const errorText = err => (err ? <Text style={{ color: C.red, fontSize: 12, fontWeight: '700', marginTop: 6 }}>{err}</Text> : null);
export const hint = t => <Text style={[u.small, { marginBottom: 8 }]}>{t}</Text>;
