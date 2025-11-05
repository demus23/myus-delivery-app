import * as React from "react";
import { Html, Body, Container, Heading, Text, Hr, Link, Img } from "@react-email/components";

export default function OrderConfirmationEmail(props: {
  customerName?: string;
  orderId: string;
  amount?: number;               // in your store currency units (e.g., AED)
  currency?: string;             // e.g., 'AED'
  items?: { name: string; qty: number }[];
  trackUrl: string;
  supportEmail?: string;
  brandName?: string;            // "Cross Border Cart"
  brandUrl?: string;             // https://crossbordercart.com
  logoUrl?: string;              // optional logo (absolute URL)
}) {
  const {
    customerName = "there",
    orderId,
    amount,
    currency = "AED",
    items = [],
    trackUrl,
    supportEmail = "support@crossbordercart.com",
    brandName = "Cross Border Cart",
    brandUrl = "https://crossbordercart.com",
    logoUrl,
  } = props;

  return (
    <Html>
      <Body style={{ backgroundColor: "#f6f7fb", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: 24, margin: "24px auto", maxWidth: 560, borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            {logoUrl ? <Img src={logoUrl} alt={brandName} width="28" height="28" /> : null}
            <Link href={brandUrl} style={{ color: "#111827", textDecoration: "none", fontWeight: 600 }}>{brandName}</Link>
          </div>
          <Heading style={{ fontSize: 22, margin: "8px 0" }}>Thanks for your order, {customerName}!</Heading>
          <Text>Your order <b>#{orderId}</b> has been received and payment confirmed.</Text>
          {amount !== undefined && (
            <Text style={{ margin: "0 0 12px" }}>
              <b>Total:</b> {currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          )}
          {items.length > 0 && (
            <>
              <Hr />
              <Heading as="h3" style={{ fontSize: 16, margin: "12px 0 6px" }}>Items</Heading>
              {items.map((it, i) => (
                <Text key={i} style={{ margin: "0 0 4px" }}>{it.qty}× {it.name}</Text>
              ))}
            </>
          )}
          <Hr />
          <Text>Track your shipment anytime:</Text>
          <Link href={trackUrl} style={{ display: "inline-block", padding: "10px 16px", borderRadius: 8, background: "#111827", color: "#fff", textDecoration: "none" }}>
            Track your order
          </Link>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            Need help? Email us at <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
