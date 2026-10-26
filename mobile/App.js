import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  apiRequest,
  getServerUrl,
  setServerUrl,
  saveServerUrl,
  loadSavedServerUrl,
  testServerConnection,
  DEFAULT_SERVER_URL,
  CLOUD_SERVER_URL,
  LOCAL_DEV_URL,
} from './src/api/config';
import { io } from 'socket.io-client';
import HiringTracker from './src/HiringTracker';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
const AuthContext = createContext(null);

function AppIcon({ name, size = 18, color = '#fff', style }) {
  try {
    return <Ionicons name={name} size={size} color={color} style={style} />;
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [user, setUser]             = useState(null);
  const [token, setToken]           = useState(null);
  const [currentTab, setTab]        = useState('dashboard');
  const [serverHost, setHost]       = useState(getServerUrl());
  const [showConfig, setShowConfig] = useState(false);
  const [liveNotice, setLiveNotice] = useState(null);
  const [socketOnline, setOnline]   = useState(false);
  const [hiringTick, setHiringTick] = useState(0);

  // Restore saved server URL from storage on startup
  useEffect(() => {
    loadSavedServerUrl().then(saved => {
      if (saved) setHost(saved);
    });
  }, []);

  // Connect to Socket.io for Realtime events on mobile (with cloud websocket & polling fallback)
  useEffect(() => {
    let socket;
    try {
      socket = io(getServerUrl(), {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', () => setOnline(true));
      socket.on('disconnect', () => setOnline(false));
      socket.on('connect_error', () => setOnline(false));

      socket.on('directive:new', dir => {
        setLiveNotice(`📢 HR Directive: "${dir.title}"`);
        setTimeout(() => setLiveNotice(null), 6000);
      });

      socket.on('hiring:update', () => setHiringTick(t => t + 1));

      socket.on('worklog:new', log => {
        setLiveNotice(`🏭 Work Report: ${log.department?.name || 'Department'} (${log.actualOutput || 0} units)`);
        setTimeout(() => setLiveNotice(null), 6000);
      });
    } catch (e) {
      console.log('Socket connection error', e);
      setOnline(false);
    }
    return () => socket && socket.disconnect();
  }, [serverHost]);

  async function login(email, password) {
    const res = await apiRequest('/auth/login', 'POST', { email, password });
    setUser(res.user);
    setToken(res.token);
    setTab(res.user.role === 'hr_admin' || res.user.role === 'admin' ? 'dashboard' : 'floor');
    return res.user;
  }

  function logout() {
    setUser(null);
    setToken(null);
  }

  const isHr = user && (user.role === 'hr_admin' || user.role === 'admin');

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <SafeAreaView style={styles.container}>
        <ExpoStatusBar style="light" />
        <StatusBar barStyle="light-content" backgroundColor="#090d16" translucent={Platform.OS === 'android'} />

        {/* Realtime Live Toast Banner */}
        {liveNotice && (
          <View style={[styles.realtimeBanner, { marginTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT : 0 }]}>
            <AppIcon name="radio-outline" size={14} color="#fff" />
            <Text style={styles.realtimeBannerText} numberOfLines={1}>{liveNotice}</Text>
          </View>
        )}

        {!user ? (
          <LoginScreen onOpenConfig={() => setShowConfig(true)} />
        ) : (
          <View style={styles.mainLayout}>
            {/* Mobile Header with safe area padding */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + 10 : 12 }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle}>WorkSpace C26</Text>
                  <View style={[styles.socketDot, { backgroundColor: socketOnline ? '#10b981' : '#f59e0b' }]} />
                </View>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {user.name} • {user.role === 'hr_admin' ? 'HR Head' : (user.department?.code || 'Dept Head')}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setShowConfig(true)}
                  style={styles.headerIconBtn}
                  accessibilityLabel="Server connection settings"
                >
                  <AppIcon name="server-outline" size={17} color="#94a3b8" />
                </TouchableOpacity>

                <TouchableOpacity onPress={logout} style={styles.logoutBtn} accessibilityLabel="Sign out">
                  <AppIcon name="log-out-outline" size={14} color="#f87171" />
                  <Text style={styles.logoutBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Screen Content based on Active Tab — inside flex 1, never obscured */}
            <View style={styles.screenContainer}>
              {currentTab === 'dashboard' && <HrDashboardView token={token} />}
              {currentTab === 'matrix' && <ManpowerMatrixView token={token} />}
              {currentTab === 'floor' && <DeptHeadFloorView user={user} token={token} />}
              {currentTab === 'onboarding' && <OnboardingView token={token} />}
              {currentTab === 'directives' && <DirectivesView user={user} token={token} />}
              {currentTab === 'hiring' && <HiringTracker user={user} token={token} refreshSignal={hiringTick} />}
            </View>

            {/* Bottom Tab Navigation in flex flow with Android bottom inset */}
            <View style={styles.bottomNav}>
              {isHr ? (
                <>
                  <TabItem label="Command" active={currentTab === 'dashboard'} onPress={() => setTab('dashboard')} icon="speedometer-outline" activeIcon="speedometer" />
                  <TabItem label="C26 Matrix" active={currentTab === 'matrix'} onPress={() => setTab('matrix')} icon="grid-outline" activeIcon="grid" />
                  <TabItem label="Hiring" active={currentTab === 'hiring'} onPress={() => setTab('hiring')} icon="briefcase-outline" activeIcon="briefcase" />
                  <TabItem label="Onboard" active={currentTab === 'onboarding'} onPress={() => setTab('onboarding')} icon="people-outline" activeIcon="people" />
                  <TabItem label="Directives" active={currentTab === 'directives'} onPress={() => setTab('directives')} icon="megaphone-outline" activeIcon="megaphone" />
                </>
              ) : (
                <>
                  <TabItem label="Floor Work" active={currentTab === 'floor'} onPress={() => setTab('floor')} icon="construct-outline" activeIcon="construct" />
                  <TabItem label="C26 Matrix" active={currentTab === 'matrix'} onPress={() => setTab('matrix')} icon="grid-outline" activeIcon="grid" />
                  <TabItem label="Hiring" active={currentTab === 'hiring'} onPress={() => setTab('hiring')} icon="briefcase-outline" activeIcon="briefcase" />
                  <TabItem label="Onboard" active={currentTab === 'onboarding'} onPress={() => setTab('onboarding')} icon="people-outline" activeIcon="people" />
                  <TabItem label="Directives" active={currentTab === 'directives'} onPress={() => setTab('directives')} icon="megaphone-outline" activeIcon="megaphone" />
                </>
              )}
            </View>
          </View>
        )}

        {/* Server IP Configuration Modal with Live Ping Test & Persistent Storage */}
        <ServerConfigModal
          visible={showConfig}
          initialUrl={serverHost}
          onClose={() => setShowConfig(false)}
          onSaved={url => setHost(url)}
        />
      </SafeAreaView>
    </AuthContext.Provider>
  );
}

