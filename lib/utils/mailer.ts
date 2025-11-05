export function appBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function sendAppEmail(to: string, subject: string, html: string) {
  console.log("=== DEV EMAIL ===");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log(html.replace(/<[^>]+>/g, "")); // plain text for console
  console.log("=== /DEV EMAIL ===");
}
