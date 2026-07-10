'use client';
import { Sidebar } from '@/components/layout/Sidebar';
import { useDashboard, useSpendingVelocity } from '@/lib/api';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b8cff','#00d4ff','#a855f7','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1'];
const fmt    = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

function KPI({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(59,140,255,.4),transparent)' }} />
      <p style={{ fontSize: 11, color: 'var(--text-m)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: warn ? '#ef4444' : '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-m)' }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: velocity  } = useSpendingVelocity(30);

  if (isLoading) return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div className="skeleton" style={{ height: 280, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 14 }} />
        </div>
      </main>
    </div>
  );

  if (!data) return null;
  const { kpis, categories, monthly_trend, top_merchants, recent_anomalies } = data;

  return (
    <div style={{ display: 'flex', background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: 32, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Financial Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-m)', marginTop: 3 }}>Real-time overview of your financial health</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <KPI label="Monthly Spend"  value={fmt(kpis.this_month_spend)}  sub={`${kpis.mom_change_pct > 0 ? '+' : ''}${kpis.mom_change_pct}% vs last month`} warn={kpis.mom_change_pct > 15} />
          <KPI label="Monthly Income" value={fmt(kpis.this_month_income)} sub="This month" />
          <KPI label="Net Savings"    value={fmt(kpis.this_month_savings)} sub={`${kpis.savings_rate_pct}% savings rate`} />
          <KPI label="Anomalies"      value={String(kpis.pending_anomalies)} sub="Pending review" warn={kpis.pending_anomalies > 0} />
        </div>

        {/* Charts row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>12-Month Trend</h2>
            <p style={{ fontSize: 12, color: 'var(--text-m)', marginBottom: 20 }}>Income vs expenses</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly_trend}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b8cff" stopOpacity={.3}/><stop offset="95%" stopColor="#3b8cff" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,140,255,.06)" />
                <XAxis dataKey="month" tick={{fontSize:10,fill:'#4a6a8a'}} tickLine={false} tickFormatter={v=>v.split(' ')[0]} />
                <YAxis tick={{fontSize:10,fill:'#4a6a8a'}} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{background:'#0a1628',border:'1px solid rgba(59,140,255,.25)',borderRadius:10,fontSize:12}} formatter={(v:number,n:string)=>[fmt(v),n.charAt(0).toUpperCase()+n.slice(1)]} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#gi)" name="income" />
                <Area type="monotone" dataKey="spend"  stroke="#3b8cff" strokeWidth={2} fill="url(#gs)" name="spend"  />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>This Month</h2>
            <p style={{ fontSize: 12, color: 'var(--text-m)', marginBottom: 10 }}>Spend by category</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                  {categories.map((_:unknown, i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{background:'#0a1628',border:'1px solid rgba(59,140,255,.25)',borderRadius:10,fontSize:12}} formatter={(v:number)=>[fmt(v)]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 8 }}>
              {categories.slice(0,4).map((c:{category:string;amount:number},i:number) => (
                <div key={c.category} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:COLORS[i] }} />
                    <span style={{ fontSize:11,color:'var(--text-2)',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.category}</span>
                  </div>
                  <span style={{ fontSize:11,fontWeight:700,color:'#fff' }}>{fmt(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Daily Spending (30 days)</h2>
            <p style={{ fontSize: 12, color: 'var(--text-m)', marginBottom: 20 }}>Day-by-day expense velocity</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={velocity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,140,255,.06)" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize:10,fill:'#4a6a8a'}} tickLine={false} tickFormatter={v=>new Date(v).getDate().toString()} />
                <YAxis tick={{fontSize:10,fill:'#4a6a8a'}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`} />
                <Tooltip contentStyle={{background:'#0a1628',border:'1px solid rgba(59,140,255,.25)',borderRadius:10,fontSize:12}} formatter={(v:number)=>[fmt(v),'Spend']} />
                <Bar dataKey="amount" fill="#3b8cff" radius={[3,3,0,0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Top Merchants */}
            <div className="card" style={{ padding: 20, flex: 1 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Top Merchants</h2>
              {top_merchants.map((m:{merchant:string;total:number},i:number) => (
                <div key={m.merchant} style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <span style={{ fontSize:11,color:'var(--text-m)',fontFamily:'monospace',width:16 }}>{i+1}.</span>
                    <span style={{ fontSize:12,color:'var(--text-2)' }}>{m.merchant}</span>
                  </div>
                  <span style={{ fontSize:12,fontWeight:700,color:'#fff' }}>{fmt(m.total)}</span>
                </div>
              ))}
            </div>

            {/* Anomalies */}
            {recent_anomalies.length > 0 && (
              <div className="card" style={{ padding: 20, borderColor: 'rgba(239,68,68,.3)', background: 'rgba(239,68,68,.04)' }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>⚠️ Anomalies</h2>
                {recent_anomalies.map((a:{merchant:string;amount:number;description:string},i:number) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display:'flex',justifyContent:'space-between' }}>
                      <span style={{ fontSize:12,fontWeight:600,color:'#fff' }}>{a.merchant}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:'#ef4444' }}>{fmt(a.amount)}</span>
                    </div>
                    <p style={{ fontSize:11,color:'var(--text-m)',marginTop:2 }}>{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
