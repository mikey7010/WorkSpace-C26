// Hiring Tracker — Work + Summary
// Work:    Dept / Position / No. of workers needed, and per month: HOD need, HR selected, remarks.
// Summary: per month, how HR-selected people are split across
//          Sourcing → Onboarding → Offer issued → Joined (with joining date).
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from './api/config';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const STAGES = [
  { key: 'sourcing',    label: 'Sourcing',     color: '#60a5fa' },
  { key: 'onboarding',  label: 'Onboarding',   color: '#a78bfa' },
  { key: 'offerIssued', label: 'Offer issued', color: '#fbbf24' },
  { key: 'joined',      label: 'Joined',       color: '#34d399' },
];

export function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function shortMonth(key) {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const stageSum = m => STAGES.reduce((s, st) => s + (m[st.key] || 0), 0);

function Icon({ name, size = 16, color = '#fff' }) {
  return <Ionicons name={name} size={size} color={color} />;
}

// ======================================================================
export default function HiringTracker({ user, token, refreshSignal }) {
  const [mode, setMode]             = useState('work'); // work | summary
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [monthFilter, setMonth]     = useState('all');
  const [editing, setEditing]       = useState(null); // { position, entry }
  const [adding, setAdding]         = useState(null); // position

  const load = useCallback(() => {
    return apiRequest('/hiring', 'GET', null, token)
      .then(d => { setData(d); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [token]);

  useEffect(() => { load(); }, [load, refreshSignal]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const canEditHr = !!data?.canEditHr;
  const months = data?.months || [];

  // Summary needs a single month; pick current month if present, else first
  useEffect(() => {
    if (mode === 'summary' && monthFilter === 'all' && months.length) {
      const cur = currentMonthKey();
      setMonth(months.includes(cur) ? cur : months[0]);
    }
  }, [mode, months, monthFilter]);

  const filtered = useMemo(() => {
    const list = data?.positions || [];
    const q = search.trim().toLowerCase();
    return list.filter(p => {
      if (q && !p.dept.toLowerCase().includes(q) && !p.position.toLowerCase().includes(q) &&
          !p.months.some(m => (m.remarks || '').toLowerCase().includes(q))) return false;
      if (monthFilter !== 'all' && !p.months.some(m => m.month === monthFilter)) return false;
      return true;
    });
  }, [data, search, monthFilter]);

  async function saveEntry(entryId, body) {
    const updated = await apiRequest(`/hiring/months/${entryId}`, 'PUT', body, token);
    setData(prev => prev && ({
      ...prev,
      positions: prev.positions.map(p => p.id !== updated.positionId ? p : {
        ...p, months: p.months.map(m => (m.id === updated.id ? updated : m)),
      }),
    }));
    load(); // refresh totals
  }

  async function addMonth(positionId, body) {
    await apiRequest(`/hiring/positions/${positionId}/months`, 'POST', body, token);
    await load();
  }

  async function removeMonth(entryId) {
    await apiRequest(`/hiring/months/${entryId}`, 'DELETE', null, token);
    await load();
  }

  if (loading && !data) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={s.muted}>Loading hiring tracker...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={s.center}>
        <Icon name="cloud-offline-outline" size={30} color="#f87171" />
        <Text style={[s.muted, { textAlign: 'center', marginHorizontal: 24 }]}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const monthTotals = monthFilter !== 'all' ? (data?.byMonth?.[monthFilter] || null) : null;

  return (
    <View style={{ flex: 1 }}>
      {/* ---------- Top bar ---------- */}
      <View style={s.topBar}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Hiring Tracker</Text>
            <Text style={s.sub}>
              {data.totals.totalNeed} needed • {data.totals.hrCount} selected by HR • {data.totals.joined} joined
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={s.iconBtn} accessibilityLabel="Refresh">
            <Icon name="refresh-outline" size={16} color="#818cf8" />
          </TouchableOpacity>
        </View>

        <View style={s.segment}>
          {[['work', 'Work', 'create-outline'], ['summary', 'Summary', 'pie-chart-outline']].map(([key, label, icon]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setMode(key)}
              style={[s.segmentBtn, mode === key && s.segmentBtnActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === key }}
            >
              <Icon name={icon} size={14} color={mode === key ? '#fff' : '#94a3b8'} />
              <Text style={[s.segmentText, mode === key && s.segmentTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.searchBox}>
          <Icon name="search-outline" size={16} color="#64748b" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search dept, position or remarks..."
            placeholderTextColor="#64748b"
            style={s.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {mode === 'work' && (
            <Chip label="All months" active={monthFilter === 'all'} onPress={() => setMonth('all')} />
          )}
          {months.map(m => (
            <Chip key={m} label={shortMonth(m)} active={monthFilter === m} onPress={() => setMonth(m)} />
          ))}
        </ScrollView>
      </View>

      {mode === 'work' ? (
        <FlatList
          data={filtered}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" colors={['#6366f1']} />}
          initialNumToRender={12}
          windowSize={7}
          ListHeaderComponent={
            <View style={s.legendRow}>
              <Legend color="#818cf8" label="HOD = needed" />
              <Legend color="#34d399" label="HR = selected" />
              <Text style={s.legendHint}>Tap a month to update</Text>
            </View>
          }
          ListEmptyComponent={<Empty text="No positions match your search." />}
          renderItem={({ item }) => (
            <WorkCard
              position={item}
              monthFilter={monthFilter}
              onEdit={entry => setEditing({ position: item, entry })}
              onAddMonth={() => setAdding(item)}
            />
          )}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" colors={['#6366f1']} />}
          initialNumToRender={12}
          windowSize={7}
          ListHeaderComponent={<SummaryHeader month={monthFilter} totals={monthTotals} />}
          ListEmptyComponent={<Empty text={`No hiring planned for ${monthLabel(monthFilter)}.`} />}
          renderItem={({ item }) => (
            <SummaryCard
              position={item}
              entry={item.months.find(m => m.month === monthFilter)}
              onEdit={entry => setEditing({ position: item, entry })}
            />
          )}
        />
      )}

      <EditMonthModal
        visible={!!editing}
        position={editing?.position}
        entry={editing?.entry}
        canEditHr={canEditHr}
        onClose={() => setEditing(null)}
        onSave={saveEntry}
        onRemove={canEditHr ? removeMonth : null}
      />

      <AddMonthModal
        visible={!!adding}
        position={adding}
        months={months}
        onClose={() => setAdding(null)}
        onAdd={addMonth}
      />
    </View>
  );
}

// ======================================================================
// WORK
function WorkCard({ position, monthFilter, onEdit, onAddMonth }) {
  const entries = monthFilter === 'all' ? position.months : position.months.filter(m => m.month === monthFilter);
  const hodTotal = position.months.reduce((t, m) => t + m.hodCount, 0);
  const hrTotal  = position.months.reduce((t, m) => t + m.hrCount, 0);

  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.dept} numberOfLines={2}>{position.dept}</Text>
          <Text style={s.position}>{position.position}</Text>
        </View>
        <View style={s.needBadge}>
          <Text style={s.needNum}>{position.totalNeed}</Text>
          <Text style={s.needLabel}>{position.totalNeed === 1 ? 'WORKER' : 'WORKERS'}</Text>
        </View>
      </View>

      <View style={s.progressRow}>
        <Text style={s.progressText}>HR selected {hrTotal} of {hodTotal || position.totalNeed}</Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${Math.min(100, (hrTotal / Math.max(1, hodTotal || position.totalNeed)) * 100)}%` }]} />
        </View>
      </View>

      {entries.map(m => {
        const gap = m.hodCount - m.hrCount;
        return (
          <TouchableOpacity key={m.id} style={s.monthRow} onPress={() => onEdit(m)} activeOpacity={0.7}>
            <View style={s.monthRowTop}>
              <Text style={s.monthName}>{monthLabel(m.month)}</Text>
              <View style={s.countGroup}>
                <CountBox label="HOD" value={m.hodCount} color="#818cf8" />
                <CountBox label="HR" value={m.hrCount} color="#34d399" />
                {gap > 0 ? (
                  <Text style={[s.gapPill, s.gapShort]}>{gap} short</Text>
                ) : (
                  <Text style={[s.gapPill, s.gapOk]}>{m.hodCount > 0 ? 'Covered' : '—'}</Text>
                )}
                <Icon name="chevron-forward" size={14} color="#475569" />
              </View>
            </View>
            {m.remarks ? <Text style={s.remarks} numberOfLines={2}>{m.remarks}</Text> : null}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={s.addMonthBtn} onPress={onAddMonth}>
        <Icon name="add-circle-outline" size={15} color="#818cf8" />
        <Text style={s.addMonthText}>Add month</Text>
      </TouchableOpacity>
    </View>
  );
}

function CountBox({ label, value, color }) {
  return (
    <View style={s.countBox}>
      <Text style={[s.countLabel, { color }]}>{label}</Text>
      <Text style={s.countVal}>{value}</Text>
    </View>
  );
}

// ======================================================================
// SUMMARY
function SummaryHeader({ month, totals }) {
  if (!totals) return null;
  const pending = Math.max(0, totals.hrCount - stageSum(totals));
  const gap = Math.max(0, totals.hodCount - totals.hrCount);
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={s.sectionTitle}>{monthLabel(month)} overview</Text>
      <View style={s.kpiRow}>
        <Kpi label="HOD need" value={totals.hodCount} color="#818cf8" />
        <Kpi label="HR selected" value={totals.hrCount} color="#34d399" />
        <Kpi label="Still short" value={gap} color={gap > 0 ? '#f87171' : '#34d399'} />
      </View>

      <View style={s.pipelineCard}>
        <Text style={s.pipelineTitle}>HR selected → stage split</Text>
        <StageBar entry={totals} height={10} />
        <View style={s.stageGrid}>
          {STAGES.map(st => (
            <View key={st.key} style={s.stageCell}>
              <View style={[s.dot, { backgroundColor: st.color }]} />
              <Text style={s.stageCellLabel}>{st.label}</Text>
              <Text style={s.stageCellVal}>{totals[st.key]}</Text>
            </View>
          ))}
          {pending > 0 && (
            <View style={s.stageCell}>
              <View style={[s.dot, { backgroundColor: '#475569' }]} />
              <Text style={s.stageCellLabel}>Not assigned</Text>
              <Text style={s.stageCellVal}>{pending}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function Kpi({ label, value, color }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiVal, { color }]}>{value}</Text>
    </View>
  );
}

function StageBar({ entry, height = 6 }) {
  const total = Math.max(entry.hrCount || 0, stageSum(entry));
  if (!total) return <View style={[s.track, { height }]} />;
  return (
    <View style={[s.stageBar, { height }]}>
      {STAGES.map(st => entry[st.key] > 0 && (
        <View key={st.key} style={{ flex: entry[st.key], backgroundColor: st.color }} />
      ))}
      {total - stageSum(entry) > 0 && <View style={{ flex: total - stageSum(entry), backgroundColor: '#334155' }} />}
    </View>
  );
}

function SummaryCard({ position, entry, onEdit }) {
  if (!entry) return null;
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={() => onEdit(entry)}>
      <View style={s.cardHead}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.dept} numberOfLines={2}>{position.dept}</Text>
          <Text style={s.position}>{position.position}</Text>
          <Text style={s.mutedSmall}>{position.totalNeed} {position.totalNeed === 1 ? 'worker' : 'workers'} needed overall</Text>
        </View>
        <View style={s.countGroup}>
          <CountBox label="HOD" value={entry.hodCount} color="#818cf8" />
          <CountBox label="HR" value={entry.hrCount} color="#34d399" />
        </View>
      </View>

      <StageBar entry={entry} />
      <View style={s.stagePills}>
        {STAGES.map(st => (
          <Text
            key={st.key}
            style={[s.stagePill, entry[st.key] > 0 && { borderColor: st.color + '66', color: st.color }]}
          >
            {st.label}: {entry[st.key]}
          </Text>
        ))}
      </View>
      {entry.joiningDate ? (
        <View style={s.joinRow}>
          <Icon name="calendar-outline" size={12} color="#34d399" />
          <Text style={s.joinText}>Joining date: {entry.joiningDate}</Text>
        </View>
      ) : null}
      {entry.remarks ? <Text style={s.remarks} numberOfLines={2}>{entry.remarks}</Text> : null}
    </TouchableOpacity>
  );
}

// ======================================================================
// MODALS
function Stepper({ label, value, onChange, disabled, color = '#e2e8f0' }) {
  return (
    <View style={[s.stepRow, disabled && { opacity: 0.45 }]}>
      <Text style={[s.stepLabel, { color }]}>{label}</Text>
      <View style={s.stepper}>
        <TouchableOpacity
          disabled={disabled || value <= 0}
          onPress={() => onChange(Math.max(0, value - 1))}
          style={s.stepBtn}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Icon name="remove" size={16} color="#cbd5e1" />
        </TouchableOpacity>
        <TextInput
          editable={!disabled}
          value={String(value)}
          onChangeText={t => onChange(Math.max(0, parseInt(t.replace(/[^0-9]/g, '') || '0', 10)))}
          keyboardType="number-pad"
          style={s.stepInput}
          selectTextOnFocus
        />
        <TouchableOpacity
          disabled={disabled}
          onPress={() => onChange(value + 1)}
          style={s.stepBtn}
          accessibilityLabel={`Increase ${label}`}
        >
          <Icon name="add" size={16} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EditMonthModal({ visible, position, entry, canEditHr, onClose, onSave, onRemove }) {
  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState(null);
  const [confirmDel, setConf] = useState(false);

  useEffect(() => {
    if (entry) {
      setForm({
        hodCount: entry.hodCount, hrCount: entry.hrCount,
        sourcing: entry.sourcing, onboarding: entry.onboarding, offerIssued: entry.offerIssued, joined: entry.joined,
        joiningDate: entry.joiningDate || '', remarks: entry.remarks || '',
      });
      setErr(null);
      setConf(false);
    }
  }, [entry]);

  if (!visible || !form) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const assigned = stageSum(form);
  const over = assigned > form.hrCount;

  async function handleSave() {
    if (over) { setErr(`Stages add up to ${assigned}, but HR selected only ${form.hrCount}.`); return; }
    setSaving(true); setErr(null);
    try {
      const body = { hodCount: form.hodCount, remarks: form.remarks.trim() };
      if (canEditHr) {
        Object.assign(body, {
          hrCount: form.hrCount, sourcing: form.sourcing, onboarding: form.onboarding,
          offerIssued: form.offerIssued, joined: form.joined, joiningDate: form.joiningDate.trim(),
        });
      }
      await onSave(entry.id, body);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirmDel) { setConf(true); return; }
    setSaving(true);
    try { await onRemove(entry.id); onClose(); } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetEyebrow}>{monthLabel(entry.month)} • {position.dept}</Text>
              <Text style={s.sheetTitle}>{position.position}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Icon name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
            <Text style={s.groupTitle}>Requirement</Text>
            <Stepper label="HOD — workers needed" value={form.hodCount} onChange={v => set('hodCount', v)} color="#a5b4fc" />
            <Stepper label="HR — workers selected" value={form.hrCount} onChange={v => set('hrCount', v)} disabled={!canEditHr} color="#6ee7b7" />

            <View style={s.groupHeadRow}>
              <Text style={s.groupTitle}>Stage of selected people</Text>
              <Text style={[s.assigned, over && { color: '#f87171' }]}>{assigned} / {form.hrCount} assigned</Text>
            </View>
            {STAGES.map(st => (
              <Stepper key={st.key} label={st.label} value={form[st.key]} onChange={v => set(st.key, v)} disabled={!canEditHr} color={st.color} />
            ))}

            <Text style={s.fieldLabel}>Joining date</Text>
            <TextInput
              value={form.joiningDate}
              onChangeText={v => set('joiningDate', v)}
              editable={canEditHr}
              placeholder="e.g. 16.11.2026"
              placeholderTextColor="#64748b"
              style={[s.input, !canEditHr && { opacity: 0.45 }]}
            />

            <Text style={s.fieldLabel}>Remarks</Text>
            <TextInput
              value={form.remarks}
              onChangeText={v => set('remarks', v)}
              placeholder="Names, notes, approvals..."
              placeholderTextColor="#64748b"
              style={[s.input, { minHeight: 64, textAlignVertical: 'top' }]}
              multiline
            />

            {!canEditHr && (
              <Text style={s.note}>Only HR can change the selected count and stages. You can update the HOD need and remarks.</Text>
            )}
            {entry.updatedBy ? <Text style={s.note}>Last updated by {entry.updatedBy}</Text> : null}
            {err ? <Text style={s.errText}>{err}</Text> : null}
          </ScrollView>

          <View style={s.sheetActions}>
            {onRemove && (
              <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={handleRemove} disabled={saving}>
                <Text style={s.btnDangerText}>{confirmDel ? 'Tap to confirm' : 'Remove month'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btn, s.btnPrimary, { flex: 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddMonthModal({ visible, position, months, onClose, onAdd }) {
  const [month, setMonth]     = useState(null);
  const [hodCount, setHod]    = useState(1);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState(null);

  // Offer 18 months starting from the earliest month in the plan
  const options = useMemo(() => {
    const start = months[0] || currentMonthKey();
    const last  = months[months.length - 1] || start;
    const out = [];
    for (let k = start; out.length < 36; k = addMonths(k, 1)) {
      out.push(k);
      if (k >= addMonths(last, 6) && k >= addMonths(currentMonthKey(), 6)) break;
    }
    return out;
  }, [months]);

  useEffect(() => {
    if (position) {
      const used = new Set(position.months.map(m => m.month));
      setMonth(options.find(o => !used.has(o) && o >= currentMonthKey()) || options.find(o => !used.has(o)) || null);
      setHod(1); setRemarks(''); setErr(null);
    }
  }, [position, options]);

  if (!visible || !position) return null;
  const used = new Set(position.months.map(m => m.month));

  async function handleAdd() {
    if (!month) { setErr('Pick a month.'); return; }
    setSaving(true); setErr(null);
    try {
      await onAdd(position.id, { month, hodCount, remarks: remarks.trim() });
      onClose();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetEyebrow}>Add month • {position.dept}</Text>
              <Text style={s.sheetTitle}>{position.position}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Icon name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={s.groupTitle}>Month</Text>
          <View style={s.monthGrid}>
            {options.map(o => {
              const taken = used.has(o);
              return (
                <TouchableOpacity
                  key={o}
                  disabled={taken}
                  onPress={() => setMonth(o)}
                  style={[s.monthOpt, month === o && s.monthOptActive, taken && { opacity: 0.3 }]}
                >
                  <Text style={[s.monthOptText, month === o && { color: '#fff' }]}>{shortMonth(o)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Stepper label="HOD — workers needed" value={hodCount} onChange={setHod} color="#a5b4fc" />
          <Text style={s.fieldLabel}>Remarks</Text>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Optional"
            placeholderTextColor="#64748b"
            style={s.input}
          />
          {err ? <Text style={s.errText}>{err}</Text> : null}

          <View style={s.sheetActions}>
            <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose}>
              <Text style={s.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnPrimary, { flex: 1 }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryText}>Add {month ? monthLabel(month) : ''}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ======================================================================
function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Legend({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

function Empty({ text }) {
  return (
    <View style={s.empty}>
      <Text style={s.muted}>{text}</Text>
    </View>
  );
}

// ======================================================================
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: '#94a3b8', fontSize: 12 },
  mutedSmall: { color: '#64748b', fontSize: 11, marginTop: 2 },
  retryBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  topBar: { paddingHorizontal: 16, paddingTop: 14, backgroundColor: '#090d16' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  sub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155',
  },

  segment: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#1e293b', marginBottom: 10 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  segmentBtnActive: { backgroundColor: '#4f46e5' },
  segmentText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  segmentTextActive: { color: '#fff' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a',
    borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, height: 40 },

  chipRow: { gap: 8, paddingVertical: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  chipText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },

  listContent: { paddingHorizontal: 16, paddingBottom: 28 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  legendText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  legendHint: { color: '#64748b', fontSize: 11, marginLeft: 'auto' },
  dot: { width: 8, height: 8, borderRadius: 4 },

  card: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  dept: { color: '#818cf8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  position: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 },
  needBadge: { alignItems: 'center', backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 64 },
  needNum: { color: '#fff', fontSize: 18, fontWeight: '900' },
  needLabel: { color: '#94a3b8', fontSize: 9, fontWeight: '800' },

  progressRow: { marginBottom: 8 },
  progressText: { color: '#94a3b8', fontSize: 11, marginBottom: 5 },
  track: { height: 6, backgroundColor: '#1e293b', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#34d399', borderRadius: 4 },

  monthRow: { backgroundColor: '#111c31', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, borderWidth: 1, borderColor: '#1e293b' },
  monthRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthName: { color: '#e2e8f0', fontWeight: '800', fontSize: 13 },
  countGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBox: { alignItems: 'center', minWidth: 34 },
  countLabel: { fontSize: 9, fontWeight: '800' },
  countVal: { color: '#fff', fontSize: 15, fontWeight: '900' },
  gapPill: { fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', borderWidth: 1 },
  gapShort: { color: '#fca5a5', borderColor: '#7f1d1d', backgroundColor: '#450a0a55' },
  gapOk: { color: '#6ee7b7', borderColor: '#065f46', backgroundColor: '#022c2255' },
  remarks: { color: '#94a3b8', fontSize: 11, marginTop: 6 },

  addMonthBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#312e81', backgroundColor: '#1e1b4b55' },
  addMonthText: { color: '#a5b4fc', fontSize: 12, fontWeight: '700' },

  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpi: { flex: 1, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 14, padding: 12 },
  kpiLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  kpiVal: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  pipelineCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 14, padding: 12, marginBottom: 14 },
  pipelineTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  stageBar: { flexDirection: 'row', borderRadius: 4, overflow: 'hidden', backgroundColor: '#1e293b', gap: 2 },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, rowGap: 8 },
  stageCell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageCellLabel: { color: '#94a3b8', fontSize: 12, flex: 1 },
  stageCellVal: { color: '#fff', fontSize: 14, fontWeight: '800', paddingRight: 12 },
  stagePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  stagePill: { color: '#64748b', fontSize: 11, fontWeight: '700', borderWidth: 1, borderColor: '#1e293b', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  joinText: { color: '#6ee7b7', fontSize: 11, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, borderWidth: 1, borderColor: '#1e293b', maxWidth: 560, width: '100%', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  sheetEyebrow: { color: '#818cf8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  groupTitle: { color: '#cbd5e1', fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  groupHeadRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  assigned: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  stepLabel: { fontSize: 13, fontWeight: '700', flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepInput: { width: 48, height: 36, color: '#fff', textAlign: 'center', fontSize: 15, fontWeight: '800' },
  fieldLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, color: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  note: { color: '#64748b', fontSize: 11, marginTop: 10 },
  errText: { color: '#f87171', fontSize: 12, fontWeight: '700', marginTop: 10 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  monthOpt: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  monthOptActive: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  monthOptText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: '#4f46e5' },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnGhost: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  btnGhostText: { color: '#cbd5e1', fontWeight: '700' },
  btnDanger: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#7f1d1d' },
  btnDangerText: { color: '#fca5a5', fontWeight: '700', fontSize: 13 },
  empty: { padding: 24, alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 14, borderWidth: 1, borderColor: '#1e293b' },
});
