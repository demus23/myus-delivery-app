import Link from 'next/link';

export default function ServerError() {
  return (
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#0b1220',color:'#e2e8f0',fontFamily:'Inter, system-ui, Arial'}}>
      <div style={{textAlign:'center',padding:'24px'}}>
        <h1 style={{fontSize:'40px',marginBottom:'8px'}}>Something went wrong</h1>
        <p style={{opacity:.9,marginBottom:'16px'}}>Our team has been notified. Please try again.</p>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <Link href="/" style={{padding:'10px 16px',borderRadius:12,background:'#22c55e',color:'#0b1220',fontWeight:600}}>
            Go home
          </Link>
          <a href="mailto:support@yourdomain.com" style={{padding:'10px 16px',borderRadius:12,background:'#334155',color:'#e2e8f0',fontWeight:600}}>
            Contact support
          </a>
        </div>
      </div>
    </main>
  );
}
