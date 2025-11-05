import { useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Form, Button, Card, Spinner, Alert, Image } from "react-bootstrap";

export default function AdminAccountPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", avatar: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "" });

  useEffect(() => {
    fetch("/api/admin/account")
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setForm({ name: data.name || "", avatar: data.avatar || "" });
        setLoading(false);
      });
  }, []);

  function handleChange(e: any) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }
  function handlePwChange(e: any) {
    setPwForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function save() {
    fetch("/api/admin/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setMsg("Profile updated!");
        setTimeout(() => setMsg(null), 1800);
      });
  }

  function changePassword() {
    fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pwForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setMsg("Password changed!");
        else setMsg(data.error || "Error changing password.");
        setPwForm({ oldPassword: "", newPassword: "" });
        setTimeout(() => setMsg(null), 1800);
      });
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: 220 }}>
          <Spinner animation="border" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 style={{ fontWeight: 700, marginBottom: 22 }}>My Account</h1>
      <Card className="shadow" style={{ maxWidth: 540 }}>
        <Card.Body>
          {msg && <Alert variant="success">{msg}</Alert>}
          <div className="mb-3 text-center">
            <Image
              src={profile.avatar || "/avatar-default.png"}
              roundedCircle
              style={{ width: 70, height: 70, objectFit: "cover", marginBottom: 10 }}
              alt="Admin avatar"
            />
          </div>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control name="name" value={form.name} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Profile Picture URL</Form.Label>
              <Form.Control name="avatar" value={form.avatar} onChange={handleChange} />
            </Form.Group>
            <Button variant="primary" className="me-3" onClick={save}>Update Profile</Button>
            <Button variant="link" onClick={() => setShowPw(v => !v)}>Change Password</Button>
          </Form>
          {showPw && (
            <div className="mt-4">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Old Password</Form.Label>
                  <Form.Control type="password" name="oldPassword" value={pwForm.oldPassword} onChange={handlePwChange} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control type="password" name="newPassword" value={pwForm.newPassword} onChange={handlePwChange} />
                </Form.Group>
                <Button variant="secondary" onClick={changePassword}>Update Password</Button>
              </Form>
            </div>
          )}
          <div className="text-muted mt-4" style={{ fontSize: 13 }}>
            Last login: {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "--"}
          </div>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
