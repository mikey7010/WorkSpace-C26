// Shared mobile UI kit — mirrors the website's Tailwind slate/indigo dark theme
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const C = {
  bg: '#020617',        // slate-950
  card: '#0f172a',      // slate-900
  card2: '#1e293b',     // slate-800
  border: '#1e293b',
  border2: '#334155',   // slate-700
  text: '#ffffff',
  sub: '#94a3b8',       // slate-400
  dim: '#64748b',       // slate-500
  indigo: '#6366f1',
  indigo6: '#4f46e5',
  indigoText: '#a5b4fc',
  emerald: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  blue: '#60a5fa',
  purple: '#c4b5fd',
  cyan: '#67e8f9',
};

const AVATAR_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16'];

export function Icon({ name, size = 16, color = '#fff', style }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export function Avatar({ name = '', id = 1, size = 32 }) {
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR_COLORS[(id || 1) % AVATAR_COLORS.length], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: Math.max(9, size * 0.36) }}>{initials}</Text>
    </View>
  );
}

export function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return String(d);
  return x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d) {
  if (!d) return '';
  const x = new Date(d);
  return `${fmtDate(x)}, ${x.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

export function toISODate(d) {
  if (!d) return '';
  const x = new Date(d);
  return isNaN(x) ? '' : x.toISOString().slice(0, 10);
}

export const num = v => (v === undefined || v === null ? '—' : Number(v).toLocaleString('en-IN'));

// ---------- Layout ----------
export function Screen({ children, refreshControl, contentStyle }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[u.screen, contentStyle]} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function PageHeader({ eyebrow, eyebrowColor = C.emerald, live, title, subtitle, actions }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {eyebrow ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {live && <View style={[u.dot, { backgroundColor: eyebrowColor }]} />}
          <Text style={[u.eyebrow, { color: eyebrowColor }]}>{eyebrow}</Text>
        </View>
      ) : null}
      <Text style={u.h1}>{title}</Text>
      {subtitle ? <Text style={u.sub}>{subtitle}</Text> : null}
      {actions ? <View style={u.actionsRow}>{actions}</View> : null}
    </View>
  );
}

export function Card({ children, style, onPress, tone }) {
  const toneStyle = tone === 'red' ? { borderColor: '#ef444466', backgroundColor: '#ef44440d' }
    : tone === 'amber' ? { borderColor: '#f59e0b55' }
    : tone === 'green' ? { borderColor: '#10b98155', backgroundColor: '#10b9810d' }
    : tone === 'indigo' ? { borderColor: '#6366f180', backgroundColor: '#4f46e526' }
    : null;
  const Comp = onPress ? TouchableOpacity : View;
  return <Comp activeOpacity={0.75} onPress={onPress} style={[u.card, toneStyle, style]}>{children}</Comp>;
}

export function SectionTitle({ title, subtitle, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={u.h3}>{title}</Text>
        {subtitle ? <Text style={u.small}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Kpi({ label, value, suffix, note, color = C.text, badge, badgeColor = C.indigo, progress }) {
  return (
    <View style={u.kpi}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={u.kpiLabel} numberOfLines={2}>{label}</Text>
        {badge ? <View style={[u.kpiBadge, { backgroundColor: badgeColor + '1a' }]}><Text style={{ color: badgeColor, fontSize: 11, fontWeight: '800' }}>{badge}</Text></View> : null}
      </View>
      <Text style={[u.kpiVal, { color }]}>
        {value}{suffix ? <Text style={u.kpiSuffix}> {suffix}</Text> : null}
      </Text>
      {progress !== undefined && <Progress value={progress} style={{ marginTop: 8 }} />}
      {note ? <Text style={u.kpiNote}>{note}</Text> : null}
    </View>
  );
}

export function KpiGrid({ children }) {
  return <View style={u.kpiGrid}>{children}</View>;
}

export function Progress({ value = 0, color = C.indigo, style, height = 6 }) {
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: C.card2, overflow: 'hidden' }, style]}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

const TONES = {
  red: ['#ef444433', '#fca5a5', '#ef44444d'],
  green: ['#10b98133', '#6ee7b7', '#10b9814d'],
  amber: ['#f59e0b33', '#fcd34d', '#f59e0b4d'],
  blue: ['#3b82f633', '#93c5fd', '#3b82f64d'],
  indigo: ['#6366f133', '#a5b4fc', '#6366f14d'],
  purple: ['#a855f733', '#d8b4fe', '#a855f74d'],
  cyan: ['#06b6d433', '#67e8f9', '#06b6d44d'],
  slate: ['#1e293b', '#94a3b8', '#334155'],
};

export function Badge({ label, tone = 'indigo', style }) {
  const [bg, fg, bd] = TONES[tone] || TONES.indigo;
  return <Text style={[u.badge, { backgroundColor: bg, color: fg, borderColor: bd }, style]}>{label}</Text>;
}

export function Btn({ title, onPress, kind = 'primary', icon, disabled, loading, style, small }) {
  const k = kind === 'primary' ? u.btnPrimary : kind === 'danger' ? u.btnDanger : kind === 'success' ? u.btnSuccess : u.btnGhost;
  const tc = kind === 'ghost' ? '#cbd5e1' : kind === 'danger' ? '#fca5a5' : '#fff';
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[u.btn, small && u.btnSmall, k, (disabled) && { opacity: 0.5 }, style]} activeOpacity={0.8}>
      {loading ? <ActivityIndicator color={tc} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon ? <Icon name={icon} size={small ? 13 : 15} color={tc} /> : null}
          <Text style={[u.btnText, small && { fontSize: 12 }, { color: tc }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function IconBtn({ name, onPress, color = C.indigoText, label }) {
  return (
    <TouchableOpacity onPress={onPress} style={u.iconBtn} accessibilityLabel={label}>
      <Icon name={name} size={16} color={color} />
    </TouchableOpacity>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} style={{ marginBottom: 12, flexGrow: 0 }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <TouchableOpacity key={String(o.value)} onPress={() => onChange(o.value)} style={[u.chip, active && u.chipActive]}>
            <Text style={[u.chipText, active && { color: '#fff' }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <View style={u.search}>
      <Icon name="search-outline" size={16} color={C.dim} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.dim} style={u.searchInput} />
      {value ? <TouchableOpacity onPress={() => onChange('')}><Icon name="close-circle" size={16} color={C.dim} /></TouchableOpacity> : null}
    </View>
  );
}

// ---------- Forms ----------
export function Field({ label, value, onChange, placeholder, multiline, keyboardType, editable = true, style }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={u.label}>{label}</Text> : null}
      <TextInput
        value={value === undefined || value === null ? '' : String(value)}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.dim}
        multiline={multiline}
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[u.input, multiline && { minHeight: 70, textAlignVertical: 'top' }, !editable && { opacity: 0.5 }]}
      />
    </View>
  );
}

export function Row({ children, gap = 10 }) {
  return <View style={{ flexDirection: 'row', gap }}>{React.Children.map(children, c => c && <View style={{ flex: 1 }}>{c}</View>)}</View>;
}

// Dropdown replacement for <select>
export function Select({ label, value, options, onChange, placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => String(o.value) === String(value));
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={u.label}>{label}</Text> : null}
      <TouchableOpacity style={[u.input, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => setOpen(true)}>
        <Text style={{ flex: 1, color: current ? '#fff' : C.dim, fontSize: 13 }} numberOfLines={1}>{current ? current.label : placeholder}</Text>
        <Icon name="chevron-down" size={14} color={C.sub} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={u.selectOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={u.selectBox}>
            {label ? <Text style={[u.h3, { marginBottom: 8 }]}>{label}</Text> : null}
            <ScrollView style={{ maxHeight: 420 }}>
              {options.map(o => {
                const active = String(o.value) === String(value);
                return (
                  <TouchableOpacity key={String(o.value)} style={[u.selectOpt, active && { backgroundColor: '#4f46e533' }]} onPress={() => { onChange(o.value); setOpen(false); }}>
                    <Text style={{ color: active ? C.indigoText : '#e2e8f0', fontSize: 14, flex: 1 }}>{o.label}</Text>
                    {active && <Icon name="checkmark" size={16} color={C.indigoText} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Bottom-sheet modal used for every website "modal"
export function Sheet({ visible, title, subtitle, onClose, children, footer }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={u.sheetOverlay}>
        <View style={u.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={u.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={u.small}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close"><Icon name="close" size={22} color={C.sub} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          {footer ? <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Simple vertical bar chart (replaces recharts on mobile)
export function BarChart({ data, height = 150, series }) {
  // data: [{ label, values: [n, n2] }]; series: [{ name, color }]
  const max = Math.max(1, ...data.flatMap(d => d.values));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6, borderBottomWidth: 1, borderBottomColor: C.border2, paddingBottom: 2 }}>
        {data.map(d => (
          <View key={d.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: '100%' }}>
              {d.values.map((v, i) => (
                <View key={i} style={{ width: series.length > 1 ? 8 : 16, height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0, backgroundColor: series[i].color, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {data.map(d => (
          <Text key={d.label} style={{ flex: 1, textAlign: 'center', color: C.sub, fontSize: 9 }} numberOfLines={1}>{d.label}</Text>
        ))}
      </View>
      {series.length > 1 || series[0].name ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 8 }}>
          {series.map(s => (
            <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: s.color }} />
              <Text style={{ color: C.sub, fontSize: 11 }}>{s.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function Loading({ text = 'Loading...' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 40 }}>
      <ActivityIndicator size="large" color={C.indigo} />
      <Text style={{ color: C.sub, fontSize: 12, marginTop: 12 }}>{text}</Text>
    </View>
  );
}

export function Empty({ text }) {
  return (
    <View style={u.empty}><Text style={{ color: C.sub, fontSize: 12, textAlign: 'center' }}>{text}</Text></View>
  );
}

export function Notice({ text, tone = 'green' }) {
  const [bg, fg, bd] = TONES[tone];
  return <Text style={{ backgroundColor: bg, color: fg, borderColor: bd, borderWidth: 1, borderRadius: 12, padding: 10, fontSize: 12, fontWeight: '700', marginBottom: 12 }}>{text}</Text>;
}

export function MiniStat({ label, value, color = '#fff' }) {
  return (
    <View style={u.mini}>
      <Text style={u.miniLabel}>{label}</Text>
      <Text style={[u.miniVal, { color }]}>{value}</Text>
    </View>
  );
}

export const u = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 32 },
  eyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  h1: { color: '#fff', fontSize: 21, fontWeight: '900', letterSpacing: -0.3 },
  h3: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sub: { color: C.sub, fontSize: 12, marginTop: 4, lineHeight: 17 },
  small: { color: C.sub, fontSize: 11, marginTop: 2, lineHeight: 15 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 16, marginBottom: 14 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpi: { flexBasis: '47%', flexGrow: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 14 },
  kpiLabel: { color: C.sub, fontSize: 11, fontWeight: '700', flex: 1, paddingRight: 4 },
  kpiBadge: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  kpiVal: { fontSize: 24, fontWeight: '900' },
  kpiSuffix: { fontSize: 11, color: C.sub, fontWeight: '600' },
  kpiNote: { color: C.sub, fontSize: 10.5, marginTop: 6, lineHeight: 14 },
  badge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, overflow: 'hidden', alignSelf: 'flex-start' },
  btn: { height: 42, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { height: 34, paddingHorizontal: 11, borderRadius: 10 },
  btnPrimary: { backgroundColor: C.indigo6 },
  btnSuccess: { backgroundColor: '#059669' },
  btnGhost: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2 },
  btnDanger: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#7f1d1d' },
  btnText: { fontWeight: '800', fontSize: 13 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2 },
  chipActive: { backgroundColor: C.indigo6, borderColor: C.indigo },
  chipText: { color: C.sub, fontSize: 12, fontWeight: '800' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, height: 42 },
  label: { color: C.sub, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 12, color: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, minHeight: 42 },
  selectOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: 24 },
  selectBox: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border2, padding: 14, maxWidth: 480, width: '100%', alignSelf: 'center' },
  selectOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  sheetOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: C.border2, padding: 18, maxWidth: 600, width: '100%', alignSelf: 'center' },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  empty: { padding: 24, borderRadius: 18, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', backgroundColor: C.card, marginBottom: 14 },
  mini: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#1e293b99', borderRadius: 12, padding: 10 },
  miniLabel: { color: C.sub, fontSize: 10.5, fontWeight: '600' },
  miniVal: { fontSize: 15, fontWeight: '900', marginTop: 2 },
});
