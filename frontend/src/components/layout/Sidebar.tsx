'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard',    icon: '📊', label: 'Dashboard'    },
  { href: '/transactions', icon: '💳', label: 'Transactions' },
  { href: '/advisor',      icon: '🤖', label: 'AI Advisor'   },
  { href: '/analytics',    icon: '📈', label: 'Analytics'    },
  { href: '/reports',      icon: '📄', label: 'Reports'      },
  { href: '/settings',     icon: '⚙️', label: 'Settings'     },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
      background: '#070e1f', borderRight: '1px solid rgba(59,140,255,.15)',
      display: 'flex', flexDirection: 'column', zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(59,140,255,.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#0d52cc,#00d4ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>WealthSense</div>
            <div style={{ fontSize: 10, color: '#4a6a8a', fontFamily: 'monospace' }}>AI Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV.map(({ href, icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, marginBottom: 3,
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
              background: active ? 'rgba(59,140,255,.15)' : 'transparent',
              color: active ? '#fff' : '#8ba8cc',
              border: active ? '1px solid rgba(59,140,255,.3)' : '1px solid transparent',
              transition: 'all .15s',
            }}>
              <span>{icon}</span>
              {label}
              {label === 'AI Advisor' && (
                <span style={{ marginLeft: 'auto', fontSize: 9, background: 'rgba(59,140,255,.3)', color: '#a8d4ff', padding: '1px 5px', borderRadius: 4 }}>GPT-4</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(59,140,255,.12)' }}>
        <button
          onClick={() => { localStorage.removeItem('ws_token'); window.location.href = '/login'; }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '9px 12px', borderRadius: 10, fontSize: 13,
            background: 'transparent', border: 'none', color: '#8ba8cc',
            cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
