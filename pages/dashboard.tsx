import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
console.log("Session:", JSON.stringify(session, null, 2));


  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || !session || !session.user) {
    return <p>Loading...</p>;
  }

  // If you want to restrict dashboard to certain roles:
  // if (session.user.role !== "user" && session.user.role !== "admin") {
  //   return <p>You are not authorized to view this page.</p>;
  // }

  return (
    <div style={{ padding: "2rem" }}>
      <button
        style={{ float: "right", marginTop: -40, marginBottom: 20 }}
        onClick={() => signOut()}
      >
        Logout
      </button>
      <h1>Welcome, {session.user.name ?? session.user.email ?? "User"}!</h1>
      <div
        style={{
          background: "#f4f7fa",
          border: "1px solid #c4d2e3",
          padding: "18px 24px",
          borderRadius: 10,
          marginBottom: 24,
          fontSize: 17,
          maxWidth: 500,
        }}
      >
        <b>Your UAE Shipping Address for All Orders:</b>
        <br />
        <span style={{ color: "#335" }}>
          <b>GulfShip</b>
          <br />
          Suite <b>{(session.user as any).suiteId ?? "N/A"}</b>
          <br />
          Al Quoz, Dubai, UAE
          <br />
          <span style={{ color: "#888" }}>
            (Use this as your shipping address when you shop from UAE stores)
          </span>
        </span>
      </div>
      <div>
        <b>Your Role:</b> {session.user.role ?? "N/A"}
        <br />
        <b>Your Email:</b> {session.user.email ?? "N/A"}
      </div>
      {/* Add the rest of your dashboard UI here */}
    </div>
  );
}
