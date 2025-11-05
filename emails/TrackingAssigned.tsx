import * as React from "react";
import { Html, Body, Container, Heading, Text, Hr, Link } from "@react-email/components";

export default function TrackingAssignedEmail(props: {
  customerName?: string;
  orderId: string;
  trackingNumber: string;
  carrierName?: string;
  trackUrl: string;
}) {
  const { customerName = "there", orderId, trackingNumber, carrierName, trackUrl } = props;

  return (
    <Html>
      <Body style={{ backgroundColor: "#f7f7f8", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: 24, margin: "24px auto", maxWidth: 560, borderRadius: 12 }}>
          <Heading style={{ fontSize: 22, margin: "0 0 8px" }}>Your order is on the way 🚚</Heading>
          <Text>Hi {customerName}, we’ve assigned tracking to <b>#{orderId}</b>.</Text>
          <Text><b>Tracking:</b> {trackingNumber}{carrierName ? ` • ${carrierName}` : ""}</Text>
          <Hr />
          <Link href={trackUrl} style={{ display: "inline-block", padding: "10px 16px", borderRadius: 8, background: "#111827", color: "#fff", textDecoration: "none" }}>
            Track shipment
          </Link>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            Tracking events may take a few hours to appear.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
