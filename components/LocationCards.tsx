import { Card, Row, Col } from "react-bootstrap";

export default function LocationCards() {
  return (
    <Row className="mb-4">
      <Col md={4}>
        <Card className="shadow-sm border-0 mb-3">
          <Card.Body>
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-geo-alt-fill me-2" style={{ color: "#0d6efd", fontSize: 22 }} />
              <h5 className="mb-0 fw-bold" style={{ color: "#0d6efd" }}>UAE</h5>
            </div>
            <div className="mb-1" style={{ fontSize: 15, color: "#888" }}>Warehouse Address</div>
            <div style={{ fontSize: 16 }}>
              <div>Al Quoz 3, Dubai, UAE</div>
              <div>P.O. Box: 123456</div>
              <div>Phone: +971 50 123 4567</div>
            </div>
            <div className="mt-2">
              <span className="badge bg-success">Active</span>
            </div>
          </Card.Body>
        </Card>
      </Col>
      {/* You can add more locations here later */}
    </Row>
  );
}
