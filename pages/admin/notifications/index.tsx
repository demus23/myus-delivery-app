import { useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Card, Spinner, Table, Form, Button, Alert } from "react-bootstrap";

const typeLabels: any = {
  welcome: "Welcome Email",
  packageShipped: "Package Shipped",
  passwordReset: "Password Reset",
  // Add more as you grow
};

export default function NotificationsAdminPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ enabled: true, subject: "", template: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then(res => res.json())
      .then(data => {
        setTemplates(data);
        setLoading(false);
      });
  }, []);

  function handleEdit(id: string) {
    const t = templates.find(t => t._id === id);
    setEditForm({
      enabled: t.enabled,
      subject: t.subject,
      template: t.template,
    });
    setEditing(id);
  }

  function save() {
    fetch("/api/admin/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing, ...editForm }),
    })
      .then(res => res.json())
      .then(data => {
        setTemplates(templates =>
          templates.map(t => t._id === data._id ? data : t)
        );
        setEditing(null);
        setMsg("Template updated!");
        setTimeout(() => setMsg(null), 1500);
      });
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: 200 }}>
          <Spinner animation="border" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 style={{ fontWeight: 700, marginBottom: 22 }}>Notifications & Email Templates</h1>
      {msg && <Alert variant="success">{msg}</Alert>}
      <Card className="shadow" style={{ maxWidth: 880 }}>
        <Card.Body>
          <Table hover bordered>
            <thead>
              <tr>
                <th>Type</th>
                <th>Subject</th>
                <th>Enabled</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t._id}>
                  <td>{typeLabels[t.type] || t.type}</td>
                  <td>{t.subject}</td>
                  <td>{t.enabled ? "Yes" : "No"}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" onClick={() => handleEdit(t._id)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {/* Edit Modal (inline) */}
          {editing && (
            <div style={{ marginTop: 22, borderTop: "1px solid #eee", paddingTop: 16 }}>
              <h6>Edit Template</h6>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Subject</Form.Label>
                  <Form.Control
                    value={editForm.subject}
                    onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email Body</Form.Label>
                  <Form.Control
                    as="textarea"
                    value={editForm.template}
                    onChange={e => setEditForm(f => ({ ...f, template: e.target.value }))}
                    rows={6}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Enabled"
                    checked={editForm.enabled}
                    onChange={e => setEditForm(f => ({ ...f, enabled: e.target.checked }))}
                  />
                </Form.Group>
                <Button variant="primary" onClick={save}>Save</Button>
                <Button variant="link" onClick={() => setEditing(null)}>Cancel</Button>
              </Form>
            </div>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
