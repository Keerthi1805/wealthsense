'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Sidebar } from '@/components/layout/Sidebar';
import { useTransactions, ingestionApi } from '@/lib/api';
import toast from 'react-hot-toast';

const fmt = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

const CAT_COLORS: Record<string,string> = {
  'Groceries':'badge-green','Streaming Services':'badge-purple','Coffee & Cafes':'badge-yellow',
  'Dining & Restaurants':'badge-yellow','Gas & Fuel':'badge-blue','Health & Pharmacy':'badge-green',
  'Online Shopping':'badge-blue','Fitness & Gym':'badge-purple','Salary & Income':'badge-green',
};

function DropZone({ onSuccess }: { onSuccess: () => void }) {
  const [status, setStatus] = useState<'idle'|'uploading'|'done'|'error'>('idle');
  const [msg, setMsg] = useState('');

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setStatus('uploading');
    try {
      const res = await ingestionApi.uploadCSV(file);
      setMsg(res.data.message);
      setStatus('done');
      toast.success(`${res.data.imported} transactions imported!`);
      setTimeout(() => { setStatus('idle'); onSuccess(); }, 3000);
    } catch (e: unknown) {
      const m = (e as {response?:{data?:{detail?:string}}})?.response?.data?.detail || 'Upload failed';
      setMsg(m); setStatus('error'); toast.error(m);
    }
  }, [onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1 });

  return (
    <div {...getRootProps()} style={{
      border: `2px dashed ${isDragActive ? '#00d4ff' : 'rgba(59,140,255,.3)'}`,
      borderRadius: 14, padding: 32, textAlign: 'center', cursor: 'pointer',
      background: isDragActive ? 'rgba(0,212,255,.05)' : 'transparent',
      transition: 'all .2s', marginBottom: 24,
    }}>
      <input {...getInputProps()} />
      {status === 'uploading' && <p style={{ color: '#3b8cff', fontSize: 13 }}>⏳ Parsing CSV...</p>}
      {status === 'done'      && <p style={{ color: '#10b981', fontSize: 13 }}>✅ {msg}</p>}
      {status === 'error'     && <p style={{ color: '#ef4444', fontSize: 13 }}>❌ {msg}</p>}
      {status === 'idle'      && (
        <>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            {isDragActive ? 'Drop CSV here' : 'Upload Bank CSV'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-m)' }}>Supports Chase, BoA, Citi, AmEx, Capital One and more</p>
        </>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [showUpload, setShow]   = useState(false);

  const { data, isLoading, mutate } = useTransactions({
    page, page_size: 25,
    ...(search   ? { search }   : {}),
    ...(category ? { category } : {}),
  });

  const th: React.CSSProperties = {
    textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600,
    color: 'var(--text-m)', textTransform: 'uppercase', letterSpacing: '.06em',
    borderBottom: '1px solid rgba(59,140,255,.1)', background: 'rgba(59,140,255,.04)',
  };
  const td: React.CSSProperties = {
    padding: '11px 16px', fontSize: 13, borderBottom: '1px solid rgba(59,140,255,.06)',
  };

  return (
    <div style={{ display:'flex', background:'var(--bg-base)', minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: 32 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff' }}>Transactions</h1>
            <p style={{ fontSize:13, color:'var(--text-m)', marginTop:3 }}>{data ? `${data.total.toLocaleString()} total` : 'Loading...'}</p>
          </div>
          <button onClick={() => setShow(!showUpload)} className="btn-primary">📂 Import CSV</button>
        </div>

        {showUpload && <DropZone onSuccess={() => { mutate(); setShow(false); }} />}

        {/* Filters */}
        <div className="card" style={{ padding: 16, marginBottom: 20, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <input
            className="input" placeholder="Search merchant or description..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 280 }}
          />
          {['All','Groceries','Dining & Restaurants','Coffee & Cafes','Streaming Services','Gas & Fuel','Online Shopping'].map(c => (
            <button key={c} onClick={() => { setCategory(c === 'All' ? '' : c); setPage(1); }}
              style={{
                padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer',
                border: (c==='All'?!category:category===c) ? '1px solid rgba(59,140,255,.5)' : '1px solid rgba(59,140,255,.15)',
                background: (c==='All'?!category:category===c) ? 'rgba(59,140,255,.2)' : 'transparent',
                color: (c==='All'?!category:category===c) ? '#fff' : 'var(--text-2)',
                fontFamily:'inherit',
              }}>{c}</button>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Merchant</th>
                <th style={th}>Category</th>
                <th style={th}>Description</th>
                <th style={{...th, textAlign:'right'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? [...Array(8)].map((_,i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_,j) => <td key={j} style={td}><div className="skeleton" style={{height:14,borderRadius:4}} /></td>)}
                    </tr>
                  ))
                : data?.items.map((tx:{id:string;date:string;merchant:string|null;description:string;category:string|null;amount:number;transaction_type:string;is_recurring:boolean}) => (
                    <tr key={tx.id} style={{ transition:'background .15s' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(59,140,255,.04)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td style={{...td, color:'var(--text-m)', fontFamily:'monospace', fontSize:11, whiteSpace:'nowrap'}}>
                        {new Date(tx.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                      </td>
                      <td style={td}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{color:'#fff',fontWeight:500}}>{tx.merchant || tx.description}</span>
                          {tx.is_recurring && <span style={{fontSize:9,background:'rgba(168,85,247,.2)',color:'#a855f7',padding:'1px 5px',borderRadius:4}}>recurring</span>}
                        </div>
                      </td>
                      <td style={td}>
                        {tx.category
                          ? <span className={`badge ${CAT_COLORS[tx.category]||'badge-blue'}`} style={{fontSize:10}}>{tx.category}</span>
                          : <span style={{fontSize:12,color:'var(--text-m)',fontStyle:'italic'}}>Uncategorized</span>}
                      </td>
                      <td style={{...td,color:'var(--text-m)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}</td>
                      <td style={{...td,textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>
                        <span style={{color: tx.transaction_type==='credit' ? '#10b981' : '#fff'}}>
                          {tx.transaction_type==='credit' ? '+' : '-'}{fmt(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {data && data.pages > 1 && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderTop:'1px solid rgba(59,140,255,.1)'}}>
              <span style={{fontSize:12,color:'var(--text-m)'}}>Page {data.page} of {data.pages}</span>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn-ghost" style={{fontSize:12,padding:'5px 12px'}}>← Prev</button>
                <button onClick={()=>setPage(p=>Math.min(data.pages,p+1))} disabled={page>=data.pages} className="btn-ghost" style={{fontSize:12,padding:'5px 12px'}}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
