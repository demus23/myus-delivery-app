import { useState, useEffect, useRef } from "react";
import { Modal, Button, InputGroup, Form, Spinner, Alert, Badge } from "react-bootstrap";

type ChatRole = "assistant" | "user";
type ChatMessage = { role: ChatRole; content: string };

type UserContext = {
  userId?: string;
  name?: string;
  role?: "admin" | "operator" | "driver" | "customer" | string;
};

type Props = {
  show: boolean;
  onHide: () => void;
  userContext?: UserContext;
};

const QUICK_ACTIONS: Array<{ label: string; prompt: string }> = [
  { label: "Track my package", prompt: "Track my latest package. Show status and location." },
  { label: "Summarize membership", prompt: "Summarize my current membership and renewal date." },
  { label: "Translate address", prompt: "Translate my delivery address to Arabic." },
  { label: "Best electronics store", prompt: "What is the best online store in UAE for electronics deals?" }
];

export default function AIChatbotModal({ show, onHide, userContext }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "👋 Hi! I'm your Cross Border Chart AI Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    if (!show) {
      setMessages([
        { role: "assistant", content: "👋 Hi! I'm your Cross Border Chart AI Assistant. How can I help you today?" }
      ]);
      setInput("");
      setError("");
    }
  }, [show]);

  const handleSend = async (prompt?: string): Promise<void> => {
    const msg = (prompt ?? input).trim();
    if (!msg) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, userContext }),
      });

      const data = (await res.json()) as { aiMessage?: string; error?: string };

      if (res.ok && data.aiMessage) {
        setMessages([...newMessages, { role: "assistant", content: data.aiMessage }]);
      } else {
        setError(data?.error || "Something went wrong.");
      }
    } catch {
      setError("Failed to reach AI.");
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <span style={{ color: "#0f766e" }}>AI Assistant</span> <Badge bg="success">New</Badge>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: "#e0f7f1", minHeight: 340 }}>
        <div style={{ marginBottom: 16 }}>
          {QUICK_ACTIONS.map((q) => (
            <Button
              key={q.label}
              size="sm"
              className="me-2 mb-2"
              variant="outline-success"
              style={{ borderRadius: 18 }}
              onClick={() => void handleSend(q.prompt)}
              disabled={loading}
            >
              {q.label}
            </Button>
          ))}
        </div>

        <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                textAlign: msg.role === "user" ? "right" : "left",
                margin: "8px 0",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  background: msg.role === "assistant" ? "#bbf7d0" : "#5eead4",
                  color: "#134e4a",
                  borderRadius: 12,
                  padding: "8px 14px",
                  maxWidth: 350,
                }}
              >
                {msg.content}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <InputGroup>
          <Form.Control
            placeholder="Ask me anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSend()}
            disabled={loading}
          />
          <Button variant="success" onClick={() => void handleSend()} disabled={loading || !input.trim()}>
            {loading ? <Spinner size="sm" /> : <i className="bi bi-send"></i>}
          </Button>
        </InputGroup>

        <div className="mt-2" style={{ fontSize: 12, color: "#888" }}>
          Powered by Cross Border Chart AI
        </div>
      </Modal.Body>
    </Modal>
  );
}
