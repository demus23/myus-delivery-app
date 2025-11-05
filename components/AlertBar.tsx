import { Alert } from "react-bootstrap";

export default function AlertBar() {
  return (
    <Alert
      variant="danger"
      className="mb-4"
      style={{ background: "#ff3b3022", color: "#ff3b30", border: "none" }}
    >
      <b>Important:</b> Some shipments are delayed due to UAE customs. We&apos;re working to resolve this ASAP.
    </Alert>
  );
}
