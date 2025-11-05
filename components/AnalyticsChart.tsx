import { Bar } from "react-chartjs-2";
import { Card, Spinner } from "react-bootstrap";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { usePackagesPerMonth } from "../hooks/usePackagesPerMonth";
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function AnalyticsChart() {
  const { data, loading } = usePackagesPerMonth();

  const months = Object.keys(data);
  const values = Object.values(data);

  const chartData = {
    labels: months.map(m => {
      // Convert "YYYY-MM" to "MMM YY"
      const [y, mo] = m.split("-");
      return new Date(Number(y), Number(mo) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
    }),
    datasets: [
      {
        label: "Packages",
        backgroundColor: "#0d6efd",
        data: values,
        borderRadius: 6,
        barThickness: 32,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: "#e3f0fb" } },
      x: { grid: { display: false } }
    }
  };

  return (
    <Card className="mb-4 shadow-sm border-0">
      <Card.Body>
        <h5 className="mb-3" style={{ fontWeight: 700 }}>Packages This Year</h5>
        {loading ? (
          <div style={{ minHeight: 220 }} className="d-flex align-items-center justify-content-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </Card.Body>
    </Card>
  );
}
