import { useSession } from "next-auth/react";

export default function TestPage() {
  const { data: session, status } = useSession();

  return (
    <div>
      <h1>Session Debug Info</h1>
      <pre>{JSON.stringify({ status, session }, null, 2)}</pre>
    </div>
  );
}
