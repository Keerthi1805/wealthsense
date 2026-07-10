'use client';
import { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { streamChat } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface Msg { role: 'user'|'assistant'; content: string; loading?: boolean; }

const PROMPTS = [
  'Where did I spend the most money last month?',
  'Am I on track with my savings?',
  'Which subscriptions should I cancel?',
  'Give me 3 ways to save $200/month',
  'Summarize my biggest financial risks',
];

export default function AdvisorPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'assistant',
    content: '👋 Hi! I\'m your **WealthSense AI Advisor** powered by GPT-4.\n\nAsk me anything about your finances — spending patterns, savings, budget forecasts, or subscriptions.',
  }]);
  const [input, setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(text = input) {
    const msg = text.trim();
    if (!msg || sending) return;
    setInput(''); setSending(true);
    setMsgs(p => [...p, { role: 'user', content: msg }, { role: 'assistant', content: '', loading: true }]);
    let full = '';
    await streamChat(msg,
      token => { full += token; setMsgs(p => { const n=[...p]; n[n.length-1]={role:'assistant',content:full}; return n; }); },
      ()    => { setMsgs(p => { const n=[...p]; n[n.length-1]={role:'assistant',content:full,loading:false}; return n; }); setSending(false); },
      err   => { setMsgs(p => { const n=[...p]; n[n.length-1]={role:'assistant',content:`⚠️ ${err}`}; return n; }); setSending(false); }
    );
  }

  return (
    <div style={{ display:'flex', background:'var(--bg-base)', minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ marginLeft:220, flex:1, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid rgba(59,140,255,.12)', background:'#070e1f', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#0d52cc,#00d4ff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🤖</div>
          <div>
            <h1 style={{ fontSize:14,fontWeight:700,color:'#fff' }}>AI Financial Advisor</h1>
            <p style={{ fontSize:11,color:'var(--text-m)' }}>GPT-4 · Real transaction context</p>
          </div>
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:16 }}>
          {msgs.map((m,i) => (
            <div key={i} style={{ display:'flex',gap:10,justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
              {m.role==='assistant' && (
                <div style={{ width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#0941a8,#00d4ff)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>🤖</div>
              )}
              <div style={{
                maxWidth:'72%',padding:'12px 16px',borderRadius:14,fontSize:13,color:'#fff',
                background: m.role==='user'?'linear-gradient(135deg,#0941a8,#0d52cc)':'var(--bg-card)',
                border: m.role==='assistant'?'1px solid var(--border)':'none',
              }}>
                {m.loading && !m.content
                  ? <span style={{ color:'var(--text-m)' }}>Thinking...</span>
                  : m.role==='assistant'
                    ? <div className="prose-ai"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                    : <p>{m.content}</p>
                }
              </div>
              {m.role==='user' && (
                <div style={{ width:30,height:30,borderRadius:8,background:'rgba(59,140,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>👤</div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {msgs.length < 3 && (
          <div style={{ padding:'0 24px 12px',display:'flex',flexWrap:'wrap',gap:8 }}>
            {PROMPTS.map(p => (
              <button key={p} onClick={() => send(p)} style={{
                fontSize:11,padding:'5px 11px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',
                background:'rgba(59,140,255,.08)',border:'1px solid rgba(59,140,255,.2)',color:'#a8d4ff',
              }}>{p}</button>
            ))}
          </div>
        )}

        <div style={{ padding:'12px 24px 16px',borderTop:'1px solid rgba(59,140,255,.12)',display:'flex',gap:10 }}>
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about your spending, savings, or finances..."
            rows={1} disabled={sending}
            style={{
              flex:1,padding:'9px 13px',borderRadius:10,fontSize:13,background:'var(--bg-card)',
              border:'1px solid var(--border)',color:'var(--text-1)',outline:'none',
              fontFamily:'inherit',resize:'none',minHeight:42,maxHeight:120,
            }}
          />
          <button onClick={() => send()} disabled={!input.trim()||sending} className="btn-primary" style={{ padding:'0 18px',flexShrink:0 }}>
            {sending ? '...' : '→'}
          </button>
        </div>
      </main>
    </div>
  );
}
