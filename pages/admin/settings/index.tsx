import { useEffect, useState } from "react";
import {
  Tabs,
  Tab,
  Card,
  Form,
  Button,
  InputGroup,
  Row,
  Col,
  Spinner,
  Alert,
} from "react-bootstrap";

const COLOR_MAP = {
  general: "#fef9c3",
  branding: "#cffafe",
  email: "#fce7f3",
  security: "#f3e8ff",
  billing: "#d1fae5",
  shipping: "#e0e7ff",
  api: "#fde68a",
  backup: "#fca5a5",
  advanced: "#f1f5f9",
};

const DEFAULTS = {
  general: {
    companyName: "Cross Border Cart",
    domain: "crossbordercart.com",
    timezone: "Asia/Dubai",
  },
  branding: {
    logo: "",
    primaryColor: "#0ea5e9",
    secondaryColor: "#16a34a",
  },
  email: {
    supportEmail: "support@crossbordercart.com",
    smtpHost: "",
    smtpUser: "",
    smtpPass: "",
  },
  security: {
    twoFactor: false,
    passwordPolicy: "medium",
  },
  billing: {
    currency: "AED",
    vat: 5,
  },
  shipping: {
    provider: "aramex",
    freeShipping: 0,
  },
  api: {
    apiKey: "",
    webhookUrl: "",
  },
  backup: {
    last: "",
    status: "",
  }
};

