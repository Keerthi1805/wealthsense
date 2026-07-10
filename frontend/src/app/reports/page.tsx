'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useReports, reportsApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const fmt = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

const STATUS_BADGE: Record<string,{cls:string;icon:string}> = {
  queued:     { cls:'badge-yellow', icon:'⏳' },
  generating: { cls:'badge-blue',   icon:'⚙️' },
  ready:      { cls:'badge-green',  icon:'✅' },
  failed:     { cls:'badge-red',    icon:'❌' },
};

export default function ReportsPage() {
  const { data: reports, isLoading, mutate } = useReports();
  const [selected, setSelected] = useState<string|null>(null);
  const [generating, setGen]    = useState(false);

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  async function generate() {
    setGen(true);
    try {
      await reportsApi.generate(month, year);
      toast.success('Report queued! Check back in ~30 seconds.');
      mutate();
    } catch { toast.error('Failed to queue report'); }
    finally { setGen(false); }
  }

  const sel = Array.isArray(reports) ? reports.find((r:{id:string}) => r.id === selected) : null;

  return (
    <div style={{ display:'flex',background:'var(--bg-base)',minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ marginLeft:220,flex:1,padding:32 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,color:'#fff' }}>AI Financial Reports</h1>
            <p style={{ fontSize:13,color:'var(--text-m)',marginTop:3 }}>GPT-4 generated monthly narratives</p>
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button onClick={() => mutate()} className="btn-ghost" style={{ fontSize:13 }}>🔄 Refresh</button>
            <button onClick={generate} disabled={generating} className="btn-primary">
              {generating ? '⏳ Queuing...' : `✨ Generate ${now.toLocaleString('default',{month:'long'})} Report`}
            </button>
          </div>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'280px 1fr',gap:24 }}>
          {/* List */}
          <div>
            <p style={{ fontSize:11,fontWeight:500,color:'var(--text-m)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12 }}>Monthly Reports</p>
            {isLoading && [...Array(3)].map((_,i) => <div key={i} className="skeleton" style={{ height:80,borderRadius:12,marginBottom:10 }} />)}
            {!isLoading && (!reports || reports.length===0) && (
              <div className="card" style={{ padding:24,textAlign:'center' }}>
                <div style={{ fontSize:28,marginBottom:10 }}>📄</div>
                <p style={{ fontSize:13,color:'var(--text-2)' }}>No reports yet</p>
              </div>
            )}
            {Array.isArray(reports) && reports.map((r:{id:string;title:string;period_month:number;period_year:number;status:string;created_at:string;summary_json?:{total_spend:number;total_income:number;net_savings:number}}) => {
              const sb = STATUS_BADGE[r.status] || STATUS_BADGE.failed;
              return (
                <button key={r.id} onClick={() => setSelected(r.id)} style={{
                  width:'100%',textAlign:'left',padding:16,borderRadius:12,marginBottom:10,cursor:'pointer',fontFamily:'inherit',
                  background: selected===r.id?'rgba(59,140,255,.12)':'var(--bg-card)',
                  border: `1px solid ${selected===r.id?'rgba(59,140,255,.4)':'rgba(59,140,255,.15)'}`,
                  transition:'all .15s',
                }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ fontSize:13,fontWeight:600,color:'#fff' }}>
                      {new Date(r.period_year,r.period_month-1).toLocaleString('default',{month:'long',year:'numeric'})}
                    </span>
                    <span className={`badge ${sb.cls}`} style={{ fontSize:9 }}>{sb.icon} {r.status}</span>
                  </div>
                  {r.summary_json && (
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
                      {[{l:'Spend',v:fmt(r.summary_json.total_spend)},{l:'Income',v:fmt(r.summary_json.total_income)},{l:'Saved',v:fmt(r.summary_json.net_savings)}].map(k => (
                        <div key={k.l}>
                          <p style={{ fontSize:9,color:'var(--text-m)',textTransform:'uppercase',letterSpacing:'.05em' }}>{k.l}</p>
                          <p style={{ fontSize:12,fontWeight:700,color:'#fff' }}>{k.v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detail */}
          <div>
            {!sel ? (
              <div className="card" style={{ padding:48,textAlign:'center',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
                <div style={{ fontSize:40,marginBottom:14 }}>📊</div>
                <p style={{ fontSize:14,fontWeight:600,color:'#fff',marginBottom:6 }}>Select a report</p>
                <p style={{ fontSize:12,color:'var(--text-m)' }}>Or generate a new one above</p>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:16 }} className="animate-fade-in">
                {/* Header card */}
                <div className="card" style={{ padding:24 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
                    <div style={{ width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#0941a8,#00d4ff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>✨</div>
                    <div>
                      <h2 style={{ fontSize:16,fontWeight:800,color:'#fff' }}>{sel.title}</h2>
                      <span className={`badge ${STATUS_BADGE[sel.status]?.cls||'badge-blue'}`} style={{ fontSize:9,marginTop:4,display:'inline-flex' }}>
                        {STATUS_BADGE[sel.status]?.icon} {sel.status}
                      </span>
                    </div>
                  </div>
                  {sel.summary_json && (
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,paddingTop:16,borderTop:'1px solid rgba(59,140,255,.1)' }}>
                      {[
                        {l:'Total Spend', v:fmt(sel.summary_json.total_spend),   c:'#fff'},
                        {l:'Total Income',v:fmt(sel.summary_json.total_income),  c:'#10b981'},
                        {l:'Net Savings', v:fmt(sel.summary_json.net_savings),   c:sel.summary_json.net_savings>=0?'#10b981':'#ef4444'},
                        {l:'Savings Rate',v:`${sel.summary_json.savings_rate||0}%`,c:'#3b8cff'},
                      ].map(k=>(
                        <div key={k.l}>
                          <p style={{fontSize:10,color:'var(--text-m)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4}}>{k.l}</p>
                          <p style={{fontSize:20,fontWeight:800,color:k.c}}>{k.v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top categories */}
                {sel.summary_json?.top_categories && (
                  <div className="card" style={{ padding:24 }}>
                    <h3 style={{ fontSize:13,fontWeight:700,color:'#fff',marginBottom:16 }}>Top Spending Categories</h3>
                    {sel.summary_json.top_categories.map((c:{category:string;amount:number},i:number) => {
                      const max = sel.summary_json!.top_categories[0].amount;
                      return (
                        <div key={c.category} style={{ marginBottom:12 }}>
                          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                            <span style={{ fontSize:13,color:'var(--text-2)' }}>{c.category}</span>
                            <span style={{ fontSize:13,fontWeight:700,color:'#fff' }}>{fmt(c.amount)}</span>
                          </div>
                          <div style={{ height:5,background:'rgba(59,140,255,.15)',borderRadius:3,overflow:'hidden' }}>
                            <div style={{ height:'100%',width:`${c.amount/max*100}%`,background:'linear-gradient(90deg,#0d52cc,#00d4ff)',borderRadius:3,transition:'width .7s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* AI Narrative */}
                {sel.status==='ready' && sel.summary_json?.narrative && (
                  <div className="card" style={{ padding:24 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:16 }}>
                      <span style={{ fontSize:16 }}>✨</span>
                      <h3 style={{ fontSize:13,fontWeight:700,color:'#fff' }}>AI Analysis</h3>
                      <span className="badge badge-purple" style={{ fontSize:9 }}>GPT-4</span>
                    </div>
                    <div className="prose-ai"><ReactMarkdown>{sel.summary_json.narrative}</ReactMarkdown></div>
                  </div>
                )}

                {sel.status==='generating' && (
                  <div className="card" style={{ padding:40,textAlign:'center' }}>
                    <p style={{ fontSize:24,marginBottom:12 }}>⚙️</p>
                    <p style={{ fontSize:13,fontWeight:600,color:'#fff',marginBottom:6 }}>Generating AI narrative...</p>
                    <p style={{ fontSize:12,color:'var(--text-m)' }}>Usually takes 15–30 seconds</p>
                    <button onClick={()=>mutate()} className="btn-ghost" style={{ marginTop:16,fontSize:12 }}>🔄 Check status</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
