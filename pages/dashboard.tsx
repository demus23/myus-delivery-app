import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import axios from "axios";

import { api, getAxiosErrorMessage } from "@/lib/api";
import {
  Button,
  Card,
  Col,
  Container,
  Dropdown,
  Form,
  Image,
  InputGroup,
  Modal,
  Row,
  Spinner,
  Table,
  Alert,
  Badge,
} from "react-bootstrap";
import { useDropzone } from "react-dropzone";
import {
  FiBell,
  FiLogOut,
  FiPackage,
  FiPlus,
  FiSearch,
  FiSettings,
  FiTruck,
  FiUser,
  FiZap,
  FiCreditCard,
  FiHome,
  FiMessageSquare,
  FiHelpCircle,
  FiShield,
  FiCpu,
  FiUpload,
  FiShoppingBag,
  FiChevronRight,
  FiMapPin,
  FiFileText,
  FiDollarSign,
  FiSend,
} from "react-icons/fi";
import BillingSummary from "@/components/account/BillingSummary";
import OutstandingInvoicesCard from "@/components/account/OutstandingInvoicesCard";
import TrackingTimeline, { TrackingEvent } from "@/components/TrackingTimeline";
//import ShippingQuoteModal from "@/components/ShippingQuoteModal";
import ShippingQuoteSimple from "@/components/ShippingQuoteSimple";
import TrackingSearchCard from "@/components/tracking/TrackingSearchCard";

// -------------- Theme --------------
const MAIN_COLOR = "#0ea5a2"; // teal
const DARK = "#0b3f3e";
const LIGHT_BG = "#f6fbfb";
const CARD_GRADIENT = "linear-gradient(135deg, #e6fffb 0%, #f0fdfa 100%)";
const CHIP_BG = "#e7f9f8";

// -------------- Types (API contracts) --------------
type ProfileType = {
  name: string;
  email: string;
  phone?: string;
  membership?: "Free" | "Premium" | "Pro" | string;
  subscribed?: boolean;
  suiteId?: string | null;
  role?: string;
};

type PackageType = {
  _id?: string;
  tracking: string;
  status: "pending" | "in transit" | "delivered" | "problem" | string;
  value: number;
  updatedAt: string | number;
};

type TransactionType = {
  id: string;
  amount: number;
  status: "Pending" | "Completed" | "Failed" | string;
  date: string | number;
};

type AddressType = {
  label: string;
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
};

type PaymentMethodType = {
  id: string;
  type: "card" | "paypal" | "wire";
  details: string; // **** 4242, paypal email, IBAN tail
  isDefault?: boolean;
};

type DealType = {
  id: string;
  store: string;
  title: string;
  url: string;
  logo?: string;
  discountText?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string | number;
  read?: boolean;
};

type TrackResponse = {
  tracking: string;
  status: string;
  location?: string;
  lastUpdate?: string;
};

type DocItem = {
  label: string;
  filename: string;
  url?: string;
  uploadedAt?: string | Date;
};

// -------------- Data Hook (Typed Axios) --------------
const useDashboardData = () => {
  const { data: session } = useSession();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [addresses, setAddresses] = useState<AddressType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [deals, setDeals] = useState<DealType[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [documents, setDocuments] = useState<DocItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!session?.user?.id) return;

      try {
        setLoading(true);
        setError("");

        const [
          profRes,
          pkgsRes,
          txRes,
          addrRes,
          payRes,
          dealsRes,
          notifRes,
          docsRes,
        ] = await Promise.all([
          api.get<ProfileType>("user/profile"),
          api.get<{ packages: PackageType[] }>("packages", {
            params: { user: session.user.id },
          }),
          api.get<{ transactions: TransactionType[] }>("transactions", {
            params: { user: session.user.id },
          }),
          api.get<{ addresses: AddressType[] }>("user/addresses"),
          api.get<{ methods: PaymentMethodType[] }>("user/payment"),
          api.get<{ deals: DealType[] }>("deals"),
          api.get<{ notifications: NotificationItem[] }>("notifications"),
          api.get<{ documents: DocItem[] }>("user/documents"),
        ]);

        if (cancelled) return;

        setProfile(profRes.data);
        setPackages(pkgsRes.data.packages ?? []);
        setTransactions(txRes.data.transactions ?? []);
        setAddresses(addrRes.data.addresses ?? []);
        setPaymentMethods(payRes.data.methods ?? []);
        setDeals(dealsRes.data.deals ?? []);
        setNotifications(notifRes.data.notifications ?? []);
        setDocuments(docsRes.data.documents ?? []);
      } catch (err: unknown) {
        if (!cancelled) setError(getAxiosErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // refreshers
  const refetchPackages = async () => {
    if (!session?.user?.id) return;
    const r = await api.get<{ packages: PackageType[] }>("packages", {
      params: { user: session.user.id },
    });
    setPackages(r.data.packages ?? []);
  };

  const refetchTransactions = async () => {
    if (!session?.user?.id) return;
    const r = await api.get<{ transactions: TransactionType[] }>("transactions", {
      params: { user: session.user.id },
    });
    setTransactions(r.data.transactions ?? []);
  };

  const refetchAddresses = async () => {
    const r = await api.get<{ addresses: AddressType[] }>("user/addresses");
    setAddresses(r.data.addresses ?? []);
  };

  const refetchProfile = async () => {
    const r = await api.get<ProfileType>("user/profile");
    setProfile(r.data);
  };

  // actions
  // ⬇️ Updated: Get latest tracking event from /api/tracking/events
  const trackPackage = async (tracking: string): Promise<TrackResponse> => {
    const t = (tracking || "").trim();
    if (!t) throw new Error("Tracking number is required");

    const res = await fetch(
      `/api/tracking/events?trackingNo=${encodeURIComponent(t)}&limit=1`
    );
    if (!res.ok) throw new Error("Tracking lookup failed");

    const data = await res.json();
    const ev = data?.events?.[0];

    if (!ev) return { tracking: t, status: "Not found" };

    return {
      tracking: t,
      status: ev.status,
      location: ev.location || "",
      lastUpdate: ev.createdAt,
    };
  };

  const addAddress = async (addr: AddressType) => {
    const r = await api.post<{ addresses: AddressType[] }>(
      "user/addresses",
      addr
    );
    setAddresses(r.data.addresses ?? []);
  };

  const updateAddress = async (index: number, addr: AddressType) => {
    const r = await api.put<{ addresses: AddressType[] }>("user/addresses", {
      index,
      ...addr,
    });
    setAddresses(r.data.addresses ?? []);
  };

  const deleteAddress = async (index: number) => {
    const r = await api.request<{ addresses: AddressType[] }>({
      url: "user/addresses",
      method: "DELETE",
      data: { index } as any,
    });
    setAddresses(r.data.addresses ?? []);
  };

  const saveProfile = async (data: Partial<ProfileType>) => {
    const r = await api.put<ProfileType>("user/profile", data);
    setProfile(r.data);
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    await api.put<{ ok: boolean; message?: string }>("user/password", {
      currentPassword,
      newPassword,
    });
  };

  const addPaymentMethod = async (payload: {
    type: PaymentMethodType["type"];
    tokenOrDetails: string;
    makeDefault?: boolean;
    billingAddress?: any;
  }) => {
    const r = await api.post<{ methods: PaymentMethodType[] }>(
      "user/payment",
      payload
    );
    setPaymentMethods(r.data.methods ?? []);
  };

  const deletePaymentMethod = async (id: string) => {
    const r = await api.request<{ methods: PaymentMethodType[] }>({
      url: "user/payment",
      method: "DELETE",
      data: { id } as any,
    });
    setPaymentMethods(r.data.methods ?? []);
  };

  // Documents
  const refetchDocuments = async () => {
    const r = await api.get<{ documents: DocItem[] }>("user/documents");
    setDocuments(r.data.documents ?? []);
  };

  const uploadDocuments = async (files: File[], label?: string) => {
    // Using fetch for multipart is fine
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f);
      if (label) fd.append("label", label);
      const resp = await fetch("/api/user/documents", {
        method: "POST",
        body: fd,
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e?.error || "Upload failed");
      }
    }
    await refetchDocuments();
  };

  const deleteDocument = async (filename: string) => {
    const r = await fetch(
      `/api/user/documents?filename=${encodeURIComponent(filename)}`,
      { method: "DELETE" }
    );
    if (!r.ok) throw new Error("Delete failed");
    await refetchDocuments();
  };

  return {
    loading,
    error,
    profile,
    packages,
    transactions,
    addresses,
    paymentMethods,
    deals,
    notifications,
    documents,
    refetchPackages,
    refetchTransactions,
    refetchAddresses,
    refetchProfile,
    trackPackage,
    addAddress,
    updateAddress,
    deleteAddress,
    saveProfile,
    changePassword,
    addPaymentMethod,
    deletePaymentMethod,
    refetchDocuments,
    uploadDocuments,
    deleteDocument,
  };
};