// ----------------- SERVER CONFIG & DIAGNOSTICS MODAL -----------------
function ServerConfigModal({ visible, initialUrl, onClose, onSaved }) {
  const [urlInput, setUrlInput]     = useState(initialUrl);
  const [testState, setTestState]   = useState({ status: 'idle', message: '', latency: null });
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    setUrlInput(initialUrl);
    setTestState({ status: 'idle', message: '', latency: null });
  }, [visible, initialUrl]);

  async function handleTest() {
    setTestState({ status: 'testing', message: 'Pinging /api/health...', latency: null });
    const res = await testServerConnection(urlInput);
    if (res.ok) {
      setTestState({
        status: 'success',
        message: `Connected successfully! (${res.latencyMs}ms)\nService: ${res.service} • Database: ${res.database}`,
        latency: res.latencyMs,
      });
    } else {
      setTestState({
        status: 'error',
        message: res.error,
        latency: res.latencyMs,
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const persisted = await saveServerUrl(urlInput);
      onSaved(persisted);
      Alert.alert('Configuration Saved', `Active server URL updated and saved across restarts:\n${persisted}`);
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleResetDefault() {
    setUrlInput(DEFAULT_SERVER_URL);
    setTestState({ status: 'idle', message: '', latency: null });
  }

  function handleSetCloud() {
    if (CLOUD_SERVER_URL) {
      setUrlInput(CLOUD_SERVER_URL);
      setTestState({ status: 'idle', message: '', latency: null });
    }
  }

  function handleSetLocal() {
    setUrlInput(LOCAL_DEV_URL);
    setTestState({ status: 'idle', message: '', latency: null });
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="server" size={20} color="#818cf8" />
              <Text style={styles.modalTitle}>Server Connection</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <AppIcon name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDesc}>
            Configure the backend host reachable from this Android device. Settings persist across restarts.
          </Text>

          <Text style={styles.fieldLabel}>Backend API Base URL</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={urlInput}
              onChangeText={text => {
                setUrlInput(text);
                setTestState({ status: 'idle', message: '', latency: null });
              }}
              style={[styles.input, { flex: 1 }]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={DEFAULT_SERVER_URL}
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Preset Buttons for Cloud and Local Development */}
          <View style={{ gap: 4, marginTop: 8 }}>
            {CLOUD_SERVER_URL ? (
              <TouchableOpacity onPress={handleSetCloud} style={styles.presetBtn}>
                <AppIcon name="cloud-outline" size={14} color="#34d399" />
                <Text style={[styles.presetBtnText, { color: '#34d399' }]}>Set to Cloud Production ({CLOUD_SERVER_URL})</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={handleSetLocal} style={styles.presetBtn}>
              <AppIcon name="wifi-outline" size={14} color="#818cf8" />
              <Text style={styles.presetBtnText}>Set to Local Wi-Fi ({LOCAL_DEV_URL})</Text>
            </TouchableOpacity>
          </View>

          {/* Test Connection Button */}
          <TouchableOpacity
            onPress={handleTest}
            disabled={testState.status === 'testing'}
            style={styles.testBtn}
          >
            {testState.status === 'testing' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <AppIcon name="pulse-outline" size={16} color="#fff" />
                <Text style={styles.testBtnText}>Test Server Connection</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Diagnostic Test Result Box */}
          {testState.status === 'success' && (
            <View style={styles.testSuccessBox}>
              <AppIcon name="checkmark-circle" size={18} color="#34d399" />
              <Text style={styles.testSuccessText}>{testState.message}</Text>
            </View>
          )}

          {testState.status === 'error' && (
            <View style={styles.testErrorBox}>
              <AppIcon name="alert-circle" size={18} color="#f87171" />
              <Text style={styles.testErrorText}>{testState.message}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.modalActionRow}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnSecondary]}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.btn, styles.btnPrimary]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Save & Persist</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ----------------- LOGIN SCREEN -----------------
function LoginScreen({ onOpenConfig }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin(eMail, pwd) {
    setLoading(true);
    try {
      await login(eMail || email, pwd || password);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.loginContainer, { paddingTop: STATUS_BAR_HEIGHT + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginBrand}>
          <View style={styles.logoBadge}>
            <AppIcon name="business" size={34} color="#fff" />
          </View>
          <Text style={styles.loginAppTitle}>WorkSpace C26</Text>
          <Text style={styles.loginAppSub}>Factory Workforce & 10 Departments Platform</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Use your factory credentials or 1-tap profiles below.</Text>

          <Text style={styles.fieldLabel}>Work Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="name@workspace.app"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            onPress={() => handleLogin()}
            disabled={loading}
            style={styles.loginSubmitBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.btnText}>Sign In</Text>
                <AppIcon name="arrow-forward" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* 1-Tap Quick Profiles */}
          <View style={styles.quickProfileHeader}>
            <View style={styles.dividerLine} />
            <Text style={styles.quickProfileTitle}>1-TAP QUICK PROFILES</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={{ gap: 8 }}>
            <ProfileQuickBtn
              title="Priya Sharma"
              badge="HR Head"
              badgeColor="#6366f1"
              email="hr@workspace.app"
              onPress={() => handleLogin('hr@workspace.app', 'hr123')}
            />
            <ProfileQuickBtn
              title="Tamil selvan"
              badge="Assembly (1st Wave)"
              badgeColor="#10b981"
              email="tamil.assembly@workspace.app"
              onPress={() => handleLogin('tamil.assembly@workspace.app', 'dept123')}
            />
            <ProfileQuickBtn
              title="Rajasekar"
              badge="Cutting (1st Wave)"
              badgeColor="#3b82f6"
              email="rajasekar.cutting@workspace.app"
              onPress={() => handleLogin('rajasekar.cutting@workspace.app', 'dept123')}
            />
            <ProfileQuickBtn
              title="Johnny"
              badge="GAP Regional Mgr"
              badgeColor="#f59e0b"
              email="johnny.gap@workspace.app"
              onPress={() => handleLogin('johnny.gap@workspace.app', 'dept123')}
            />
          </View>

          <TouchableOpacity onPress={onOpenConfig} style={styles.configLinkBtn}>
            <AppIcon name="settings-outline" size={14} color="#94a3b8" />
            <Text style={styles.configLinkText}>Server Connection Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileQuickBtn({ title, badge, badgeColor, email, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.profileBtn}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.profileName}>{title}</Text>
        <View style={[styles.profileBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '40' }]}>
          <Text style={[styles.profileBadgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      </View>
      <Text style={styles.profileEmail}>{email}</Text>
    </TouchableOpacity>
  );
}

// ----------------- HR DASHBOARD VIEW -----------------
function HrDashboardView({ token }) {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return apiRequest('/analytics/hr-overview', 'GET', null, token)
      .then(setData)
      .catch(err => console.error('Dashboard load error:', err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading && !data) return <LoadingSpinner />;

  // Guard all calculations against null, undefined, and division by zero
  const totalTargetManpower  = data?.totalTargetManpower || 0;
  const totalCurrentManpower = data?.totalCurrentManpower || 0;
  const staffedPct           = totalTargetManpower > 0 ? Math.min(100, Math.round((totalCurrentManpower / totalTargetManpower) * 100)) : 0;
  const totalOutputToday     = (data?.totalOutputToday ?? 0).toLocaleString();
  const activeBlockers       = Array.isArray(data?.activeBlockers) ? data.activeBlockers : [];
  const departments          = Array.isArray(data?.departments) ? data.departments : [];

  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" colors={['#6366f1']} />}
    >
      <View style={styles.screenHeaderRow}>
        <View>
          <Text style={styles.screenHeader}>HR Command Center</Text>
          <Text style={styles.screenSub}>Real-time monitoring across 10 departments</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <AppIcon name="refresh-outline" size={16} color="#818cf8" />
        </TouchableOpacity>
      </View>

      {/* Top 4 KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Workforce</Text>
          <Text style={styles.kpiVal}>
            {totalCurrentManpower}{' '}
            <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: 'normal' }}>/ {totalTargetManpower}</Text>
          </Text>
          <View style={styles.kpiProgressTrack}>
            <View style={[styles.kpiProgressFill, { width: `${staffedPct}%` }]} />
          </View>
          <Text style={{ fontSize: 11, color: '#818cf8', marginTop: 4, fontWeight: '600' }}>{staffedPct}% Staffed</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Today's Output</Text>
          <Text style={[styles.kpiVal, { color: '#34d399' }]}>{totalOutputToday}</Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>units produced</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>C26 Headcount</Text>
          <Text style={[styles.kpiVal, { color: '#fbbf24' }]}>1,157</Text>
          <Text style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>Planned positions</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Floor Blockers</Text>
          <Text style={[styles.kpiVal, { color: activeBlockers.length > 0 ? '#f87171' : '#34d399' }]}>
            {activeBlockers.length}
          </Text>
          <Text style={{ fontSize: 11, color: activeBlockers.length > 0 ? '#f87171' : '#94a3b8', marginTop: 4 }}>
            {activeBlockers.length > 0 ? 'Needing HR action' : 'Zero bottlenecks'}
          </Text>
        </View>
      </View>

      {/* Floor Blockers Banner */}
      {activeBlockers.length > 0 && (
        <View style={styles.blockerBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <AppIcon name="warning" size={16} color="#f87171" />
            <Text style={styles.blockerTitle}>Active Floor Staffing Bottlenecks ({activeBlockers.length})</Text>
          </View>
          {activeBlockers.map(b => (
            <View key={b.id || Math.random()} style={styles.blockerItem}>
              <Text style={styles.blockerDept}>{b.deptName} — {b.reporter || 'Supervisor'}</Text>
              <Text style={styles.blockerMsg}>{b.blocker}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 10 Departments Status List */}
      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>10 Departments Live Status</Text>
      {departments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No department telemetry received yet.</Text>
        </View>
      ) : (
        departments.map(dept => {
          const latest = dept.workLogs?.[0];
          const isDelayed = latest?.status === 'Delayed';
          return (
            <View key={dept.id} style={styles.deptCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.deptCodeBadge}>
                    <Text style={styles.deptCodeText}>{dept.code}</Text>
                  </View>
                  <View>
                    <Text style={styles.deptName}>{dept.name}</Text>
                    <Text style={styles.deptHead}>{dept.head?.name || 'Head Assigned'}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: isDelayed ? '#ef444420' : '#10b98120' }]}>
                  <Text style={{ color: isDelayed ? '#f87171' : '#34d399', fontSize: 11, fontWeight: '700' }}>
                    {latest?.status || 'Active'}
                  </Text>
                </View>
              </View>

              <View style={styles.deptMetricsRow}>
                <Text style={styles.metricItem}>
                  Staff: <Text style={{ color: '#fff', fontWeight: '700' }}>{dept.currentManpower || 0}/{dept.targetManpower || 0}</Text>
                </Text>
                <Text style={styles.metricItem}>
                  Output: <Text style={{ color: '#34d399', fontWeight: '700' }}>{(latest?.actualOutput ?? '—')}</Text> units
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ----------------- C26 MANPOWER MATRIX VIEW -----------------
function ManpowerMatrixView({ token }) {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');

  const load = useCallback(() => {
    return apiRequest('/manpower-plan', 'GET', null, token)
      .then(setData)
      .catch(err => console.error('Matrix load error:', err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading && !data) return <LoadingSpinner />;

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.position || '').toLowerCase().includes(q) ||
           (r.dept || '').toLowerCase().includes(q) ||
           (r.appointedNames || '').toLowerCase().includes(q) ||
           (r.remarks || '').toLowerCase().includes(q);
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.matrixTopBar}>
        <View style={styles.screenHeaderRow}>
          <View>
            <Text style={styles.screenHeader}>C26 Master Headcount</Text>
            <Text style={styles.screenSub}>1,157 Planned Positions across 87 Profiles</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <AppIcon name="refresh-outline" size={16} color="#818cf8" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <AppIcon name="search-outline" size={16} color="#64748b" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search role, dept, or candidate..."
            placeholderTextColor="#64748b"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <AppIcon name="close-circle" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" colors={['#6366f1']} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No matching positions found.</Text>
          </View>
        ) : (
          filtered.map(row => {
            const isAppointed = row.status === 'appointed';
            const isPending   = row.status === 'pending_doi';
            return (
              <View key={row.id} style={styles.matrixCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.matrixDept}>{row.dept}</Text>
                    <Text style={styles.matrixPos}>{row.position}</Text>
                  </View>
                  <View style={styles.matrixCountBadge}>
                    <Text style={styles.matrixCountText}>{row.plannedTotal || 0}</Text>
                    <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: '700' }}>PLANNED</Text>
                  </View>
                </View>

                {/* Monthly breakdown pills */}
                <View style={styles.matrixMonthsRow}>
                  {row.sep > 0 && <Text style={styles.monthPill}>Sep: {row.sep}</Text>}
                  {row.oct > 0 && <Text style={[styles.monthPill, styles.monthPillHighlight]}>Oct: {row.oct}</Text>}
                  {row.nov > 0 && <Text style={styles.monthPill}>Nov: {row.nov}</Text>}
                  {row.dec > 0 && <Text style={styles.monthPill}>Dec: {row.dec}</Text>}
                  {row.jan > 0 && <Text style={styles.monthPill}>Jan: {row.jan}</Text>}
                  {row.feb > 0 && <Text style={styles.monthPill}>Feb: {row.feb}</Text>}
                  {row.mar > 0 && <Text style={[styles.monthPill, { borderColor: '#3b82f640', color: '#60a5fa' }]}>Mar: {row.mar}</Text>}
                </View>

                {/* Status & Appointed names */}
                <View style={{ marginTop: 8 }}>
                  {isAppointed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <AppIcon name="checkmark-circle" size={13} color="#34d399" />
                      <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '700' }}>
                        Appointed: {row.appointedNames}
                      </Text>
                    </View>
                  )}
                  {isPending && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <AppIcon name="time-outline" size={13} color="#fbbf24" />
                      <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '700' }}>
                        Pending Johnny DOI
                      </Text>
                    </View>
                  )}
                  {row.remarks ? (
                    <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{row.remarks}</Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ----------------- DEPT HEAD FLOOR TERMINAL -----------------
function DeptHeadFloorView({ user, token }) {
  const [targetOutput, setTarget]   = useState('4500');
  const [actualOutput, setActual]   = useState('4350');
  const [staffPresent, setStaff]    = useState('28');
  const [blockers, setBlockers]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);

  async function submitReport() {
    if (!user.departmentId) {
      Alert.alert('Notice', 'No department assigned to this user profile');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/worklogs', 'POST', {
        departmentId: user.departmentId,
        shift: 'Day Shift',
        targetOutput: parseInt(targetOutput, 10) || 0,
        actualOutput: parseInt(actualOutput, 10) || 0,
        manpowerPresent: parseInt(staffPresent, 10) || 0,
        manpowerRequired: (parseInt(staffPresent, 10) || 0) + 2,
        status: blockers.trim().length > 0 ? 'Delayed' : 'On Schedule',
        blockers,
      }, token);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      setBlockers('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenHeader}>Department Floor Terminal</Text>
        <Text style={styles.screenSub}>
          Logged in: {user.name} ({user.department?.name || 'Department Floor'})
        </Text>

        {success && (
          <View style={[styles.realtimeBanner, { marginVertical: 10, borderRadius: 10 }]}>
            <AppIcon name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.realtimeBannerText}>Shift report broadcast live to HR Command Center!</Text>
          </View>
        )}

        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Submit Shift Output to HR</Text>

          <Text style={styles.fieldLabel}>Target Output (Units)</Text>
          <TextInput
            value={targetOutput}
            onChangeText={setTarget}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Actual Completed (Units)</Text>
          <TextInput
            value={actualOutput}
            onChangeText={setActual}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Workers Present on Floor Today</Text>
          <TextInput
            value={staffPresent}
            onChangeText={setStaff}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Report Floor Blocker / Staff Shortage (Optional)</Text>
          <TextInput
            value={blockers}
            onChangeText={setBlockers}
            placeholder="e.g. Need 4 additional stitchers from HR..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
          />

          <TouchableOpacity
            onPress={submitReport}
            disabled={submitting}
            style={[styles.loginSubmitBtn, { marginTop: 16 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="paper-plane-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>Send Live Report to HR</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ----------------- ONBOARDING VIEW -----------------
function OnboardingView({ token }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return apiRequest('/recruitment/candidates', 'GET', null, token)
      .then(res => setCandidates(Array.isArray(res) ? res : []))
      .catch(err => console.error('Onboarding load error:', err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  async function toggleStep(id, field, currentVal) {
    try {
      await apiRequest(`/recruitment/candidates/${id}/onboarding`, 'PATCH', {
        [field]: !currentVal,
      }, token);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  if (loading && candidates.length === 0) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" colors={['#6366f1']} />}
    >
      <View style={styles.screenHeaderRow}>
        <View>
          <Text style={styles.screenHeader}>Onboarding Checklist</Text>
          <Text style={styles.screenSub}>5-point verification for factory recruits</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <AppIcon name="refresh-outline" size={16} color="#818cf8" />
        </TouchableOpacity>
      </View>

      {candidates.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recruits currently in onboarding pipeline.</Text>
        </View>
      ) : (
        candidates.map(cand => (
          <View key={cand.id} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.cardTitle}>{cand.name}</Text>
                <Text style={{ color: '#818cf8', fontSize: 12, marginTop: 2 }}>{cand.appliedRole}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: '#4f46e520' }]}>
                <Text style={{ color: '#818cf8', fontSize: 12, fontWeight: '700' }}>
                  {cand.onboardingProgress || 0}%
                </Text>
              </View>
            </View>

            {/* 5 checklist rows */}
            <View style={{ marginTop: 12, gap: 8 }}>
              <CheckRow
                label="1. Doc Verification (ID & Certs)"
                checked={cand.docVerification}
                onPress={() => toggleStep(cand.id, 'docVerification', cand.docVerification)}
              />
              <CheckRow
                label="2. Background Check (BGV)"
                checked={cand.bgvCheck}
                onPress={() => toggleStep(cand.id, 'bgvCheck', cand.bgvCheck)}
              />
              <CheckRow
                label="3. Safety & PPE Induction"
                checked={cand.safetyInductionDone}
                onPress={() => toggleStep(cand.id, 'safetyInductionDone', cand.safetyInductionDone)}
              />
              <CheckRow
                label="4. Workstation & Floor Badge"
                checked={cand.workstationAssigned}
                onPress={() => toggleStep(cand.id, 'workstationAssigned', cand.workstationAssigned)}
              />
              <CheckRow
                label="5. Department Mentor Assigned"
                checked={cand.mentorAssigned}
                onPress={() => toggleStep(cand.id, 'mentorAssigned', cand.mentorAssigned)}
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function CheckRow({ label, checked, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkBox, checked && { backgroundColor: '#10b981', borderColor: '#10b981' }]}>
        {checked && <AppIcon name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={[styles.checkLabel, checked && { color: '#e2e8f0', fontWeight: '600' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ----------------- DIRECTIVES VIEW -----------------
function DirectivesView({ user, token }) {
  const [directives, setDirs]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle]           = useState('');
  const [content, setContent]       = useState('');
  const [sending, setSending]       = useState(false);

  const load = useCallback(() => {
    return apiRequest('/directives', 'GET', null, token)
      .then(res => setDirs(Array.isArray(res) ? res : []))
      .catch(err => console.error('Directives load error:', err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  async function postDirective() {
    if (!title.trim() || !content.trim()) return;
    setSending(true);
    try {
      await apiRequest('/directives', 'POST', {
        title,
        content,
        category: 'Recruitment Milestone',
        priority: 'High',
      }, token);
      setTitle('');
      setContent('');
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  }

  if (loading && directives.length === 0) return <LoadingSpinner />;

  const isHr = user.role === 'hr_admin' || user.role === 'admin';

  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" colors={['#6366f1']} />}
    >
      <View style={styles.screenHeaderRow}>
        <View>
          <Text style={styles.screenHeader}>HR Directives & Notices</Text>
          <Text style={styles.screenSub}>Plant broadcasts & workforce directives</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <AppIcon name="refresh-outline" size={16} color="#818cf8" />
        </TouchableOpacity>
      </View>

      {/* HR Publish Box */}
      {isHr && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Broadcast New Directive</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Directive title..."
            placeholderTextColor="#64748b"
            style={styles.input}
          />
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Details to broadcast across plant..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={2}
            style={[styles.input, { height: 65, textAlignVertical: 'top' }]}
          />
          <TouchableOpacity onPress={postDirective} disabled={sending} style={styles.loginSubmitBtn}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="megaphone-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>Broadcast to Plant</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <View style={{ marginTop: 12, gap: 10 }}>
        {directives.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No plant directives issued yet.</Text>
          </View>
        ) : (
          directives.map(d => (
            <View key={d.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.directiveCategoryBadge}>
                  <Text style={styles.directiveCategoryText}>{d.category}</Text>
                </View>
                <Text style={{ color: '#64748b', fontSize: 11 }}>
                  {new Date(d.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.cardTitle, { marginTop: 8 }]}>{d.title}</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4, lineHeight: 18 }}>{d.content}</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 10 }}>Issued by {d.author?.name || 'HR Team'}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function TabItem({ label, active, onPress, icon, activeIcon }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
      <View style={[styles.tabIconWrapper, active && styles.tabIconWrapperActive]}>
        <AppIcon
          name={active ? (activeIcon || icon) : icon}
          size={20}
          color={active ? '#818cf8' : '#64748b'}
        />
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function LoadingSpinner() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 12 }}>Loading factory data...</Text>
    </View>
  );
}

// ----------------- STYLES -----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  mainLayout: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  screenContainer: {
    flex: 1,
  },
  realtimeBanner: {
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  realtimeBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socketDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerSub: {
    color: '#818cf8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 10 : 18,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tabIconWrapperActive: {
    backgroundColor: '#4f46e520',
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#818cf8',
    fontWeight: '700',
  },
  screenScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  screenHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenHeader: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  screenSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
  },
  kpiLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  kpiVal: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  kpiProgressTrack: {
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  kpiProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  blockerBanner: {
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444435',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  blockerTitle: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '800',
  },
  blockerItem: {
    backgroundColor: '#090d16',
    borderRadius: 8,
    padding: 9,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  blockerDept: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  blockerMsg: {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  deptCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  deptCodeBadge: {
    backgroundColor: '#4f46e520',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#4f46e540',
  },
  deptCodeText: {
    color: '#818cf8',
    fontWeight: '800',
    fontSize: 11,
  },
  deptName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  deptHead: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  deptMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 10,
    paddingTop: 8,
  },
  metricItem: {
    color: '#94a3b8',
    fontSize: 12,
  },
  matrixTopBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#090d16',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
  matrixCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  matrixDept: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  matrixPos: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  matrixCountBadge: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  matrixCountText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  matrixMonthsRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  monthPill: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  monthPillHighlight: {
    borderColor: '#059669',
    color: '#34d399',
    backgroundColor: '#064e3b30',
  },
  card: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  cardSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginSubmitBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  quickProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  quickProfileTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileBtn: {
    backgroundColor: '#131d31',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#26344b',
  },
  profileName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  profileEmail: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  profileBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  profileBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  configLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    alignSelf: 'center',
    padding: 6,
  },
  configLinkText: {
    color: '#94a3b8',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkLabel: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
  },
  directiveCategoryBadge: {
    backgroundColor: '#4f46e520',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  directiveCategoryText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  loginContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    justifyContent: 'center',
    minHeight: '100%',
  },
  loginBrand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginAppTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  loginAppSub: {
    color: '#818cf8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000b3',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
  },
  presetBtnText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '600',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  testBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  testSuccessBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#10b98115',
    borderWidth: 1,
    borderColor: '#10b98140',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  testSuccessText: {
    color: '#34d399',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  testErrorBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444440',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  testErrorText: {
    color: '#f87171',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
