import axios from 'axios';
import useSWR from 'swr';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({ baseURL: `${BASE}/api/v1`, timeout: 30000 });

api.interceptors.request.use((c) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('ws_token');
    if (t) c.headers.Authorization = `Bearer ${t}`;
  }
  return c;
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ws_token');
      window.location.href = '/login';
    }
    return Promise.reject(e);
  }
);

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export const authApi = {
  register: (d: { email: string; password: string; full_name: string }) => api.post('/auth/register', d),
  login:    (d: { email: string; password: string })                    => api.post('/auth/login', d),
  me:       ()                                                           => api.get('/auth/me'),
};

export function useDashboard() {
  return useSWR('/analytics/dashboard', fetcher, { refreshInterval: 60000 });
}

export function useTransactions(params?: Record<string, unknown>) {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return useSWR(`/transactions/${qs}`, fetcher);
}

export function useSpendingVelocity(days = 30) {
  return useSWR(`/analytics/spending-velocity?days=${days}`, fetcher);
}

export function useSubscriptions() {
  return useSWR('/advisor/subscriptions', fetcher);
}

export function useChatHistory() {
  return useSWR('/advisor/chat/history', fetcher);
}

export function useReports() {
  return useSWR('/reports/', fetcher);
}

export const ingestionApi = {
  uploadCSV: (file: File, accountId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (accountId) form.append('account_id', accountId);
    return api.post('/ingest/csv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const reportsApi = {
  generate: (month: number, year: number) => api.post(`/reports/generate?month=${month}&year=${year}`),
};

export async function streamChat(
  message: string,
  onToken: (t: string) => void,
  onDone: () => void,
  onError: (e: string) => void
) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ws_token') : null;
  try {
    const res = await fetch(`${BASE}/api/v1/advisor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify({ message, stream: true }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader  = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const d = t.slice(5).trim();
        if (d === '[DONE]') { onDone(); return; }
        try { const p = JSON.parse(d); if (p.token) onToken(p.token); } catch {}
      }
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Error');
  }
}
