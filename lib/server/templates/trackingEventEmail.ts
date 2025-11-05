export function trackingEventEmail(params: {
  name?: string | null;
  trackingNo: string;
  status: string;
  location?: string | null;
  note?: string | null;
  whenISO?: string | null;
}) {
  const { name, trackingNo, status, location, note, whenISO } = params;
  const when = whenISO ? new Date(whenISO).toLocaleString() : "now";
  const title = `Update: ${status} — ${trackingNo}`;
  const lines = [
    `<p>Hi ${name || "there"},</p>`,
    `<p>Your package <strong>${trackingNo}</strong> has a new update:</p>`,
    `<ul>`,
    `<li><strong>Status:</strong> ${status}</li>`,
    location ? `<li><strong>Location:</strong> ${location}</li>` : "",
    note ? `<li><strong>Note:</strong> ${note}</li>` : "",
    `<li><strong>When:</strong> ${when}</li>`,
    `</ul>`,
    `<p>You can view the full timeline here: <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/track/${encodeURIComponent(trackingNo)}">Track ${trackingNo}</a>.</p>`,
    `<p>— CrossBorderChart</p>`,
  ].join("");

  return { subject: title, html: lines };
}
