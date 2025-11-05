import AdminLayout from "@/components/AdminLayout";
import { Card, Button } from "react-bootstrap";
import Link from "next/link";

export default function Marketing() {
  return (
    <AdminLayout>
      <h2 className="fw-bold mb-4">Marketing Campaigns</h2>
      <div className="row">
        <div className="col-md-6 col-lg-4 mb-4">
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title>Subscribers</Card.Title>
              <Card.Text>
                Manage your newsletter and campaign subscribers.
              </Card.Text>
              <Link href="/admin/marketing/subscribers" passHref>
                <Button variant="primary">View Subscribers</Button>
              </Link>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-6 col-lg-4 mb-4">
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title>Promotions</Card.Title>
              <Card.Text>
                Track and create ongoing or upcoming marketing promotions.
              </Card.Text>
              <Link href="/admin/marketing/promotions" passHref>
                <Button variant="primary">View Promotions</Button>
              </Link>
            </Card.Body>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
