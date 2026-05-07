import * as SecureStore from 'expo-secure-store';

const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://smooth-chefs-learn.loca.lt';
const API_BASE_URL = RAW_API_BASE_URL.trim().replace(/\/+$/, '').replace(/\/api$/, '');
const ACCESS_TOKEN_KEY = 'api_access_token';
const REFRESH_TOKEN_KEY = 'api_refresh_token';
const ENABLE_API_LOGS = process.env.EXPO_PUBLIC_API_LOGS !== 'false';

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const maskSensitiveValue = (key: string, value: any) => {
  if (value === null || value === undefined) return value;

  const normalizedKey = key.toLowerCase();
  if (
    normalizedKey.includes('password') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('authorization')
  ) {
    return '[REDACTED]';
  }

  return value;
};

const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(maskSensitiveData);

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'object' ? maskSensitiveData(value) : maskSensitiveValue(key, value)
    ])
  );
};

const parseBodyForLog = (body: BodyInit | null | undefined) => {
  if (typeof body !== 'string') return body ? '[non-string body]' : undefined;

  try {
    return maskSensitiveData(JSON.parse(body));
  } catch {
    return body;
  }
};

const apiLog = (label: string, details: Record<string, any>) => {
  if (!ENABLE_API_LOGS) return;
  console.log(`[API] ${label}`, details);
};

apiLog('config', {
  rawBaseUrl: RAW_API_BASE_URL,
  normalizedBaseUrl: API_BASE_URL
});

export async function getAccessToken() {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveAuthTokens(token: string, refreshToken: string) {
  if (token) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  }
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearAuthTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  const url = buildApiUrl('/api/auth/refresh');
  apiLog('refresh request', { method: 'POST', url });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  apiLog('refresh response', { status: response.status, ok: response.ok, url });

  if (!response.ok) {
    await clearAuthTokens();
    return false;
  }

  const payload = await response.json().catch(() => null);
  if (!payload?.success || !payload?.data) {
    await clearAuthTokens();
    return false;
  }

  await saveAuthTokens(payload.data.token, payload.data.refreshToken);
  return true;
}

async function apiFetch(path: string, options: RequestInit & { _retry?: boolean } = {}) {
  const token = await getAccessToken();
  const method = options.method || 'GET';
  const url = buildApiUrl(path);
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  } as Record<string, string>;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Create abort controller with 15 second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    apiLog('request', {
      method,
      path,
      url,
      retry: Boolean(options._retry),
      hasAccessToken: Boolean(token),
      headers: maskSensitiveData(headers),
      body: parseBodyForLog(options.body)
    });

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401 && !options._retry) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        return apiFetch(path, { ...options, _retry: true });
      }
    }

    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    apiLog('response', {
      method,
      path,
      url,
      status: response.status,
      ok: response.ok,
      body: maskSensitiveData(payload ?? text)
    });

    if (!response.ok) {
      if (response.status === 401) {
        await clearAuthTokens();
      }
      const message = payload?.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } catch (error: any) {
    clearTimeout(timeoutId);
    apiLog('error', {
      method,
      path,
      url,
      name: error?.name,
      message: error?.message
    });
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server is not responding. Please check your connection and try again.');
    }
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error - unable to reach the server. Please check your internet connection.');
    }
    
    throw error;
  }
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const payload = await apiFetch(path, { method: 'GET' });
  return payload?.data;
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const payload = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return payload?.data;
}

export async function apiPut<T = any>(path: string, body: any): Promise<T> {
  const payload = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
  return payload?.data;
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const payload = await apiFetch(path, { method: 'DELETE' });
  return payload?.data;
}
