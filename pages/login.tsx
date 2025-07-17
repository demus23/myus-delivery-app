import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Use NextAuth for login!
    const res = await signIn("credentials", {
      redirect: false, // we'll handle redirect manually
      email,
      password,
    });

    if (res?.ok && !res.error) {
      setMessage('✅ Login successful!');
      window.location.href = '/dashboard'; // Or use router.push('/dashboard')
    } else {
      setMessage('❌ Invalid email or password');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f9fc' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Log In</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button
          type="submit"
          style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#0070f3',
            color: '#fff',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Log In
        </button>

        {message && <p style={{ marginTop: '15px', textAlign: 'center', color: message.startsWith('❌') ? 'red' : 'green' }}>{message}</p>}
      </form>
    </div>
  );
}

const inputStyle = {
  marginBottom: '15px',
  padding: '12px',
  fontSize: '16px',
  borderRadius: '6px',
  border: '1px solid #ccc',
};
