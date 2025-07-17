import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface Package {
  _id: string;
  tracking: string;
  courier: string;
  status: string;
  value: string;
  createdAt?: string;
  messages?: { from: string; text: string; createdAt: string }[];
}

export default function PackageDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    async function fetchDetails() {
      const res = await fetch(`/api/mypackages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setPkg(data);
      setLoading(false);
    }

    fetchDetails();
  }, [id, router]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    setSending(true);
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/mypackages/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: msgText }),
    });
    setSending(false);
    if (res.ok) {
      setPkg(pkg => pkg
        ? {
          ...pkg,
          messages: [
            ...(pkg.messages || []),
            {
              from: 'user',
              text: msgText,
              createdAt: new Date().toISOString(),
            },
          ],
        }
        : pkg
      );
      setMsgText('');
    } else {
      alert('Failed to send message');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!pkg) return <p>Package not found.</p>;

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1>Package Details</h1>
      <ul>
        <li><strong>Tracking:</strong> {pkg.tracking}</li>
        <li><strong>Courier:</strong> {pkg.courier}</li>
        <li><strong>Status:</strong> {pkg.status}</li>
        <li><strong>Value:</strong> {pkg.value}</li>
        <li><strong>Created At:</strong> {pkg.createdAt ? new Date(pkg.createdAt).toLocaleString() : ''}</li>
      </ul>
      <hr />
      <h2>Messages</h2>
      <div style={{
        maxHeight: 200,
        overflowY: 'auto',
        border: '1px solid #ccc',
        padding: 10,
        marginBottom: 10,
        background: '#fafbfc'
      }}>
        {(pkg.messages || []).length === 0 ? (
          <div style={{ color: '#888' }}>No messages yet.</div>
        ) : (
          pkg.messages!.map((m, idx) => (
            <div key={idx} style={{ marginBottom: 8 }}>
              <b>{m.from === 'admin' ? 'Admin' : 'You'}:</b> {m.text}
              <span style={{ color: '#aaa', marginLeft: 8, fontSize: 12 }}>
                {new Date(m.createdAt).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={sendMessage} style={{ marginBottom: 20 }}>
        <input
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          placeholder="Type your message"
          style={{ width: 250, marginRight: 8 }}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !msgText.trim()}>Send</button>
      </form>
      <button onClick={() => router.back()}>Back</button>
    </div>
  );
}