// -------------- Modals (typed, trimmed logic) --------------
type BasicModalProps = { show: boolean; onHide: () => void };

// AI Chat
function AIChatModal({ show, onHide }: BasicModalProps) {
  const [messages, setMessages] = useState<
    { role: "assistant" | "user"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Hi! I can help with shipping, tracking, and store suggestions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!show) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I can help with shipping, tracking, and store suggestions.",
        },
      ]);
      setInput("");
    }
  }, [show]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, show]);

  const send = async () => {
    if (!input.trim()) return;
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await api.post<{ aiMessage: string }>("ai/chat", {
        messages: next,
      });
      setMessages([
        ...next,
        { role: "assistant", content: r.data.aiMessage || "…" },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry, I couldn’t reach AI right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FiCpu className="me-2" />
          AI Assistant
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: LIGHT_BG }}>
        <div style={{ maxHeight: 320, overflowY: "auto", paddingBottom: 8 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                textAlign: m.role === "user" ? "right" : "left",
                margin: "8px 0",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  background: m.role === "assistant" ? "#ccfbf1" : "#e9d5ff",
                  color: "#064e3b",
                  borderRadius: 12,
                  padding: "8px 12px",
                  maxWidth: 360,
                }}
              >
                {m.content}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <InputGroup>
          <Form.Control
            placeholder="Ask about shipping costs, delivery time, best stores…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && send()}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            {loading ? <Spinner size="sm" /> : <FiSend />}
          </Button>
        </InputGroup>
      </Modal.Body>
    </Modal>
  );
}

// Support
type PassModalProps = BasicModalProps & {
  onChangePass: (cur: string, next: string) => Promise<void>;
};
function SupportModal({ show, onHide }: BasicModalProps) {
  const [topic, setTopic] = useState("General");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!show) {
      setTopic("General");
      setMessage("");
      setSent(false);
    }
  }, [show]);
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FiHelpCircle className="me-2" />
          Support
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {sent ? (
          <Alert variant="success">
            Thanks! We’ll get back to you at your email.
          </Alert>
        ) : (
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <Form.Label>Topic</Form.Label>
            <Form.Select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option>General</option>
              <option>Billing</option>
              <option>Shipping</option>
              <option>Technical</option>
            </Form.Select>
            <Form.Label className="mt-2">Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <Button className="mt-3 w-100" type="submit" variant="primary">
              Send
            </Button>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}

// Profile
type ProfileModalProps = BasicModalProps & {
  profile: ProfileType | null;
  onSave: (p: Partial<ProfileType>) => Promise<void>;
};
function ProfileModal({ show, onHide, profile, onSave }: ProfileModalProps) {
  const [form, setForm] = useState<Partial<ProfileType>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (show && profile)
      setForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      });
    if (!show) setForm({});
  }, [show, profile]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FiUser className="me-2" />
          Profile
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            await onSave(form);
            setSaving(false);
            onHide();
          }}
        >
          <Form.Label>Name</Form.Label>
          <Form.Control
            value={form.name ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
          <Form.Label className="mt-2">Email</Form.Label>
          <Form.Control
            type="email"
            value={form.email ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
            required
          />
          <Form.Label className="mt-2">Phone</Form.Label>
          <Form.Control
            value={form.phone ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, phone: e.target.value }))
            }
          />
          <Button className="mt-3 w-100" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" /> : "Save"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

// Password
function PassModal({ show, onHide, onChangePass }: PassModalProps) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!show) {
      setCur("");
      setNext("");
      setMsg("");
      setSaving(false);
    }
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FiShield className="me-2" />
          Change Password
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await onChangePass(cur, next);
              setMsg("Password updated.");
           } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed";
  setMsg(msg);     
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Label>Current Password</Form.Label>
          <Form.Control
            type="password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            required
          />
          <Form.Label className="mt-2">New Password</Form.Label>
          <Form.Control
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          {msg && (
            <Alert
              className="mt-2"
              variant={msg.includes("updated") ? "success" : "danger"}
            >
              {msg}
            </Alert>
          )}
          <Button className="mt-3 w-100" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" /> : "Update"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}


