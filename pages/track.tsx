import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

type Package = {
  tracking: string;
  courier: string;
  value: string;
  status: string;
};

export default function TrackPage() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [pkg, setPkg] = useState<Package | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle tracking link like /track?code=12345
  useEffect(() => {
    if (router.query.code) {
      setTrackingNumber(router.query.code as string);
      fetchPackage(router.query.code as string);
    }
  }, [router.query]);

  const fetchPackage = async (tracking: string) => {
    setLoading(true);
    setMessage('');
    setPkg(null);

    const res = await fetch(`/api/track?tracking=${tracking}`);
    if (res.ok) {
      const data = await res.json();
      setPkg(data);
    } else {
      setMessage('❌ Package not found.');
    }

    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    fetchPackage(trackingNumber);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#999';
      case 'Arrived':
        return '#f59e0b'; // amber
      case 'Shipped':
        return '#3b82f6'; // blue
      case 'Delivered':
        return '#10b981'; // green
      default:
        return '#ccc';
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center' }}>📦 Track Your Package</h1>
      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Enter tracking number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '16px',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px',
            backgroundColor: '#0070f3',
            color: '#fff',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Tracking...' : 'Track Package'}
        </button>
      </form>

      {message && <p style={{ textAlign: 'center', color: 'red', marginTop: '1rem' }}>{message}</p>}

      {pkg && (
        <div
          style={{
            marginTop: '2rem',
            background: '#f9f9f9',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ marginBottom: '0.5rem' }}>Tracking: {pkg.tracking}</h2>
          <p>Courier: <strong>{pkg.courier}</strong></p>
          <p>Value: <strong>${pkg.value}</strong></p>
          <p>
            Status:{' '}
            <span
              style={{
                color: '#fff',
                backgroundColor: statusColor(pkg.status),
                padding: '4px 10px',
                borderRadius: '5px',
                fontWeight: 'bold',
              }}
            >
              {pkg.status}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

