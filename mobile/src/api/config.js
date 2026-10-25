// Mobile API Configuration
// Supports production cloud HTTPS URL via Expo public environment variables,
// with graceful fallback to LAN IP for local WiFi development.
export const CLOUD_SERVER_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_SERVER_URL || null;
export const LOCAL_DEV_URL    = 'http://192.168.31.177:4000';
export const DEFAULT_SERVER_URL = CLOUD_SERVER_URL || LOCAL_DEV_URL;
const STORAGE_KEY = '@workspace_c26_server_url';

let AsyncStorage = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default || require('@react-native-async-storage/async-storage');
} catch (e) {
  // Graceful in-memory fallback if module is pending native build
}

let currentServerUrl = DEFAULT_SERVER_URL;

// Normalize URL (strip trailing slashes, enforce protocol)
export function sanitizeUrl(url) {
  if (!url) return DEFAULT_SERVER_URL;
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  return cleaned;
}

export function getServerUrl() {
  return currentServerUrl;
}

export function setServerUrl(url) {
  currentServerUrl = sanitizeUrl(url);
  return currentServerUrl;
}

// Persist server URL to device storage
export async function saveServerUrl(url) {
  const sanitized = setServerUrl(url);
  try {
    if (AsyncStorage?.setItem) {
      await AsyncStorage.setItem(STORAGE_KEY, sanitized);
    }
  } catch (err) {
    console.warn('Could not persist server URL to storage:', err);
  }
  return sanitized;
}

// Load persisted server URL on app initialization
export async function loadSavedServerUrl() {
  try {
    if (AsyncStorage?.getItem) {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && saved.trim()) {
        currentServerUrl = sanitizeUrl(saved);
        return currentServerUrl;
      }
    }
  } catch (err) {
    console.warn('Could not load server URL from storage:', err);
  }
  return currentServerUrl;
}

// Test connectivity to the backend server with timeout
export async function testServerConnection(targetUrl = null) {
  const baseUrl = sanitizeUrl(targetUrl || currentServerUrl);
  const testUrl = `${baseUrl}/api/health`;
  const startTime = Date.now();

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

  try {
    const res = await fetch(testUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `Server replied with HTTP status ${res.status}`,
        url: baseUrl,
        latencyMs,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      ok: true,
      status: res.status,
      service: data.service || 'Active',
      realtime: data.realtime || 'Available',
      database: data.database || 'Connected',
      latencyMs,
      url: baseUrl,
    };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
    return {
      ok: false,
      error: isTimeout
        ? `Connection timed out after 6s. Ensure backend is running and phone is on the same Wi-Fi as ${baseUrl}.`
        : `Cannot reach server at ${baseUrl}. (${err?.message || 'Network request failed'})`,
      url: baseUrl,
      latencyMs,
    };
  }
}

// Standard authenticated / unauthenticated API request helper
export async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const baseUrl = getServerUrl();
  const url = `${baseUrl}/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

  const options = {
    method,
    headers,
    signal: controller?.signal,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, options);
    if (timeoutId) clearTimeout(timeoutId);
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    const isTimeout = error?.name === 'AbortError' || error?.message?.includes('aborted');
    throw new Error(
      isTimeout
        ? `Request timed out connecting to ${baseUrl}. Check your Wi-Fi and server status.`
        : `Cannot reach the server at ${baseUrl}. Ensure backend is running and reachable from this device.`
    );
  }

  let data = {};
  try {
    data = await res.json();
  } catch (error) {
    throw new Error(`The server returned an invalid response (HTTP ${res.status}). Check the backend logs.`);
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data;
}

