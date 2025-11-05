import React, { useState } from "react";
import { Button, Spinner } from "react-bootstrap";

type Props = {
  userId: string;
  suiteId?: string | null;
  onUpdated?: (newSuiteId: string, previousSuiteId?: string | null) => void;
};

export default function RegenerateSuiteButton({ userId, suiteId, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [localSuiteId, setLocalSuiteId] = useState<string | null>(suiteId ?? null);

  async function handleClick() {
    if (!confirm("Generate a new Suite ID? This will replace the current one.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/users/${userId}/suite`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to regenerate suite");

      // Support both shapes: { data: { suiteId } } and { user: { suiteId } }
      const newId: string =
        j?.data?.suiteId ?? j?.user?.suiteId ?? "";

      setLocalSuiteId(newId || null);
      onUpdated?.(newId || "", j?.data?.previousSuiteId ?? null);
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to regenerate suite";
  alert(msg);

    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="d-flex align-items-center gap-2">
      <div>
        <strong>Suite:</strong> {localSuiteId ?? "—"}
      </div>
      <Button
        variant="outline-primary"
        size="sm"
        onClick={handleClick}
        disabled={busy}
      >
        {busy ? (
          <>
            <Spinner as="span" animation="border" size="sm" className="me-1" />
            Regenerating…
          </>
        ) : (
          "Regenerate Suite"
        )}
      </Button>
    </div>
  );
}
