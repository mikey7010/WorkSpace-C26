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
  BackHandler,
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
import RmWorkPlan from './src/screens/recruitment/WorkPlan';
import RmSummary from './src/screens/recruitment/Summary';
import RmCandidates from './src/screens/recruitment/Candidates';
import CommandCenter from './src/screens/CommandCenter';
import ManpowerMatrix from './src/screens/ManpowerMatrix';
import DepartmentsHub from './src/screens/DepartmentsHub';
import WorkReports from './src/screens/WorkReports';
import Recruitment from './src/screens/Recruitment';
import Onboarding from './src/screens/Onboarding';
import Directives from './src/screens/Directives';
import TaskBoard from './src/screens/TaskBoard';
import DeptDashboard from './src/screens/DeptDashboard';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
const AuthContext = createContext(null);

function AppIcon({ name, size = 18, color = '#fff', style }) {
  try {
    return <Ionicons name={name} size={size} color={color} style={style} />;
  } catch (e) {
    return null;
  }
}


// ----------------- NAVIGATION (same sections as the website sidebar) -----------------
const HR_NAV = [
  { key: 'dashboard',   label: 'Command Center',      short: 'Command',  icon: 'home-outline',          active: 'home' },
  { key: 'matrix',      label: 'C26 Manpower Matrix', short: 'Matrix',   icon: 'list-outline',          active: 'list' },
  { key: 'departments', label: 'Factory Departments', short: 'Depts',    icon: 'business-outline',      active: 'business' },
  { key: 'reports',     label: 'Daily Work Reports',  short: 'Reports',  icon: 'document-text-outline', active: 'document-text' },
  { key: 'recruitment', label: 'Recruitment Demands', short: 'Recruit',  icon: 'people-outline',        active: 'people' },
  { key: 'onboarding',  label: 'Onboarding Tracker',  short: 'Onboard',  icon: 'clipboard-outline',     active: 'clipboard' },
  { key: 'directives',  label: 'HR Broadcasts',       short: 'Broadcast', icon: 'megaphone-outline',    active: 'megaphone' },
  { key: 'tasks',       label: 'Task Board',          short: 'Tasks',    icon: 'checkbox-outline',      active: 'checkbox' },
  { section: 'Recruitment Management' },
  { key: 'rm-plan',       label: 'Work / Recruitment Plan', short: 'Plan',       icon: 'grid-outline',          active: 'grid' },
  { key: 'rm-summary',    label: 'Summary',                 short: 'Summary',    icon: 'bar-chart-outline',     active: 'bar-chart' },
  { key: 'rm-candidates', label: 'Candidate Tracking',      short: 'Candidates', icon: 'person-outline',        active: 'person' },
];
const DEPT_NAV = [
  { key: 'dept',        label: 'My Department Live',   short: 'My Dept', icon: 'business-outline',      active: 'business' },
  { key: 'matrix',      label: 'C26 Plant Matrix',     short: 'Matrix',  icon: 'list-outline',          active: 'list' },
  { key: 'reports',     label: 'Department Logs',      short: 'Logs',    icon: 'document-text-outline', active: 'document-text' },
  { key: 'onboarding',  label: 'New Recruits & Hires', short: 'Recruits', icon: 'people-outline',       active: 'people' },
  { key: 'directives',  label: 'HR Directives',        short: 'Directives', icon: 'megaphone-outline',  active: 'megaphone' },
  { key: 'tasks',       label: 'My Tasks',             short: 'Tasks',   icon: 'checkbox-outline',      active: 'checkbox' },
  { section: 'Recruitment Management' },
  { key: 'rm-plan',       label: 'Work / Recruitment Plan', short: 'Plan',       icon: 'grid-outline',          active: 'grid' },
  { key: 'rm-summary',    label: 'Summary',                 short: 'Summary',    icon: 'bar-chart-outline',     active: 'bar-chart' },
  { key: 'rm-candidates', label: 'Candidate Tracking',      short: 'Candidates', icon: 'person-outline',        active: 'person' },
];
const HR_TABS = ['dashboard', 'matrix', 'rm-plan', 'rm-candidates'];
const DEPT_TABS = ['dept', 'rm-plan', 'rm-summary', 'reports'];

