import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#0b1220',color:'#e2e8f0',fontFamily:'Inter, system-ui, Arial'}}>
      <div style={{textAlign:'center',padding:'24px'}}>
        <h1 style={{fontSize:'48px',marginBottom:'8px'}}>404</h1>
        <p style={{opacity:.9,marginBottom:'16px'}}>We couldn’t find that page.</p>
        <Link href="/" style={{padding:'10px 16px',borderRadius:12,background:'#22c55e',color:'#0b1220',fontWeight:600}}>
          Go home
        </Link>
      </div>
    </main>
  );
}
