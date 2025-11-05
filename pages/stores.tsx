import Link from "next/link";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";

// 1. Store Data
const STORES = [
  {
    name: "Amazon",
    url: "https://www.amazon.ae/",
    logo: "/amazon-logo.svg",
    deal: "Today's Deals on Amazon",
  },
  {
    name: "Noon",
    url: "https://www.noon.com/uae-en/",
    logo: "/noon-logo.png",
    deal: "Noon's Yellow Friday Flash Sale",
  },
  {
    name: "Carrefour",
    url: "https://www.carrefouruae.com/",
    logo: "/carrefour-logo.svg",
    deal: "Grocery Mega Deals",
  },
  {
    name: "Namshi",
    url: "https://en-ae.namshi.com/",
    logo: "/namshi-logo.png",
    deal: "70% Off On Fashion!",
  },
  {
    name: "Sharaf DG",
    url: "https://uae.sharafdg.com/",
    logo: "/sharafdg-logo.png",
    deal: "Electronics Hot Sale",
  },
  {
    name: "Ounass",
    url: "https://www.ounass.ae/",
    logo: "/ounass-logo.png",
    deal: "Luxury Sale – Free Shipping",
  },
  {
    name: "Sivvi",
    url: "https://www.sivvi.com/ae/en/",
    logo: "/sivvi-logo.png",
    deal: "Sneaker Fest Offers",
  },
  {
    name: "eBay",
    url: "https://www.ebay.com/",
    logo: "/ebay-logo.svg",
    deal: "Daily Auctions",
  },
  {
    name: "Amazon US",
    url: "https://www.amazon.com/",
    logo: "/amazon-logo.svg",
    deal: "International Shipping Deals",
  }
];

export default function StoresPage() {
  return (
    <div className="stores-bg">
      <Container className="pt-4 pb-0">
        <div className="mb-3 small text-muted">
          <Link href="/" className="text-primary" style={{ textDecoration: "underline" }}>Home</Link>
          {" // "}
          <span>Shopping Benefits</span>
          {" // "}
          <span className="text-dark fw-bold">Deals & Coupons</span>
        </div>
      </Container>

      {/* Header Section */}
      <Container className="pb-2">
        <h1 className="fw-bold mb-2" style={{ color: "#1392e6", fontSize: "2.1rem", letterSpacing: "-0.5px" }}>
          Shop Store & Brand Sales
        </h1>
        <p className="lead mb-4" style={{ color: "#333", fontWeight: 500 }}>
          Save with Cross Border Cart — discover exclusive sales from top UAE brands!
        </p>
      </Container>

      {/* Info Row */}
      <Container className="mb-4">
        <Row xs={1} md={2} lg={4} className="g-3">
          <Col>
            <Card className="info-card h-100 shadow-sm">
              <Card.Body className="text-center">
                <span style={{ fontSize: 30 }}>🛍️</span>
                <div className="fw-semibold mt-2">Shop Store & Brand Sales</div>
                <div className="text-muted small">Exclusive offers on the best items.</div>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card className="info-card h-100 shadow-sm">
              <Card.Body className="text-center">
                <span style={{ fontSize: 30 }}>💡</span>
                <div className="fw-semibold mt-2">Shop Featured Products</div>
                <div className="text-muted small">Limited-time deals every week.</div>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card className="info-card h-100 shadow-sm">
              <Card.Body className="text-center">
                <span style={{ fontSize: 30 }}>🎟️</span>
                <div className="fw-semibold mt-2">Find Coupon Codes</div>
                <div className="text-muted small">Get latest promo codes for extra savings.</div>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card className="info-card h-100 shadow-sm">
              <Card.Body className="text-center">
                <span style={{ fontSize: 30 }}>🆕</span>
                <div className="fw-semibold mt-2">Discover New Stores</div>
                <div className="text-muted small">Explore rising UAE e-commerce brands.</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Stores Grid */}
      <Container className="py-3">
        <Row xs={2} sm={3} md={4} lg={6} className="g-4 justify-content-center">
          {STORES.map(store => (
            <Col key={store.name}>
              <div className="d-flex flex-column align-items-center px-1">
                <a href={store.url} target="_blank" rel="noopener noreferrer" title={store.name}>
                  <img
                    src={store.logo}
                    alt={store.name}
                    style={{
                      maxWidth: 86,
                      maxHeight: 48,
                      objectFit: "contain",
                      marginBottom: 8,
                      background: "#fff",
                      borderRadius: 10,
                      boxShadow: "0 2px 16px #0099ff13"
                    }}
                    onError={e => (e.currentTarget.src = "/default-logo.png")}
                  />
                </a>
                <div className="fw-semibold text-center" style={{ fontSize: 16, color: "#182e40" }}>
                  {store.name}
                </div>
                {store.deal && (
                  <div className="text-info text-center small fw-bold" style={{ minHeight: 18 }}>
                    {store.deal}
                  </div>
                )}
              </div>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Footer */}
      <footer style={{
        background: "linear-gradient(90deg, #1392e6 0%, #2ec8c0 100%)",
        borderTop: "none",
        padding: "32px 0",
        marginTop: 60,
        color: "#fff"
      }}>
        <Container>
          <div className="d-flex flex-column flex-md-row align-items-center justify-content-between">
            <div className="mb-2 mb-md-0 fw-bold" style={{ letterSpacing: 0.5 }}>
              &copy; {new Date().getFullYear()} Cross Border Cart &mdash; All rights reserved.
            </div>
            <div className="small">
              <Link href="/about" className="me-3 text-white-50" style={{ textDecoration: "underline" }}>About</Link>
              <Link href="/contact" className="me-3 text-white-50" style={{ textDecoration: "underline" }}>Contact</Link>
              <Link href="/terms" className="me-3 text-white-50" style={{ textDecoration: "underline" }}>Terms</Link>
              <Link href="/privacy" className="text-white-50" style={{ textDecoration: "underline" }}>Privacy</Link>
            </div>
          </div>
        </Container>
      </footer>

      <style jsx>{`
        .stores-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fbff 0%, #e3f6fb 90%);
        }
        .info-card {
          border: none;
          background: #e9f6ff;
        }
        .info-card .fw-semibold {
          color: #098bde;
        }
        img {
          transition: box-shadow 0.2s, transform 0.1s;
        }
        img:hover {
          box-shadow: 0 6px 32px #0099ff33;
          transform: scale(1.06);
        }
      `}</style>
    </div>
  );
}
