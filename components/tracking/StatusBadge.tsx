import React from "react";

export default function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const pretty = (s || "update")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

  let bg = "#eef3ff", br = "#dbe6ff", fg = "#2160e0";
  if (s.includes("out") || s.includes("transit")) { bg = "#ecfff8"; br = "#bff4e5"; fg = "#1b9a84"; }
  if (s.includes("delivered")) { bg = "#eefdff"; br = "#b8f5ff"; fg = "#0c8ea6"; }
  if (s.includes("failed") || s.includes("exception") || s.includes("return")) { bg = "#fff1f1"; br = "#ffd7d7"; fg = "#c0392b"; }

  return (
    <span style={{
      background: bg, border: `1px solid ${br}`, color: fg,
      padding: "6px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12,
      letterSpacing: 0.3, textTransform: "uppercase"
    }}>
      {pretty}
    </span>
  );
}