// Membership
type MembershipModalProps = BasicModalProps & {
  profile: ProfileType | null;
  onSave: (p: Partial<ProfileType>) => Promise<void>;
};
function MembershipModal({
  show,
  onHide,
  profile,
  onSave,
}: MembershipModalProps) {
  const [plan, setPlan] = useState<ProfileType["membership"]>("Free");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (show) setPlan(profile?.membership ?? "Free");
  }, [show, profile]);
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FiZap className="me-2" />
          Membership
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            await onSave({ membership: plan });
            setSaving(false);
            onHide();
          }}
        >
          <Form.Check
            type="radio"
            id="m-free"
            name="m"
            label="Free"
            checked={plan === "Free"}
            onChange={() => setPlan("Free")}
            className="mb-2"
          />
          <Form.Check
            type="radio"
            id="m-premium"
            name="m"
            label="Premium"
            checked={plan === "Premium"}
            onChange={() => setPlan("Premium")}
            className="mb-2"
          />
          <Form.Check
            type="radio"
            id="m-pro"
            name="m"
            label="Pro"
            checked={plan === "Pro"}
            onChange={() => setPlan("Pro")}
            className="mb-2"
          />
          <Button className="mt-2 w-100" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" /> : "Save Plan"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

// Payment
type BillingAddress = {
  country: string;
  fullName: string;
  line1: string;
  line2?: string;
  state?: string;
  city: string;
  postalCode: string;
};

