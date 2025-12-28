import { useMemo, useState } from "react";
import {
    Box,
    Button,
    MenuItem,
    TextField,
    Typography,
    Alert,
    Paper,
    CircularProgress
} from "@mui/material";

import { Pie, Bar } from "react-chartjs-2";
import "chart.js/auto";

const currencies = ["USD", "ILS", "GBP", "EURO"];

const palette = [
    "#1976d2", "#9c27b0", "#2e7d32", "#ed6c02",
    "#d32f2f", "#0288d1", "#7b1fa2", "#388e3c",
    "#f57c00", "#c2185b", "#00796b", "#5d4037"
];

function pickColors(n) {
    return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}

export default function ChartsPage({ db }) {
    const now = useMemo(() => new Date(), []);
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [currency, setCurrency] = useState("USD");
    const [pieData, setPieData] = useState(null);
    const [barData, setBarData] = useState(null);
    const [status, setStatus] = useState(null);
    const [loadingPie, setLoadingPie] = useState(false);
    const [loadingBar, setLoadingBar] = useState(false);

    async function onShowPie() {
        setStatus(null);
        setPieData(null);
        setLoadingPie(true);

        if (!db) {
            setStatus({ type: "error", msg: "Database not ready yet." });
            setLoadingPie(false);
            return;
        }

        try {
            const totals = await db.getCategoryTotals(Number(year), Number(month), currency);

            if (!totals || totals.length === 0) {
                setStatus({ type: "info", msg: "No costs found for this month." });
                setLoadingPie(false);
                return;
            }

            const labels = totals.map((t) => t.category);
            const values = totals.map((t) => t.total);
            const colors = pickColors(labels.length);
            setPieData({
                labels,
                datasets: [
                    {
                        label: `Costs by Category (${currency})`,
                data: values,
                backgroundColor: colors,
                borderWidth: 1
        }
        ]
        });
        } catch (e) {
            setStatus({ type: "error", msg: e?.message || "Failed to build pie chart." });
        } finally {
            setLoadingPie(false);
        }
    }

    async function onShowBar() {
        setStatus(null);
        setBarData(null);
        setLoadingBar(true);

        if (!db) {
            setStatus({ type: "error", msg: "Database not ready yet." });
            setLoadingBar(false);
            return;
        }
        try {
            const totals = await db.getYearMonthlyTotals(Number(year), currency);

            setBarData({
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                datasets: [
                    {
                        label: `Monthly totals (${currency})`,
                data: totals,
                backgroundColor: "#1976d2"
        }
        ]
        });
        } catch (e) {
            setStatus({ type: "error", msg: e?.message || "Failed to build bar chart." });
        } finally {
            setLoadingBar(false);
        }
    }
    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h5">Charts</Typography>

            {!db && <Alert severity="info">Loading database...</Alert>}
            {status && <Alert severity={status.type}>{status.msg}</Alert>}

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                <TextField
                    label="Year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    sx={{ width: 140 }}
                />

                <TextField
                    label="Month"
                    type="number"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    sx={{ width: 140 }}
                    inputProps={{ min: 1, max: 12 }}
                />

                <TextField
                    select
                    label="Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    sx={{ width: 160 }}
                >
                    {currencies.map((c) => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                </TextField>

                <Button variant="contained" onClick={onShowPie} disabled={loadingPie || loadingBar}>
                    {loadingPie ? "Loading..." : "Show Pie"}
                </Button>

                <Button variant="outlined" onClick={onShowBar} disabled={loadingPie || loadingBar}>
                    {loadingBar ? "Loading..." : "Show Bar"}
                </Button>
                {(loadingPie || loadingBar) && <CircularProgress size={22} />}
            </Box>

            {pieData && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        Pie Chart (by Category)
                    </Typography>

                    <Box sx={{ height: 360 }}>
                        <Pie
                            data={pieData}
                            options={{ responsive: true, maintainAspectRatio: false }}
                        />
                    </Box>
                </Paper>
            )}

            {barData && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        Bar Chart (12 months)
                    </Typography>

                    <Box sx={{ height: 360 }}>
                        <Bar
                            data={barData}
                            options={{ responsive: true, maintainAspectRatio: false }}
                        />
                    </Box>
                </Paper>
            )}
        </Box>
    );
}