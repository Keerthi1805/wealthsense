'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]   = useState<'login'|'register'>('login');
  const [loading, setLoad] = useState(false);
  const [form, setForm]   = useState({ email: '', password: '', full_name: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoad(true);
    try {
      const res = mode === 'login'
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form);
      localStorage.setItem('ws_token', res.data.access_token);
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Authentication failed';
      toast.error(msg);
    } finally { setLoad(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 13px', borderRadius: 10, fontSize: 14,
    background: '#0a1628', border: '1px solid rgba(59,140,255,.2)',
    color: '#f0f6ff', outline: 'none', fontFamily: 'inherit', marginBottom: 14,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#060c1a' }}>
      {/* Left panel */}
      <div style={{ background: '#070e1f', borderRight: '1px solid rgba(59,140,255,.12)', padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#0d52cc,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚡</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>WealthSense AI</div>
              <div style={{ fontSize: 11, color: '#4a6a8a', fontFamily: 'monospace' }}>Intelligent Finance Platform</div>
            </div>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, marginBottom: 16, background: 'linear-gradient(135deg,#fff,#a8d4ff,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Your Intelligent Financial Co-Pilot
          </h1>
          <p style={{ fontSize: 15, color: '#8ba8cc', lineHeight: 1.6 }}>
            GPT-4 powered insights, real-time anomaly detection, and personalized savings recommendations.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['🧠 RAG-powered Financial Q&A', '🏷️ Auto-categorization (94% accuracy)', '🛡️ Fraud & anomaly detection', '📈 90-day budget forecasting', '🔁 Subscription intelligence', '📄 AI monthly reports'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#8ba8cc' }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#0a1628', border: '1px solid rgba(59,140,255,.18)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {(['login','register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode===m ? 'linear-gradient(135deg,#0941a8,#0d52cc)' : 'transparent',
                color: mode===m ? '#fff' : '#8ba8cc', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}>{m === 'login' ? 'Sign In' : 'Register'}</button>
            ))}
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 13, color: '#8ba8cc', marginBottom: 24 }}>
            {mode === 'login' ? 'Sign in to continue' : 'Free to get started'}
          </p>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <input style={inp} type="text" placeholder="Full Name" value={form.full_name} onChange={set('full_name')} required />
            )}
            <input style={inp} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
            <input style={inp} type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 6 }}>
              {loading ? '...' : (mode === 'login' ? 'Sign In →' : 'Create Account →')}
            </button>
          </form>

          {/* Demo */}
          <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(59,140,255,.08)', borderRadius: 10, border: '1px solid rgba(59,140,255,.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#3b8cff', marginBottom: 8 }}>🎯 Demo Credentials</div>
            <div style={{ fontSize: 12, color: '#8ba8cc', fontFamily: 'monospace' }}>demo@wealthsense.ai</div>
            <div style={{ fontSize: 12, color: '#8ba8cc', fontFamily: 'monospace' }}>demo1234</div>
            <button onClick={() => { setForm({ email: 'demo@wealthsense.ai', password: 'demo1234', full_name: '' }); setMode('login'); }}
              style={{ fontSize: 11, color: '#3b8cff', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, fontFamily: 'inherit' }}>
              Fill demo credentials →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
