'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/me', { full_name: name, email });
      toast.success('Profile updated!');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  }

  const inp: React.CSSProperties = {
    width:'100%',padding:'10px 13px',borderRadius:10,fontSize:13,
    background:'var(--bg-card)',border:'1px solid rgba(59,140,255,.2)',
    color:'var(--text-1)',outline:'none',fontFamily:'inherit',marginBottom:14,
  };
  const label: React.CSSProperties = {
    fontSize:11,fontWeight:500,color:'var(--text-m)',
    textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:6,
  };

  return (
    <div style={{ display:'flex',background:'var(--bg-base)',minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ marginLeft:220,flex:1,padding:32,maxWidth:700 }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:22,fontWeight:800,color:'#fff' }}>Settings</h1>
          <p style={{ fontSize:13,color:'var(--text-m)',marginTop:3 }}>Manage your account and preferences</p>
        </div>

        {/* Profile */}
        <div className="card" style={{ padding:24,marginBottom:20 }}>
          <h2 style={{ fontSize:14,fontWeight:700,color:'#fff',marginBottom:20 }}>Profile</h2>
          <form onSubmit={save}>
            <label style={label}>Full Name</label>
            <input style={inp} type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
            <label style={label}>Email Address</label>
            <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" />
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'💾 Save Changes'}</button>
          </form>
        </div>

        {/* Plan */}
        <div className="card" style={{ padding:24,marginBottom:20 }}>
          <h2 style={{ fontSize:14,fontWeight:700,color:'#fff',marginBottom:20 }}>Plan & Billing</h2>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14 }}>
            {[
              { name:'Free',       price:'$0',  features:['1 bank account','3-month history','Basic categorization'], cur:true  },
              { name:'Pro',        price:'$9',  features:['Unlimited accounts','Full history','AI Advisor + RAG','Forecasting','Monthly reports'], cur:false },
              { name:'Enterprise', price:'Custom', features:['White-label SDK','Custom models','SLA'], cur:false },
            ].map(p => (
              <div key={p.name} style={{
                padding:16,borderRadius:12,
                background: p.cur?'rgba(59,140,255,.1)':'transparent',
                border: `1px solid ${p.cur?'rgba(59,140,255,.4)':'rgba(59,140,255,.15)'}`,
              }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                  <span style={{ fontWeight:700,color:'#fff' }}>{p.name}</span>
                  {p.cur && <span className="badge badge-blue" style={{ fontSize:9 }}>Current</span>}
                </div>
                <p style={{ fontSize:22,fontWeight:800,color:'#fff',marginBottom:10 }}>{p.price}<span style={{ fontSize:12,color:'var(--text-m)',fontWeight:400 }}>{p.price!=='Custom'?'/mo':''}</span></p>
                {p.features.map(f=><p key={f} style={{ fontSize:11,color:'var(--text-2)',marginBottom:4 }}>✓ {f}</p>)}
                {!p.cur && <button className="btn-primary" style={{ marginTop:10,fontSize:11,padding:'6px 14px',width:'100%',justifyContent:'center' }}>{p.name==='Enterprise'?'Contact Sales':'Upgrade'}</button>}
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ padding:24,borderColor:'rgba(239,68,68,.3)',background:'rgba(239,68,68,.04)' }}>
          <h2 style={{ fontSize:14,fontWeight:700,color:'#ef4444',marginBottom:10 }}>Danger Zone</h2>
          <p style={{ fontSize:12,color:'var(--text-m)',marginBottom:14 }}>Permanently delete your account and all data. This cannot be undone.</p>
          <button onClick={()=>toast.error('Contact support to delete your account')} style={{
            padding:'8px 16px',borderRadius:10,border:'1px solid rgba(239,68,68,.4)',
            background:'transparent',color:'#ef4444',fontSize:12,cursor:'pointer',fontFamily:'inherit',
          }}>🗑️ Delete Account</button>
        </div>
      </main>
    </div>
  );
}