export default function App() {
  const [user, setUser]             = useState(null);
  const [token, setToken]           = useState(null);
  const [currentTab, setTab]        = useState('dashboard');
  const [serverHost, setHost]       = useState(getServerUrl());
  const [showConfig, setShowConfig] = useState(false);
  const [liveNotice, setLiveNotice] = useState(null);
  const [socketOnline, setOnline]   = useState(false);
  const [refreshTick, setTick]      = useState(0);
  const [drawerOpen, setDrawer]     = useState(false);
  const [screenParams, setParams]   = useState(null);

  useEffect(() => {
    loadSavedServerUrl().then(saved => { if (saved) setHost(saved); });
  }, []);

  // Realtime events → toast + refresh the open screen
  useEffect(() => {
    let socket;
    try {
      socket = io(getServerUrl(), {
        transports: ['websocket', 'polling'], timeout: 10000, reconnection: true,
        reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 5000,
      });
      socket.on('connect', () => setOnline(true));
      socket.on('disconnect', () => setOnline(false));
      socket.on('connect_error', () => setOnline(false));
      socket.on('directive:new', dir => {
        setLiveNotice(`📢 HR Directive: "${dir.title}"`);
        setTimeout(() => setLiveNotice(null), 6000);
        setTick(t => t + 1);
      });
      socket.on('worklog:new', log => {
        setLiveNotice(`🏭 Work Report: ${log.department?.name || 'Department'} (${log.actualOutput || 0} units)`);
        setTimeout(() => setLiveNotice(null), 6000);
        setTick(t => t + 1);
      });
      socket.on('hiring:update', () => setTick(t => t + 1));
    } catch (e) {
      setOnline(false);
    }
    return () => socket && socket.disconnect();
  }, [serverHost]);

  const isHr = !!user && (user.role === 'hr_admin' || user.role === 'admin');
  const nav = isHr ? HR_NAV : DEPT_NAV;
  const home = isHr ? 'dashboard' : 'dept';

  // Android back: close drawer, then go back to the home section
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawerOpen) { setDrawer(false); return true; }
      if (user && currentTab !== home) { setTab(home); return true; }
      return false;
    });
    return () => sub.remove();
  }, [drawerOpen, currentTab, user, home]);

  async function login(email, password) {
    const res = await apiRequest('/auth/login', 'POST', { email, password });
    setUser(res.user);
    setToken(res.token);
    setTab(res.user.role === 'hr_admin' || res.user.role === 'admin' ? 'dashboard' : 'dept');
    return res.user;
  }

  function logout() {
    setDrawer(false);
    setUser(null);
    setToken(null);
  }

  const api = useCallback((path, method = 'GET', body = null) => apiRequest(path, method, body, token), [token]);
  const current = nav.find(n => n.key === currentTab) || nav.find(n => n.key);
  const navigate = (key, params = null) => { setParams(params); setTab(key); setDrawer(false); };
  const screenProps = { api, user, token, isHr, refreshSignal: refreshTick, navigate, params: screenParams };
  const tabKeys = isHr ? HR_TABS : DEPT_TABS;

  function go(key) { setParams(null); setTab(key); setDrawer(false); }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <SafeAreaView style={styles.container}>
        <ExpoStatusBar style="light" />
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={Platform.OS === 'android'} />

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
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + 10 : 12 }]}>
              <TouchableOpacity onPress={() => setDrawer(true)} style={[styles.headerIconBtn, { marginRight: 12 }]} accessibilityLabel="Open menu">
                <AppIcon name="menu" size={20} color="#e2e8f0" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle} numberOfLines={1}>{current.label}</Text>
                  <View style={[styles.socketDot, { backgroundColor: socketOnline ? '#10b981' : '#f59e0b' }]} />
                </View>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {isHr ? 'HR Executive Command' : (user.department?.name || 'Department Hub')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowConfig(true)} style={styles.headerIconBtn} accessibilityLabel="Server connection settings">
                <AppIcon name="server-outline" size={17} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.screenContainer}>
              {currentTab === 'dashboard'   && <CommandCenter {...screenProps} />}
              {currentTab === 'dept'        && <DeptDashboard {...screenProps} />}
              {currentTab === 'matrix'      && <ManpowerMatrix {...screenProps} />}
              {currentTab === 'rm-plan'       && <RmWorkPlan {...screenProps} />}
              {currentTab === 'rm-summary'    && <RmSummary {...screenProps} />}
              {currentTab === 'rm-candidates' && <RmCandidates {...screenProps} />}
              {currentTab === 'departments' && <DepartmentsHub {...screenProps} />}
              {currentTab === 'reports'     && <WorkReports {...screenProps} />}
              {currentTab === 'recruitment' && <Recruitment {...screenProps} />}
              {currentTab === 'onboarding'  && <Onboarding {...screenProps} />}
              {currentTab === 'directives'  && <Directives {...screenProps} />}
              {currentTab === 'tasks'       && <TaskBoard {...screenProps} />}
            </View>

            <View style={styles.bottomNav}>
              {tabKeys.map(k => {
                const n = nav.find(x => x.key === k);
                return <TabItem key={k} label={n.short} active={currentTab === k} onPress={() => go(k)} icon={n.icon} activeIcon={n.active} />;
              })}
              <TabItem label="More" active={!tabKeys.includes(currentTab)} onPress={() => setDrawer(true)} icon="grid-outline" activeIcon="grid" />
            </View>
          </View>
        )}

        {user && (
          <SideDrawer
            visible={drawerOpen}
            onClose={() => setDrawer(false)}
            nav={nav}
            current={currentTab}
            onSelect={go}
            user={user}
            isHr={isHr}
            onLogout={logout}
          />
        )}

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

