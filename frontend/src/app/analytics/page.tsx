'use client';
import { Sidebar } from '@/components/layout/Sidebar';
import { useDashboard, useSpendingVelocity, useSubscriptions } from '@/lib/api';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

export default function AnalyticsPage() {
  const { data }           = useDashboard();
  const { data: velocity } = useSpendingVelocity(90);
  const { data: subs }     = useSubscriptions();

  const trend = data?.monthly_trend || [];

  return (
    <div style={{ display:'flex',background:'var(--bg-base)',minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ marginLeft:220,flex:1,padding:32 }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:22,fontWeight:800,color:'#fff' }}>Analytics</h1>
          <p style={{ fontSize:13,color:'var(--text-m)',marginTop:3 }}>Deep-dive into your financial patterns</p>
        </div>

        {/* KPI row */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24 }}>
          {[
            { label:'YTD Income',    value: fmt(data?.kpis.ytd_income  || 0), icon:'💚' },
            { label:'YTD Spend',     value: fmt(data?.kpis.ytd_spend   || 0), icon:'💙' },
            { label:'Savings Rate',  value: `${data?.kpis.savings_rate_pct || 0}%`, icon:'🎯' },
            { label:'Anomalies',     value: String(data?.kpis.pending_anomalies || 0), icon:'⚠️' },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding:20 }}>
              <div style={{ fontSize:20,marginBottom:8 }}>{k.icon}</div>
              <p style={{ fontSize:11,color:'var(--text-m)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6 }}>{k.label}</p>
              <p style={{ fontSize:24,fontWeight:800,color:'#fff' }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Income vs Spend Bar */}
        <div className="card" style={{ padding:24,marginBottom:20 }}>
          <h2 style={{ fontSize:14,fontWeight:700,color:'#fff',marginBottom:4 }}>Income vs Expenses</h2>
          <p style={{ fontSize:12,color:'var(--text-m)',marginBottom:20 }}>12-month comparison</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,140,255,.06)" vertical={false} />
              <XAxis dataKey="month" tick={{fontSize:10,fill:'#4a6a8a'}} tickLine={false} tickFormatter={v=>v.split(' ')[0]} />
              <YAxis tick={{fontSize:10,fill:'#4a6a8a'}} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{background:'#0a1628',border:'1px solid rgba(59,140,255,.25)',borderRadius:10,fontSize:12}} formatter={(v:number,n:string)=>[fmt(v),n.charAt(0).toUpperCase()+n.slice(1)]} />
              <Bar dataKey="income"  fill="#10b981" radius={[3,3,0,0]} maxBarSize={22} name="income" />
              <Bar dataKey="spend"   fill="#3b8cff" radius={[3,3,0,0]} maxBarSize={22} name="spend" />
              <Bar dataKey="savings" fill="#00d4ff" radius={[3,3,0,0]} maxBarSize={22} name="savings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Velocity */}
        <div className="card" style={{ padding:24,marginBottom:20 }}>
          <h2 style={{ fontSize:14,fontWeight:700,color:'#fff',marginBottom:4 }}>Daily Spending (90 days)</h2>
          <p style={{ fontSize:12,color:'var(--text-m)',marginBottom:20 }}>Day-by-day expense run-rate</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={velocity||[]}>
              <defs>
                <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b8cff" stopOpacity={.25}/>
                  <stop offset="95%" stopColor="#3b8cff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,140,255,.06)" />
              <XAxis dataKey="date" tick={{fontSize:10,fill:'#4a6a8a'}} tickLine={false} tickFormatter={v=>new Date(v).toLocaleDateString('en-US',{month:'short',day:'numeric'})} interval="preserveStartEnd" />
              <YAxis tick={{fontSize:10,fill:'#4a6a8a'}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`} />
              <Tooltip contentStyle={{background:'#0a1628',border:'1px solid rgba(59,140,255,.25)',borderRadius:10,fontSize:12}} formatter={(v:number)=>[fmt(v),'Spend']} />
              <Area type="monotone" dataKey="amount" stroke="#3b8cff" strokeWidth={2} fill="url(#vg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subscriptions */}
        {subs?.subscriptions?.length > 0 && (
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <div>
                <h2 style={{ fontSize:14,fontWeight:700,color:'#fff' }}>🔁 Detected Subscriptions</h2>
                <p style={{ fontSize:12,color:'var(--text-m)',marginTop:3 }}>{subs.subscriptions.length} recurring charges found</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:11,color:'var(--text-m)' }}>Monthly total</p>
                <p style={{ fontSize:18,fontWeight:800,color:'#fff' }}>{fmt(subs.total_monthly_cost||0)}</p>
              </div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12 }}>
              {subs.subscriptions.map((s:{merchant:string;amount:number;frequency:string;is_active:boolean}) => (
                <div key={s.merchant} style={{
                  padding:14,borderRadius:12,
                  background: s.is_active?'rgba(168,85,247,.08)':'rgba(255,255,255,.03)',
                  border: `1px solid ${s.is_active?'rgba(168,85,247,.3)':'rgba(255,255,255,.08)'}`,
                }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                    <span style={{ fontSize:13,fontWeight:600,color:'#fff' }}>{s.merchant}</span>
                    <span className={`badge ${s.is_active?'badge-green':'badge-yellow'}`} style={{ fontSize:9 }}>{s.is_active?'Active':'Inactive'}</span>
                  </div>
                  <p style={{ fontSize:18,fontWeight:800,color:'#fff' }}>{fmt(s.amount)}</p>
                  <p style={{ fontSize:11,color:'var(--text-m)',textTransform:'capitalize' }}>{s.frequency}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
