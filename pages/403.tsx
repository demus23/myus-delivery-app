export default function ForbiddenPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column"
    }}>
      <h1 style={{ fontSize: 80, color: "#d32f2f", margin: 0 }}>403</h1>
      <h2 style={{ color: "#203354", marginTop: 0 }}>Forbidden</h2>
      <p style={{ color: "#5d6780" }}>You do not have access to this page.</p>
    </div>
  );
}