// ----------------- SIDE DRAWER (mirrors website sidebar) -----------------
function SideDrawer({ visible, onClose, nav, current, onSelect, user, isHr, onLogout }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.drawerOverlay}>
        <View style={[styles.drawer, { paddingTop: (Platform.OS === 'android' ? STATUS_BAR_HEIGHT : 0) + 18 }]}>
          <View style={styles.drawerBrand}>
            <View style={styles.drawerLogo}>
              <AppIcon name="business" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.drawerBrandTitle}>WorkSpace HR</Text>
              <Text style={styles.drawerBrandSub} numberOfLines={1}>
                {isHr ? 'HR EXECUTIVE COMMAND' : (user.department?.name || 'DEPARTMENT HUB').toUpperCase()}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }}>
            {nav.map(item => {
              if (item.section) return <Text key={item.section} style={styles.drawerSection}>{item.section.toUpperCase()}</Text>;
              const active = item.key === current;
              return (
                <TouchableOpacity key={item.key} onPress={() => onSelect(item.key)} style={[styles.drawerItem, active && styles.drawerItemActive]} activeOpacity={0.75}>
                  <AppIcon name={active ? item.active : item.icon} size={17} color={active ? '#fff' : '#94a3b8'} />
                  <Text style={[styles.drawerItemText, active && { color: '#fff' }]}>{item.label}</Text>
                  {item.key === 'rm-candidates' && !active ? <Text style={styles.drawerNew}>NEW</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.drawerFooter}>
            <View style={styles.drawerUser}>
              <View style={[styles.drawerAvatar, { backgroundColor: ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16'][(user.id || 1) % 10] }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                  {(user.name || 'U').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{user.name}</Text>
                <Text style={{ color: '#818cf8', fontSize: 11 }} numberOfLines={1}>{user.designation || (isHr ? 'HR Executive' : 'Department Head')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onLogout} style={styles.drawerLogout}>
              <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 13 }}>Sign Out</Text>
              <AppIcon name="log-out-outline" size={16} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} accessibilityLabel="Close menu" />
      </View>
    </Modal>
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


// ----------------- STYLES -----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  mainLayout: {
    flex: 1,
    backgroundColor: '#020617',
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
    backgroundColor: '#020617',
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
    backgroundColor: '#020617',
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

  drawerOverlay: { flex: 1, flexDirection: 'row', backgroundColor: '#000000a6' },
  drawer: { width: 290, maxWidth: '82%', backgroundColor: '#0f172a', borderRightWidth: 1, borderRightColor: '#1e293b', paddingHorizontal: 14, paddingBottom: 16 },
  drawerBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22, paddingHorizontal: 4 },
  drawerLogo: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  drawerBrandTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  drawerBrandSub: { color: '#818cf8', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginTop: 1 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  drawerItemActive: { backgroundColor: '#4f46e5' },
  drawerSection: { color: '#818cf8cc', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 14, marginBottom: 2, paddingHorizontal: 12 },
  drawerItemText: { color: '#94a3b8', fontSize: 13.5, fontWeight: '700', flex: 1 },
  drawerNew: { color: '#6ee7b7', fontSize: 9, fontWeight: '900', backgroundColor: '#10b98126', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  drawerFooter: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12, marginTop: 8 },
  drawerUser: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, backgroundColor: '#1e293b66', borderWidth: 1, borderColor: '#1e293b', marginBottom: 8 },
  drawerAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  drawerLogout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: '#ef44441a' },
});
