// pages/mypackages.tsx
import { useEffect, useState } from "react";
import { Box, Typography, Paper, Chip, Stack, Button } from "@mui/material";

type Package = {
  _id: string;
  suiteId: string;
  tracking: string;
  courier: string;
  value: string;
  status: string;
  createdAt: string;
  forwardRequested?: boolean;
};

export default function MyPackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch("/api/mypackages", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setPackages)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box mt={7}><Typography>Loading...</Typography></Box>;

  return (
    <Box maxWidth={700} mx="auto" mt={7} p={2}>
      <Typography variant="h4" fontWeight={800} mb={3}>📦 My Packages</Typography>
      {packages.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center", color: "gray" }}>No packages found.</Paper>
      ) : (
        <Stack spacing={3}>
          {packages.map(pkg => (
            <Paper key={pkg._id} sx={{ p: 3, borderRadius: 4, boxShadow: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                <Chip label={pkg.suiteId} color="primary" variant="outlined" />
                <Typography fontWeight={700}>{pkg.tracking}</Typography>
                <Chip label={pkg.status} color={pkg.status === "Delivered" ? "success" : pkg.status === "Pending" ? "warning" : "info"} />
              </Stack>
              <Typography>Cargo: <b>{pkg.courier}</b></Typography>
              <Typography>Value: {pkg.value} AED</Typography>
              <Typography fontSize={13} color="gray">Created: {new Date(pkg.createdAt).toLocaleString()}</Typography>
              {pkg.status === "Arrived" && !pkg.forwardRequested && (
                <Button
                  sx={{ mt: 2 }}
                  variant="contained"
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    const res = await fetch('/api/mypackages/forward', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ packageId: pkg._id }),
                    });
                    if (res.ok) {
                      setPackages(pkgs => pkgs.map(p => p._id === pkg._id ? { ...p, forwardRequested: true } : p));
                    }
                  }}
                >Request Forwarding</Button>
              )}
              {pkg.forwardRequested && <Chip label="Forwarding Requested" color="info" sx={{ mt: 2 }} />}
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