type PaymentModalProps = BasicModalProps & {
  methods: PaymentMethodType[];
  onAdd: (p: {
    type: PaymentMethodType["type"];
    tokenOrDetails: string;
    makeDefault?: boolean;
    billingAddress?: BillingAddress;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function PaymentModal({
  show,
  onHide,
  methods,
  onAdd,
  onDelete,
}: PaymentModalProps) {
  const [step, setStep] = useState<0 | 1>(0);
  const [makeDefault, setMakeDefault] = useState(true);

  const [addr, setAddr] = useState<BillingAddress>({
    country: "United Arab Emirates",
    fullName: "",
    line1: "",
    line2: "",
    state: "",
    city: "",
    postalCode: "",
  });

  const [type, setType] = useState<PaymentMethodType["type"]>("card");

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [exp, setExp] = useState(""); // MM/YY
  const [cvv, setCvv] = useState("");
  const [issuingBank, setIssuingBank] = useState("");
  const [issuingPhone, setIssuingPhone] = useState("");
  const [issuingCountry, setIssuingCountry] = useState("");

  const [paypalEmail, setPaypalEmail] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      setStep(0);
      setMakeDefault(true);
      setAddr({
        country: "United Arab Emirates",
        fullName: "",
        line1: "",
        line2: "",
        state: "",
        city: "",
        postalCode: "",
      });
      setType("card");
      setCardName("");
      setCardNumber("");
      setExp("");
      setCvv("");
      setIssuingBank("");
      setIssuingPhone("");
      setIssuingCountry("");
      setPaypalEmail("");
      setIban("");
      setSwift("");
      setLoading(false);
    }
  }, [show]);

  function maskCard(num: string) {
    const digits = (num || "").replace(/\D/g, "");
    const last4 = digits.slice(-4) || "••••";
    return `**** ${last4}`;
  }

  async function submit() {
    setLoading(true);
    try {
      if (type === "card") {
        const masked = `${maskCard(cardNumber)} (${exp || "MM/YY"})`;
        await onAdd({
          type: "card",
          tokenOrDetails: masked,
          makeDefault,
          billingAddress: addr,
        });
      } else if (type === "paypal") {
        await onAdd({
          type: "paypal",
          tokenOrDetails: paypalEmail.trim(),
          makeDefault,
          billingAddress: addr,
        });
      } else {
        const details = `${iban.trim()} ${
          swift ? `(${swift.trim()})` : ""
        }`.trim();
        await onAdd({
          type: "wire",
          tokenOrDetails: details,
          makeDefault,
          billingAddress: addr,
        });
      }
      onHide();
    } finally {
      setLoading(false);
    }
  }

  const canContinueBilling =
    !!addr.country &&
    !!addr.fullName &&
    !!addr.line1 &&
    !!addr.city &&
    !!addr.postalCode;

  const canSaveMethod =
    type === "card"
      ? !!cardName && !!cardNumber && !!exp && !!cvv
      : type === "paypal"
      ? !!paypalEmail
      : !!iban;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <FiCreditCard /> Payment Methods
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Saved methods */}
        <h6 className="mb-2">Saved Methods</h6>
        {methods.length === 0 ? (
          <div className="text-muted mb-3">No saved methods.</div>
        ) : (
          <ul className="list-group mb-3">
            {methods.map((m) => (
              <li
                key={m.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>
                  <Badge bg="light" text="dark" className="me-2">
                    {m.type.toUpperCase()}
                  </Badge>
                  {m.details}{" "}
                  {m.isDefault && <Badge bg="success">Default</Badge>}
                </span>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => onDelete(m.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Wizard steps */}
        <div className="d-flex align-items-center gap-2 mb-2">
          <Badge bg={step === 0 ? "primary" : "light"}>1</Badge>
          <span className={step === 0 ? "fw-bold" : ""}>Billing Address</span>
          <div className="flex-grow-1" />
          <Badge bg={step === 1 ? "primary" : "light"}>2</Badge>
          <span className={step === 1 ? "fw-bold" : ""}>Add Method</span>
        </div>

        {step === 0 ? (
          <Form>
            <Row className="g-2">
              <Col md={12}>
                <Form.Label>Country *</Form.Label>
                <Form.Control
                  value={addr.country}
                  onChange={(e) =>
                    setAddr({ ...addr, country: e.target.value })
                  }
                />
              </Col>
              <Col md={12}>
                <Form.Label>Full Name *</Form.Label>
                <Form.Control
                  value={addr.fullName}
                  onChange={(e) =>
                    setAddr({ ...addr, fullName: e.target.value })
                  }
                />
              </Col>
              <Col md={12}>
                <Form.Label>Address Line 1 *</Form.Label>
                <Form.Control
                  value={addr.line1}
                  onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
                />
              </Col>
              <Col md={12}>
                <Form.Label>Address Line 2</Form.Label>
                <Form.Control
                  value={addr.line2 || ""}
                  onChange={(e) => setAddr({ ...addr, line2: e.target.value })}
                />
              </Col>
              <Col md={6}>
                <Form.Label>State / Province</Form.Label>
                <Form.Control
                  value={addr.state || ""}
                  onChange={(e) => setAddr({ ...addr, state: e.target.value })}
                />
              </Col>
              <Col md={3}>
                <Form.Label>City *</Form.Label>
                <Form.Control
                  value={addr.city}
                  onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Postal Code *</Form.Label>
                <Form.Control
                  value={addr.postalCode}
                  onChange={(e) =>
                    setAddr({ ...addr, postalCode: e.target.value })
                  }
                />
              </Col>
            </Row>
          </Form>
        ) : (
          <>
            <Row className="g-2">
              <Col md={4}>
                <Form.Label>Method</Form.Label>
                <Form.Select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="card">Card</option>
                  <option value="paypal">PayPal</option>
                  <option value="wire">Wire</option>
                </Form.Select>
              </Col>
              <Col md={8} className="d-flex align-items-end">
                <Form.Check
                  type="checkbox"
                  className="ms-auto"
                  label="Make default"
                  checked={makeDefault}
                  onChange={(e) => setMakeDefault(e.target.checked)}
                />
              </Col>
            </Row>

            {type === "card" && (
              <Form className="mt-2">
                <Form.Label>First & Last Name on Card *</Form.Label>
                <Form.Control
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
                <Form.Label className="mt-2">
                  Credit Card Number *
                </Form.Label>
                <Form.Control
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
                <Row className="g-2 mt-1">
                  <Col md={4}>
                    <Form.Label>Expiration (MM / YY) *</Form.Label>
                    <Form.Control
                      placeholder="MM / YY"
                      value={exp}
                      onChange={(e) => setExp(e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Label>CVV *</Form.Label>
                    <Form.Control
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                    />
                  </Col>
                </Row>
                <Form.Label className="mt-2">Name of Issuing Bank</Form.Label>
                <Form.Control
                  value={issuingBank}
                  onChange={(e) => setIssuingBank(e.target.value)}
                />
                <Row className="g-2 mt-1">
                  <Col md={6}>
                    <Form.Label>Country of Issuing Bank</Form.Label>
                    <Form.Control
                      value={issuingCountry}
                      onChange={(e) => setIssuingCountry(e.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Telephone of Issuing Bank</Form.Label>
                    <Form.Control
                      value={issuingPhone}
                      onChange={(e) => setIssuingPhone(e.target.value)}
                    />
                  </Col>
                </Row>
              </Form>
            )}

            {type === "paypal" && (
              <Form className="mt-2">
                <Form.Label>PayPal Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                />
              </Form>
            )}

            {type === "wire" && (
              <Form className="mt-2">
                <Form.Label>IBAN *</Form.Label>
                <Form.Control
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                />
                <Form.Label className="mt-2">SWIFT</Form.Label>
                <Form.Control
                  value={swift}
                  onChange={(e) => setSwift(e.target.value)}
                />
              </Form>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        {step === 0 ? (
          <Button onClick={() => setStep(1)} disabled={!canContinueBilling}>
            Continue
          </Button>
        ) : (
          <>
            <Button variant="outline-secondary" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={submit} disabled={!canSaveMethod || loading}>
              {loading ? <Spinner size="sm" /> : "Add Method"}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}

/* ===========================
   Address Modal (REUSABLE)
   =========================== */
type AddressForm = {
  label: string;
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
};

type AddressModalProps = {
  show: boolean;
  onHide: () => void;
  initial?: AddressForm;
  onSave: (form: AddressForm) => Promise<void>;
  saving?: boolean;
  title?: string;
};

function AddressModal({
  show,
  onHide,
  initial,
  onSave,
  saving,
  title = "Add Address",
}: AddressModalProps) {
  const [form, setForm] = useState<AddressForm>(
    initial ?? { label: "", address: "", city: "", country: "", postalCode: "" }
  );

  useEffect(() => {
    setForm(
      initial ?? { label: "", address: "", city: "", country: "", postalCode: "" }
    );
  }, [initial, show]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave(form);
          }}
        >
          <Form.Label>Label</Form.Label>
          <Form.Control
            placeholder="Home, Office, etc."
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            required
          />
          <Form.Label className="mt-2">Address</Form.Label>
          <Form.Control
            placeholder="Street / Building / Apt"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            required
          />
          <Form.Label className="mt-2">City</Form.Label>
          <Form.Control
            value={form.city ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
          <Form.Label className="mt-2">Country</Form.Label>
          <Form.Control
            value={form.country ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
          />
          <Form.Label className="mt-2">Postal Code</Form.Label>
          <Form.Control
            value={form.postalCode ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, postalCode: e.target.value }))
            }
          />
          <Button type="submit" className="mt-3 w-100" disabled={!!saving}>
            {saving ? <Spinner size="sm" /> : "Save"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

type NewChargeModalProps = {
  show: boolean;
  onHide: () => void;
  methods: PaymentMethodType[];
  onCreated?: (invoiceNo?: string) => void;
};

function NewChargeModal({
  show,
  onHide,
  methods,
  onCreated,
}: NewChargeModalProps) {
  const [amount, setAmount] = useState<string>("100.00");
  const [currency, setCurrency] = useState<string>("AED");
  const [description, setDescription] = useState<string>("Manual charge");
  const [methodId, setMethodId] = useState<string>("");
  const [payType, setPayType] = useState<"saved" | "wire">("saved");
  const [wireRef, setWireRef] = useState<string>("");

  // minimal billing (required by the /api/charge route unless the user already has one saved)
  const [bill, setBill] = useState<BillingAddress>({
    country: "United Arab Emirates",
    fullName: "",
    line1: "",
    city: "",
    postalCode: "",
    state: "",
    line2: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const canSubmit =
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    currency &&
    ((payType === "saved" && methodId) || payType === "wire") &&
    !!bill.fullName &&
    !!bill.line1 &&
    !!bill.city &&
    !!bill.country &&
    !!bill.postalCode;

  useEffect(() => {
    if (!show) {
      setAmount("100.00");
      setCurrency("AED");
      setDescription("Manual charge");
      setMethodId("");
      setPayType("saved");
      setWireRef("");
      setBill({
        country: "United Arab Emirates",
        fullName: "",
        line1: "",
        city: "",
        postalCode: "",
        state: "",
        line2: "",
      });
      setSubmitting(false);
    }
  }, [show]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const amountMinor = Math.round(parseFloat(amount) * 100); // /api/charge expects minor units
      const base = {
        amount: amountMinor,
        currency,
        description,
        billingAddress: bill,
      };

      const body =
        payType === "saved"
          ? { ...base, methodId }
          : {
              ...base,
              method: {
                type: "wire",
                label: "Wire transfer",
                wireReference: wireRef,
              },
            };

      const r = await axios.post<{
        ok: boolean;
        data?: any;
        error?: string;
      }>("/api/charge", body);
      if (!r.data?.ok) throw new Error(r.data?.error || "Charge failed");

      onHide();
      onCreated?.(r.data?.data?.invoiceNo);
   } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Charge failed";
  alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FiDollarSign className="me-2" /> Pay / Create Invoice
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Amount & currency */}
        <Row className="g-2">
          <Col md={6}>
            <Form.Label>Amount</Form.Label>
            <InputGroup>
              <Form.Control
                type="number"
                min={0.01}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Form.Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Form.Select>
            </InputGroup>
          </Col>
          <Col md={6}>
            <Form.Label>Description</Form.Label>
            <Form.Control
              placeholder="What is this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Col>
        </Row>

        {/* Payment method */}
        <Row className="g-2 mt-3">
          <Col md={12}>
            <Form.Label>Payment</Form.Label>
            <div className="d-flex gap-3">
              <Form.Check
                type="radio"
                id="pay-saved"
                label="Use saved method"
                checked={payType === "saved"}
                onChange={() => setPayType("saved")}
              />
              <Form.Check
                type="radio"
                id="pay-wire"
                label="Wire (creates Pending invoice)"
                checked={payType === "wire"}
                onChange={() => setPayType("wire")}
              />
            </div>
          </Col>

          {payType === "saved" ? (
            <Col md={12}>
              {methods.length === 0 ? (
                <Alert variant="warning" className="mt-2">
                  You have no saved payment methods. Use the “Payment” button on
                  the dashboard to add one, then come back here.
                </Alert>
              ) : (
                <Form.Select
                  className="mt-2"
                  value={methodId}
                  onChange={(e) => setMethodId(e.target.value)}
                >
                  <option value="">Select a saved method…</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.type.toUpperCase()} — {m.details}{" "}
                      {m.isDefault ? "(default)" : ""}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Col>
          ) : (
            <Col md={12}>
              <Form.Label className="mt-2">
                Wire reference (optional)
              </Form.Label>
              <Form.Control
                placeholder="Purchase ref / Note for accounting"
                value={wireRef}
                onChange={(e) => setWireRef(e.target.value)}
              />
              <div className="form-text">
                The invoice will be created in “pending” status.
              </div>
            </Col>
          )}
        </Row>

        {/* Billing address */}
        <hr className="my-3" />
        <h6>Billing Address</h6>
        <Row className="g-2">
          <Col md={6}>
            <Form.Label>Full name *</Form.Label>
            <Form.Control
              value={bill.fullName}
              onChange={(e) => setBill({ ...bill, fullName: e.target.value })}
            />
          </Col>
          <Col md={6}>
            <Form.Label>Country *</Form.Label>
            <Form.Control
              value={bill.country}
              onChange={(e) => setBill({ ...bill, country: e.target.value })}
            />
          </Col>
          <Col md={12}>
            <Form.Label>Address line 1 *</Form.Label>
            <Form.Control
              value={bill.line1}
              onChange={(e) => setBill({ ...bill, line1: e.target.value })}
            />
          </Col>
          <Col md={12}>
            <Form.Label>Address line 2</Form.Label>
            <Form.Control
              value={bill.line2 || ""}
              onChange={(e) => setBill({ ...bill, line2: e.target.value })}
            />
          </Col>
          <Col md={4}>
            <Form.Label>City *</Form.Label>
            <Form.Control
              value={bill.city}
              onChange={(e) => setBill({ ...bill, city: e.target.value })}
            />
          </Col>
          <Col md={4}>
            <Form.Label>State/Province</Form.Label>
            <Form.Control
              value={bill.state || ""}
              onChange={(e) => setBill({ ...bill, state: e.target.value })}
            />
          </Col>
          <Col md={4}>
            <Form.Label>Postal code *</Form.Label>
            <Form.Control
              value={bill.postalCode}
              onChange={(e) =>
                setBill({ ...bill, postalCode: e.target.value })
              }
            />
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!canSubmit || submitting}>
          {submitting ? <Spinner size="sm" /> : "Create Invoice / Pay"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// -------------- Main Dashboard --------------
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const {
    loading,
    error,
    profile,
    packages,
    transactions,
    addresses,
    paymentMethods,
    deals,
    notifications,
    documents,
    refetchPackages,
    refetchTransactions,
    refetchAddresses,
    refetchProfile,
    trackPackage,
    addAddress,
    updateAddress,
    deleteAddress,
    saveProfile,
    changePassword,
    addPaymentMethod,
    deletePaymentMethod,
    refetchDocuments,
    uploadDocuments,
    deleteDocument,
  } = useDashboardData();

  // UI state
  const [showAI, setShowAI] = useState<boolean>(false);
  const [showQuote, setShowQuote] = useState<boolean>(false); // ⬅ shipping quote modal
  const [showSupport, setShowSupport] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showPass, setShowPass] = useState<boolean>(false);
  const [showMembership, setShowMembership] = useState<boolean>(false);
  const [showPay, setShowPay] = useState<boolean>(false);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const [showCharge, setShowCharge] = useState(false);

  // Track
  const [tracking, setTracking] = useState<string>("");
  const [trackRes, setTrackRes] = useState<TrackResponse | null>(null);
  const [trackLoading, setTrackLoading] = useState<boolean>(false);
  // Tracking modal state
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackPkg, setTrackPkg] = useState<PackageType | null>(null);
  const [trackEvents, setTrackEvents] = useState<TrackingEvent[]>([]);
  const [trackBusy, setTrackBusy] = useState(false);
  const [showUserQuote, setShowUserQuote] = useState(false);


  async function loadTrack(trackingNo: string) {
    setTrackBusy(true);
    try {
      const r = await fetch(
        `/api/tracking/events?trackingNo=${encodeURIComponent(trackingNo)}`
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok)
        throw new Error(data?.error || "Failed to load events");
      setTrackEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e: unknown) {
  setTrackEvents([]);
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to load tracking";
  alert(msg);


    } finally {
      setTrackBusy(false);
    }
  }

  function openTrackModal(p: PackageType) {
    setTrackPkg(p);
    setTrackOpen(true);
    loadTrack(p.tracking);
  }

  // Documents upload UI state
  const [docUploading, setDocUploading] = useState<boolean>(false);
  const onDrop = async (files: File[]) => {
    if (!files.length) return;
    setDocUploading(true);
    try {
      await uploadDocuments(files);
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Upload failed";
  alert(msg);
    } finally {
      setDocUploading(false);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // Address modal state
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [addrEditingIndex, setAddrEditingIndex] = useState<number | null>(null);
  const [addrInitial, setAddrInitial] =
    useState<AddressForm | undefined>(undefined);
  const [addrSaving, setAddrSaving] = useState(false);

  async function saveAddress(form: AddressForm) {
    setAddrSaving(true);
    try {
      if (addrEditingIndex === null) await addAddress(form);
      else await updateAddress(addrEditingIndex, form);
      await refetchAddresses();
      setAddrModalOpen(false);
    } finally {
      setAddrSaving(false);
    }
  }

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Pretty status helper
  function prettyStatus(s?: string) {
    if (!s) return "";
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (status === "loading") {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: 300 }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  // ---- Handlers ----
  const doTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tracking.trim()) return;
    setTrackLoading(true);
    try {
      const res = await trackPackage(tracking.trim());
      setTrackRes(res);
    } catch {
      setTrackRes({ tracking, status: "Not found" });
    } finally {
      setTrackLoading(false);
    }
  };

  const virtualAddress = `CrossBorderChart Warehouse
${profile?.suiteId ? `Suite ${profile.suiteId}` : "Suite —"}
Business Bay, Dubai, UAE
+971-50-123-4567`;

  // ---- UI ----
  return (
    <div style={{ minHeight: "100vh", background: LIGHT_BG }}>
      {/* Topbar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: "#fff",
          borderBottom: "1px solid #e8eef0",
        }}
      >
        <Container fluid className="py-2">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <Image src="/logo.svg" alt="logo" height={36} />
              <h5 className="mb-0" style={{ color: MAIN_COLOR, fontWeight: 800 }}>
                CrossBorderChart
              </h5>
              <Badge bg="light" text="dark">
                Dashboard
              </Badge>
            </div>
            <div className="d-flex align-items-center gap-2 ms-auto flex-nowrap">
              <Form onSubmit={doTrack} className="d-none d-md-flex">
                <InputGroup>
                  <Form.Control
                    placeholder="Track package #"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="outline-secondary"
                    disabled={trackLoading}
                  >
                    {trackLoading ? <Spinner size="sm" /> : <FiSearch />}
                  </Button>
                </InputGroup>
              </Form>

              {/* Inline result for desktop */}
              {trackRes && (
                <div className="d-none d-md-flex align-items-center ms-2 small">
                  <Badge bg="light" text="dark" className="me-2">
                    {trackRes.tracking}
                  </Badge>
                  <span className="fw-semibold">
                    {prettyStatus(trackRes.status)}
                  </span>
                  {trackRes.location && (
                    <span className="ms-2">• {trackRes.location}</span>
                  )}
                  {trackRes.lastUpdate && (
                    <span className="text-muted ms-2">
                      {new Date(trackRes.lastUpdate).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              <Dropdown
                show={notifOpen}
                onToggle={(v) => setNotifOpen(Boolean(v))}
                align="end"
              >
                <Dropdown.Toggle
                  as="button"
                  className="btn btn-light position-relative"
                >
                  <FiBell />
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {unreadCount}
                    </span>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ minWidth: 320 }}>
                  <Dropdown.Header>Notifications</Dropdown.Header>
                  {notifications.length === 0 ? (
                    <span className="dropdown-item-text text-muted">
                      No notifications.
                    </span>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div key={n.id} className="dropdown-item-text">
                        <div className="fw-semibold">{n.title}</div>
                        <div className="small text-muted">
                          {typeof n.createdAt === "string"
                            ? new Date(n.createdAt).toLocaleString()
                            : new Date(n.createdAt).toLocaleString()}
                        </div>
                        <div className="small">{n.body}</div>
                        <hr className="my-1" />
                      </div>
                    ))
                  )}
                  <div className="px-3 pb-2">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => alert("Open full notifications page…")}
                    >
                      View all
                    </Button>
                  </div>
                </Dropdown.Menu>
              </Dropdown>

              {(profile?.role === "admin" || profile?.role === "superadmin") && (
                <a
                  href="/admin/dashboard"
                  className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
                >
                  <FiSettings className="me-1" /> Switch to Admin
                </a>
              )}

              <a
                href="/charges"
                className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
              >
                <FiFileText className="me-1" /> My Invoices
              </a>

              <button
                type="button"
                className="btn btn-outline-danger d-inline-flex align-items-center gap-2"
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="Logout"
              >
                <FiLogOut /> <span className="d-none d-sm-inline">Logout</span>
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* Welcome stripe */}
      <div
        style={{ background: CARD_GRADIENT, borderBottom: "1px solid #eaf4f5" }}
      >
        <Container className="py-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between">
            <div>
              <div className="text-muted small">Welcome back</div>
              <h4 className="mb-1" style={{ color: DARK, fontWeight: 800 }}>
                {profile?.name || session?.user?.name || "User"}
                {profile?.suiteId ? ` · Suite ${profile.suiteId}` : ""}
              </h4>
              <div className="small">
                Membership:{" "}
                <Badge bg="success" style={{ background: MAIN_COLOR }}>
                  {profile?.membership || "Free"}
                </Badge>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                onClick={() => setShowUserQuote(true)}
              >
                <FiZap className="me-1" />
                Shipping Calculator
              </Button>
              <Button variant="outline-secondary" onClick={() => setShowAI(true)}>
                <FiCpu className="me-1" />
                AI Assistant
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => setShowSupport(true)}
              >
                <FiMessageSquare className="me-1" />
                Support
              </Button>
            </div>
          </div>
        </Container>
      </div>
      

      <Container className="py-4">
        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

        {/* Quick actions */}
        <Row className="g-3">
          <Col lg={4}>
            <Card className="shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-muted small">Recently Arrived / Shipped</div>
                    <h5 className="mb-0">{packages.length}</h5>
                  </div>
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 44, height: 44, background: CHIP_BG }}
                  >
                    <FiPackage color={MAIN_COLOR} />
                  </div>
                </div>
                <div className="mt-2 small text-muted">
                  Latest: {packages[0] ? packages[0].tracking : "—"}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            <Card className="shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-muted small">Transactions</div>
                    <h5 className="mb-0">{transactions.length}</h5>
                  </div>
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 44, height: 44, background: CHIP_BG }}
                  >
                    <FiCreditCard color={MAIN_COLOR} />
                  </div>
                </div>
                <div className="mt-2 small text-muted">
                  Latest:{" "}
                  {transactions[0]?.amount
                    ? `${transactions[0].amount} AED`
                    : "—"}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            <Card className="shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-muted small">Addresses</div>
                    <h5 className="mb-0">{addresses.length}</h5>
                  </div>
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 44, height: 44, background: CHIP_BG }}
                  >
                    <FiHome color={MAIN_COLOR} />
                  </div>
                </div>
                <div className="mt-2 small text-muted">
                  Manage delivery preferences
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

          <div style={{ marginTop: 16 }}>
        <TrackingSearchCard initialTrackingNo="AB23456" />
      </div>

        {/* Track (mobile quick) */}
        <Form onSubmit={doTrack} className="d-md-none mt-3">
          <InputGroup>
            <Form.Control
              placeholder="Track package #"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
            <Button type="submit" variant="outline-secondary" disabled={trackLoading}>
              {trackLoading ? <Spinner size="sm" /> : <FiSearch />}
            </Button>
          </InputGroup>
          {trackRes && (
            <Alert className="mt-2" variant="light">
              <div>
                <strong>{trackRes.tracking}</strong> —{" "}
                {prettyStatus(trackRes.status)}
              </div>
              {trackRes.location && <div>Location: {trackRes.location}</div>}
              {trackRes.lastUpdate && (
                <div>Updated: {new Date(trackRes.lastUpdate).toLocaleString()}</div>
              )}
            </Alert>
          )}
        </Form>

        {/* Address + Stores */}
        <Row className="g-3 mt-1">
          <Col lg={7}>
            <Card className="shadow-sm">
              <Card.Header style={{ background: "white" }}>
                <strong>
                  <FiMapPin className="me-1" /> Your UAE Virtual Address
                </strong>
              </Card.Header>
              <Card.Body>
                <pre
                  style={{
                    background: "#f3f7f7",
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  {virtualAddress}
                </pre>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => navigator.clipboard.writeText(virtualAddress)}
                >
                  Copy Address
                </Button>
              </Card.Body>
            </Card>

            {/* Address Book */}
            <Card className="shadow-sm mt-3">
              <Card.Header style={{ background: "white" }}>
                <strong>
                  <FiHome className="me-1" /> Address Book (Home Country)
                </strong>
              </Card.Header>
              <Card.Body>
                {addresses.length === 0 ? (
                  <div className="text-muted">No addresses yet.</div>
                ) : (
                  <Table hover responsive size="sm" className="mb-2">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Address</th>
                        <th>City</th>
                        <th>Country</th>
                        <th>Postal</th>
                        <th style={{ width: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addresses.map((a, idx) => (
                        <tr key={`${a.label}-${idx}`}>
                          <td>{a.label}</td>
                          <td>{a.address}</td>
                          <td>{a.city || "—"}</td>
                          <td>{a.country || "—"}</td>
                          <td>{a.postalCode || "—"}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              className="me-2"
                              onClick={() => {
                                setAddrEditingIndex(idx);
                                setAddrInitial({
                                  label: a.label,
                                  address: a.address,
                                  city: a.city,
                                  country: a.country,
                                  postalCode: a.postalCode,
                                });
                                setAddrModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => {
                                if (confirm("Delete this address?")) {
                                  deleteAddress(idx).then(refetchAddresses);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}

                <Button
                  size="sm"
                  onClick={() => {
                    setAddrEditingIndex(null);
                    setAddrInitial(undefined);
                    setAddrModalOpen(true);
                  }}
                >
                  <FiPlus className="me-1" /> Add Address
                </Button>
              </Card.Body>
            </Card>

            {/* Document upload */}
            <Card className="shadow-sm mt-3">
              <Card.Header style={{ background: "white" }}>
                <strong>
                  <FiUpload className="me-1" /> Upload Documents
                </strong>
              </Card.Header>
              <Card.Body>
                <div
                  {...getRootProps()}
                  style={{
                    border: `2px dashed ${MAIN_COLOR}`,
                    borderRadius: 10,
                    padding: 16,
                    textAlign: "center",
                    background: isDragActive ? "#ecfeff" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input {...getInputProps()} />
                  <div className="text-muted">
                    Drag & drop documents here, or click to select files
                  </div>
                </div>

                {docUploading && (
                  <div className="mt-2">
                    <Spinner size="sm" /> Uploading…
                  </div>
                )}

                <div className="d-flex align-items-center justify-content-between mt-3">
                  <strong>Your Documents</strong>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => refetchDocuments()}
                  >
                    Refresh
                  </Button>
                </div>

                {documents.length === 0 ? (
                  <div className="text-muted mt-2">No documents yet.</div>
                ) : (
                  <Table hover responsive size="sm" className="mt-2">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Uploaded</th>
                        <th style={{ width: 160 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.filename}>
                          <td>
                            {d.url ? (
                              <a href={d.url} target="_blank" rel="noreferrer">
                                {d.label || d.filename}
                              </a>
                            ) : (
                              <span>{d.label || d.filename}</span>
                            )}
                          </td>
                          <td>
                            {d.uploadedAt
                              ? new Date(d.uploadedAt).toLocaleString()
                              : "—"}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              {d.url && (
                                <a
                                  className="btn btn-sm btn-outline-secondary"
                                  href={d.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
                                </a>
                              )}
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteDocument(d.filename)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={5}>
            {/* Stores - big cards */}
            <Card className="shadow-sm">
              <Card.Header style={{ background: "white" }}>
                <strong>
                  <FiShoppingBag className="me-1" /> Shop Top Stores
                </strong>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  {[
                    {
                      name: "Amazon AE",
                      logo: "/amazon.svg",
                      url: "https://amazon.ae",
                      tag: "Everything",
                    },
                    {
                      name: "Noon",
                      logo: "/noon.svg",
                      url: "https://noon.com",
                      tag: "Hot deals",
                    },
                    {
                      name: "eBay",
                      logo: "/ebay.svg",
                      url: "https://ebay.com",
                      tag: "Auctions",
                    },
                    {
                      name: "Walmart",
                      logo: "/walmart.svg",
                      url: "https://walmart.com",
                      tag: "Value",
                    },
                    {
                      name: "SHEIN",
                      logo: "/shein.svg",
                      url: "https://shein.com",
                      tag: "Fashion",
                    },
                  ].map((s) => (
                    <Col sm={6} key={s.name}>
                      <Card
                        className="h-100 border-0"
                        style={{
                          background: "#fff",
                          boxShadow: "0 8px 24px #0000000d",
                        }}
                      >
                        <Card.Body className="d-flex flex-column">
                          <div className="d-flex align-items-center justify-content-between">
                            <Image
                              src={s.logo}
                              alt={s.name}
                              height={28}
                              onError={(e: any) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <Badge bg="light" text="dark">
                              {s.tag}
                            </Badge>
                          </div>
                          <div className="mt-2 fw-bold">{s.name}</div>
                          <div className="mt-auto">
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-decoration-none"
                            >
                              <span style={{ color: MAIN_COLOR }}>
                                Shop now <FiChevronRight />
                              </span>
                            </a>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <div className="text-end small mt-2">
                  <a href="/stores" className="text-muted">
                    See more stores →
                  </a>
                </div>
              </Card.Body>
            </Card>

            {/* Deals (API) */}
            <Card className="shadow-sm mt-3">
              <Card.Header style={{ background: "white" }}>
                <strong>Hot Deals</strong>
              </Card.Header>
              <Card.Body>
                {deals.length === 0 ? (
                  <div className="text-muted">No deals available.</div>
                ) : (
                  <ul className="list-group">
                    {deals.slice(0, 5).map((d) => (
                      <li
                        key={d.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <span>
                          {d.logo && (
                            <Image
                              src={d.logo}
                              alt={d.store}
                              height={18}
                              className="me-2"
                            />
                          )}
                          <strong>{d.store}</strong> — {d.title}{" "}
                          {d.discountText && (
                            <Badge bg="success" className="ms-1">
                              {d.discountText}
                            </Badge>
                          )}
                        </span>
                        <a href={d.url} target="_blank" rel="noreferrer">
                          <FiChevronRight />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Packages */}
        <Card className="shadow-sm mt-3">
          <Card.Header style={{ background: "white" }}>
            <strong>
              <FiTruck className="me-1" /> My Packages
            </strong>
          </Card.Header>
          <Card.Body>
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th>Last Updated</th>
                  <th style={{ width: 110 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <Spinner size="sm" />
                    </td>
                  </tr>
                ) : packages.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No packages found.</td>
                  </tr>
                ) : (
                  packages.map((p) => (
                    <tr key={p._id || p.tracking}>
                      <td>{p.tracking}</td>
                      <td style={{ textTransform: "capitalize" }}>
                        <Badge
                          bg={
                            p.status === "delivered"
                              ? "success"
                              : p.status === "pending"
                              ? "warning"
                              : p.status === "problem"
                              ? "danger"
                              : "info"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td>{p.value} AED</td>
                      <td>{new Date(p.updatedAt).toLocaleString()}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openTrackModal(p)}
                        >
                          Track
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={refetchPackages}
            >
              Refresh
            </Button>
          </Card.Body>
        </Card>
        <div className="mt-2 small text-muted">
          Latest: {packages[0]?.tracking ?? "—"}
        </div>

        {/* Transactions */}
        <Card className="shadow-sm mt-3">
          <Card.Header style={{ background: "white" }}>
            <strong>
              <FiCreditCard className="me-1" /> Transaction History
            </strong>
          </Card.Header>
          <Card.Body>
            <Table hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No transactions.</td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td>{t.amount} AED</td>
                      <td>
                        <Badge
                          bg={
                            t.status === "Completed"
                              ? "success"
                              : t.status === "Pending"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td>{new Date(t.date).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={refetchTransactions}
            >
              Refresh
            </Button>
          </Card.Body>
        </Card>

        <div className="col-12 col-lg-6">
          <OutstandingInvoicesCard />
        </div>

        {/* Actions row */}
        <Row className="g-3 mt-3">
          <Col md={4}>
            <Card className="shadow-sm">
              <Card.Body className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small">Profile & Membership</div>
                  <Button
                    size="sm"
                    className="me-2 mt-1"
                    variant="outline-primary"
                    onClick={() => setShowProfile(true)}
                  >
                    <FiUser className="me-1" />
                    Edit Profile
                  </Button>
                  <Button
                    size="sm"
                    className="mt-1"
                    variant="outline-success"
                    onClick={() => setShowMembership(true)}
                  >
                    <FiZap className="me-1" />
                    Membership
                  </Button>
                </div>
                <FiUser color={MAIN_COLOR} size={28} />
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="shadow-sm">
              <Card.Body className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small">Security & Payments</div>
                  <Button
                    size="sm"
                    className="me-2 mt-1"
                    variant="outline-secondary"
                    onClick={() => setShowPass(true)}
                  >
                    <FiShield className="me-1" />
                    Password
                  </Button>
                  <Button
                    size="sm"
                    className="mt-1"
                    variant="outline-info"
                    onClick={() => setShowPay(true)}
                  >
                    <FiCreditCard className="me-1" />
                    Payment
                  </Button>
                  <Button
                    size="sm"
                    className="mt-1"
                    variant="outline-primary"
                    onClick={() => setShowCharge(true)}
                  >
                    <FiDollarSign className="me-1" /> Pay / Create Invoice
                  </Button>
                </div>
                <FiShield color={MAIN_COLOR} size={28} />
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="shadow-sm">
              <Card.Body className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small">Help & Support</div>
                  <Button
                    size="sm"
                    className="me-2 mt-1"
                    variant="outline-dark"
                    onClick={() => setShowSupport(true)}
                  >
                    <FiHelpCircle className="me-1" />
                    Support
                  </Button>
                  <Button
                    size="sm"
                    className="mt-1"
                    variant="outline-dark"
                    onClick={() => router.push("/stores")}
                  >
                    <FiShoppingBag className="me-1" />
                    All Stores
                  </Button>
                </div>
                <FiMessageSquare color={MAIN_COLOR} size={28} />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <h2 className="mb-3">Billing</h2>
        <BillingSummary />

        {/* Footer */}
        <footer className="mt-4 pt-3 pb-4 border-top">
          <div className="d-flex flex-wrap align-items-center justify-content-between">
            <div className="small">
              <span className="fw-bold" style={{ color: MAIN_COLOR }}>
                CrossBorderChart
              </span>{" "}
              &copy; {new Date().getFullYear()} | <a href="/about">About Us</a> |{" "}
              <a href="/privacy">Privacy</a>
            </div>
            <div className="small">
              <a
                href="https://wa.me/971501234567"
                target="_blank"
                rel="noreferrer"
                style={{ marginRight: 10 }}
              >
                <Image src="/wa.svg" width={22} alt="wa" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                style={{ marginRight: 10 }}
              >
                <Image src="/fb.svg" width={22} alt="fb" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
              >
                <Image src="/ig.svg" width={22} alt="ig" />
              </a>
              <span className="ms-3">
                <a href="/faq">FAQ</a> | <a href="/help">Help</a> |{" "}
                <a href="/contact">Contact</a>
              </span>
            </div>
          </div>
        </footer>
      </Container>

      {/* Modals */}
      <AIChatModal show={showAI} onHide={() => setShowAI(false)} />
      <ShippingQuoteSimple show={showUserQuote} onHide={() => setShowUserQuote(false)} />

      <SupportModal show={showSupport} onHide={() => setShowSupport(false)} />
      <ProfileModal
        show={showProfile}
        onHide={() => setShowProfile(false)}
        profile={profile}
        onSave={saveProfile}
      />
      <PassModal
        show={showPass}
        onHide={() => setShowPass(false)}
        onChangePass={changePassword}
      />
      <MembershipModal
        show={showMembership}
        onHide={() => setShowMembership(false)}
        profile={profile}
        onSave={saveProfile}
      />
      <PaymentModal
        show={showPay}
        onHide={() => setShowPay(false)}
        methods={paymentMethods}
        onAdd={addPaymentMethod}
        onDelete={deletePaymentMethod}
      />

      {/* Address Modal */}
      <AddressModal
        show={addrModalOpen}
        onHide={() => setAddrModalOpen(false)}
        initial={addrInitial}
        onSave={saveAddress}
        saving={addrSaving}
        title={addrEditingIndex === null ? "Add Address" : "Edit Address"}
      />

      <NewChargeModal
        show={showCharge}
        onHide={() => setShowCharge(false)}
        methods={paymentMethods}
        onCreated={() => {
          // After creating a charge, refresh data and go to My Invoices
          refetchTransactions();
          router.push("/charges");
        }}
      />

      {/* Tracking timeline modal */}
      <Modal show={trackOpen} onHide={() => setTrackOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Tracking — {trackPkg?.tracking ?? ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {trackBusy ? (
            <div className="d-flex justify-content-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <TrackingTimeline events={trackEvents} />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