export default function AdminSettings() {
  const [tab, setTab] = useState<string>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [settings, setSettings] = useState({ ...DEFAULTS });

  // Fetch all settings on mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => setSettings({ ...DEFAULTS }))
      .finally(() => setLoading(false));
  }, []);

  // Save handler (generic)
  const handleSave = async (type: string) => {
    setSaving(true);
    setAlert(null);
    const payload = { [type]: settings[type as keyof typeof settings] };
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setAlert(`✅ Saved ${type} settings!`);
    } else {
      setAlert(`❌ Failed to save ${type}.`);
    }
    setSaving(false);
    setTimeout(() => setAlert(null), 2000);
  };

  // Handle input changes for each tab
  function updateField(section: string, field: string, value: any) {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section as keyof typeof settings], [field]: value },
    }));
  }

  return (
    <div>
      <h2 className="fw-bold mb-4" style={{ color: "#0284c7" }}>
        Admin Settings
      </h2>
      {alert && <Alert variant={alert.startsWith("✅") ? "success" : "danger"}>{alert}</Alert>}

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Tabs
            activeKey={tab}
            onSelect={k => setTab(k || "general")}
            className="mb-3"
          >
            {/* --- General --- */}
            <Tab eventKey="general" title="General">
              <div style={{ background: COLOR_MAP.general, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                {loading ? (
                  <Spinner animation="border" />
                ) : (
                  <Form
                    onSubmit={e => { e.preventDefault(); handleSave("general"); }}
                  >
                    <Form.Group className="mb-3">
                      <Form.Label>Company Name</Form.Label>
                      <Form.Control
                        value={settings.general.companyName}
                        onChange={e => updateField("general", "companyName", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Domain</Form.Label>
                      <Form.Control
                        value={settings.general.domain}
                        onChange={e => updateField("general", "domain", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Timezone</Form.Label>
                      <Form.Select
                        value={settings.general.timezone}
                        onChange={e => updateField("general", "timezone", e.target.value)}
                      >
                        <option value="Asia/Dubai">Asia/Dubai</option>
                        <option value="Africa/Addis_Ababa">Africa/Addis_Ababa</option>
                        <option value="Europe/London">Europe/London</option>
                      </Form.Select>
                    </Form.Group>
                    <Button type="submit" variant="primary" disabled={saving}>
                      {saving ? "Saving..." : "Save General"}
                    </Button>
                  </Form>
                )}
              </div>
            </Tab>

            {/* --- Branding --- */}
            <Tab eventKey="branding" title="Branding">
              <div style={{ background: COLOR_MAP.branding, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                <Form
                  onSubmit={e => { e.preventDefault(); handleSave("branding"); }}
                >
                  <Form.Group className="mb-3">
                    <Form.Label>Logo URL</Form.Label>
                    <Form.Control
                      value={settings.branding.logo}
                      onChange={e => updateField("branding", "logo", e.target.value)}
                      placeholder="e.g. /cross-border-logo.png"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Primary Color</Form.Label>
                    <Form.Control
                      type="color"
                      value={settings.branding.primaryColor}
                      onChange={e => updateField("branding", "primaryColor", e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Secondary Color</Form.Label>
                    <Form.Control
                      type="color"
                      value={settings.branding.secondaryColor}
                      onChange={e => updateField("branding", "secondaryColor", e.target.value)}
                    />
                  </Form.Group>
                  <Button type="submit" variant="info" disabled={saving}>
                    {saving ? "Saving..." : "Save Branding"}
                  </Button>
                </Form>
              </div>
            </Tab>

            {/* --- Email --- */}
            <Tab eventKey="email" title="Email">
              <div style={{ background: COLOR_MAP.email, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                <Form
                  onSubmit={e => { e.preventDefault(); handleSave("email"); }}
                >
                  <Form.Group className="mb-3">
                    <Form.Label>Support Email</Form.Label>
                    <Form.Control
                      value={settings.email.supportEmail}
                      onChange={e => updateField("email", "supportEmail", e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>SMTP Host</Form.Label>
                    <Form.Control
                      value={settings.email.smtpHost}
                      onChange={e => updateField("email", "smtpHost", e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>SMTP User</Form.Label>
                    <Form.Control
                      value={settings.email.smtpUser}
                      onChange={e => updateField("email", "smtpUser", e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>SMTP Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={settings.email.smtpPass}
                      onChange={e => updateField("email", "smtpPass", e.target.value)}
                    />
                  </Form.Group>
                  <Button type="submit" variant="danger" disabled={saving}>
                    {saving ? "Saving..." : "Save Email"}
                  </Button>
                </Form>
              </div>
            </Tab>

            {/* --- Security --- */}
            <Tab eventKey="security" title="Security">
              <div style={{ background: COLOR_MAP.security, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                <Form
                  onSubmit={e => { e.preventDefault(); handleSave("security"); }}
                >
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      label="Enable Two-Factor Authentication"
                      checked={settings.security.twoFactor}
                      onChange={e => updateField("security", "twoFactor", e.target.checked)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Password Policy</Form.Label>
                    <Form.Select
                      value={settings.security.passwordPolicy}
                      onChange={e => updateField("security", "passwordPolicy", e.target.value)}
                    >
                      <option value="weak">Weak</option>
                      <option value="medium">Medium</option>
                      <option value="strong">Strong</option>
                    </Form.Select>
                  </Form.Group>
                  <Button type="submit" variant="secondary" disabled={saving}>
                    {saving ? "Saving..." : "Save Security"}
                  </Button>
                </Form>
              </div>
            </Tab>

            {/* --- Billing --- */}
            <Tab eventKey="billing" title="Billing">
              <div style={{ background: COLOR_MAP.billing, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                <Form
                  onSubmit={e => { e.preventDefault(); handleSave("billing"); }}
                >
                  <Form.Group className="mb-3">
                    <Form.Label>Default Currency</Form.Label>
                    <Form.Select
                      value={settings.billing.currency}
                      onChange={e => updateField("billing", "currency", e.target.value)}
                    >
                      <option value="AED">AED - Dirham</option>
                      <option value="USD">USD - Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>VAT (%)</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      max={100}
                      value={settings.billing.vat}
                      onChange={e => updateField("billing", "vat", e.target.value)}
                    />
                  </Form.Group>
                  <Button type="submit" variant="success" disabled={saving}>
                    {saving ? "Saving..." : "Save Billing"}
                  </Button>
                </Form>
              </div>
            </Tab>

            {/* --- Shipping --- */}
            <Tab eventKey="shipping" title="Shipping">
              <div style={{ background: COLOR_MAP.shipping, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                <Form
                  onSubmit={e => { e.preventDefault(); handleSave("shipping"); }}
                >
                  <Form.Group className="mb-3">
                    <Form.Label>Default Shipping Provider</Form.Label>
                    <Form.Select
                      value={settings.shipping.provider}
                      onChange={e => updateField("shipping", "provider", e.target.value)}
                    >
                      <option value="aramex">Aramex</option>
                      <option value="dhl">DHL</option>
                      <option value="fedex">FedEx</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Free Shipping Threshold (AED)</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={settings.shipping.freeShipping}
                      onChange={e => updateField("shipping", "freeShipping", e.target.value)}
                    />
                  </Form.Group>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? "Saving..." : "Save Shipping"}
                  </Button>
                </Form>
              </div>
            </Tab>

            {/* --- API --- */}
            <Tab eventKey="api" title="API">
              <div style={{ background: COLOR_MAP.api, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                <Form
                  onSubmit={e => { e.preventDefault(); handleSave("api"); }}
                >
                  <Form.Group className="mb-3">
                    <Form.Label>API Key</Form.Label>
                    <InputGroup>
                      <Form.Control
                        value={settings.api.apiKey}
                        onChange={e => updateField("api", "apiKey", e.target.value)}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => updateField("api", "apiKey", "sk-" + Math.random().toString(36).slice(2))}
                        type="button"
                      >
                        Generate
                      </Button>
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Webhook URL</Form.Label>
                    <Form.Control
                      value={settings.api.webhookUrl}
                      onChange={e => updateField("api", "webhookUrl", e.target.value)}
                    />
                  </Form.Group>
                  <Button type="submit" variant="dark" disabled={saving}>
                    {saving ? "Saving..." : "Save API"}
                  </Button>
                </Form>
              </div>
            </Tab>

            {/* --- Backup --- */}
            <Tab eventKey="backup" title="Backup">
              <div style={{ background: COLOR_MAP.backup, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                <Row>
                  <Col>
                    <Button variant="info" className="me-2" disabled={saving}>
                      Backup Now
                    </Button>
                    <Button variant="secondary" disabled={saving}>
                      Restore Backup
                    </Button>
                  </Col>
                </Row>
                <div className="mt-3">
                  <strong>Last Backup:</strong> {settings.backup.last || "Never"}
                </div>
                <div>
                  <strong>Status:</strong> {settings.backup.status || "Up to date"}
                </div>
              </div>
            </Tab>

            {/* --- Advanced --- */}
            <Tab eventKey="advanced" title="Advanced">
              <div style={{ background: COLOR_MAP.advanced, borderRadius: 8, padding: 18, maxWidth: 500 }}>
                <Button
                  variant="danger"
                  className="mb-3"
                  disabled={saving}
                  onClick={() => {
                    setSettings({ ...DEFAULTS });
                    setAlert("✅ Reset to factory defaults! (Don't forget to Save!)");
                  }}
                >
                  Reset All Settings
                </Button>
                <div>
                  <strong>Danger Zone:</strong> This will restore everything to factory defaults. Use with caution!
                </div>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  );
}
