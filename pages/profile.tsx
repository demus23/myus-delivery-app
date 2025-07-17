import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
  });
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setForm(data.address || {});
        setLoading(false);
      });
  }, [router]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setMsg("");
    const token = localStorage.getItem("token");
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ address: form }),
    });
    if (res.ok) setMsg("Profile updated!");
    else setMsg("Update failed");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 500 }}>
      <h2>My Profile</h2>
      <div><b>Email:</b> {user?.email}</div>
      <div><b>Suite #:</b> {user?.suite}</div>
      <hr />
      <h3>Home Delivery Address</h3>
      <form onSubmit={handleSave}>
        <input name="line1" placeholder="Address Line 1" value={form.line1 || ""} onChange={handleChange} required style={{width:"100%",marginBottom:8}} /><br />
        <input name="line2" placeholder="Address Line 2" value={form.line2 || ""} onChange={handleChange} style={{width:"100%",marginBottom:8}} /><br />
        <input name="city" placeholder="City" value={form.city || ""} onChange={handleChange} required style={{width:"100%",marginBottom:8}} /><br />
        <input name="state" placeholder="State" value={form.state || ""} onChange={handleChange} style={{width:"100%",marginBottom:8}} /><br />
        <input name="postalCode" placeholder="Postal Code" value={form.postalCode || ""} onChange={handleChange} style={{width:"100%",marginBottom:8}} /><br />
        <input name="country" placeholder="Country" value={form.country || ""} onChange={handleChange} required style={{width:"100%",marginBottom:8}} /><br />
        <input name="phone" placeholder="Phone" value={form.phone || ""} onChange={handleChange} style={{width:"100%",marginBottom:8}} /><br />
        <button type="submit">Save</button>
      </form>
      <div style={{ color: "green" }}>{msg}</div>
    </div>
  );
}
