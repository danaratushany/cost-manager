import { useMemo, useState } from "react";
import {
    Box,
    Button,
    MenuItem,
    TextField,
    Typography,
    Alert,
    Paper,
    CircularProgress,
} from "@mui/material";

import { Pie, Bar } from "react-chartjs-2";
import "chart.js/auto";

const currencies = ["USD", "ILS", "GBP", "EURO"];

// Pink palette (from your images)
const PINKS = [
    "#FDDDE6", // Piggy Pink
    "#FFBCD9", // Cotton Candy
    "#EFBBCC", // Cameo Pink
    "#F77FBE", // Persian Pink
    "#FC94AF", // Rose
    "#FE7F9C", // Watermelon
    "#FDA4BA", // Flamingo
    "#F26B8A", // Rouge
    "#F64A8A", // French Pink
    "#F699CD", // Pink
    "#FC46AA", // French Fuchsia
];

function pickPinkColors(n) {
    return Array.from({ length: n }, (_, i) => PINKS[i % PINKS.length]);
}

const textColor = "#4a2c3a";
const gridColor = "rgba(242,107,138,0.18)"; // soft rouge grid

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: textColor,
                boxWidth: 18,
            },
        },
        tooltip: {
            titleColor: textColor,
            bodyColor: textColor,
            backgroundColor: "rgba(255,255,255,0.95)",
            borderColor: "rgba(246,74,138,0.35)",
            borderWidth: 1,
        },
    },
};

const barOptions = {
    ...commonOptions,
    scales: {
        x: {
            grid: { color: gridColor },
            ticks: { color: textColor },
        },
        y: {
            grid: { color: gridColor },
            ticks: { color: textColor },
        },
    },
};

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
                return;
            }

            const labels = totals.map((t) => t.category);
            const values = totals.map((t) => t.total);

            setPieData({
                labels,
                datasets: [
                    {
                        label: `Costs by Category (${currency})`,
                        data: values,
                        backgroundColor: pickPinkColors(labels.length),
                        borderColor: "#FFFFFF",
                        borderWidth: 2,
                    },
                ],
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
                        backgroundColor: "#F64A8A",
                        borderColor: "#FFFFFF",
                        borderWidth: 2,
                        borderRadius: 10,
                    },
                ],
            });
        } catch (e) {
            setStatus({ type: "error", msg: e?.message || "Failed to build bar chart." });
        } finally {
            setLoadingBar(false);
        }
    }

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h5" sx={{ color: textColor }}>
                Charts
            </Typography>

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
                        <MenuItem key={c} value={c}>
                            {c}
                        </MenuItem>
                    ))}
                </TextField>

                <Button
                    variant="contained"
                    onClick={onShowPie}
                    disabled={loadingPie || loadingBar}
                    sx={{
                        backgroundColor: "#F64A8A",
                        "&:hover": { backgroundColor: "#FC46AA" },
                    }}
                >
                    {loadingPie ? "Loading..." : "Show Pie"}
                </Button>

                <Button
                    variant="outlined"
                    onClick={onShowBar}
                    disabled={loadingPie || loadingBar}
                    sx={{
                        borderColor: "rgba(246,74,138,0.55)",
                        color: "#F26B8A",
                        "&:hover": { borderColor: "#FC46AA", backgroundColor: "rgba(252,70,170,0.06)" },
                    }}
                >
                    {loadingBar ? "Loading..." : "Show Bar"}
                </Button>

                {(loadingPie || loadingBar) && <CircularProgress size={22} />}
            </Box>

            {pieData && (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 3,
                        borderColor: "rgba(246,74,138,0.25)",
                        backgroundColor: "rgba(255,255,255,0.75)",
                    }}
                >
                    <Typography variant="h6" sx={{ mb: 1, color: textColor }}>
                        Pie Chart (by Category)
                    </Typography>

                    <Box sx={{ height: 360 }}>
                        <Pie data={pieData} options={commonOptions} />
                    </Box>
                </Paper>
            )}

            {barData && (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 3,
                        borderColor: "rgba(246,74,138,0.25)",
                        backgroundColor: "rgba(255,255,255,0.75)",
                    }}
                >
                    <Typography variant="h6" sx={{ mb: 1, color: textColor }}>
                        Bar Chart (12 months)
                    </Typography>

                    <Box sx={{ height: 360 }}>
                        <Bar data={barData} options={barOptions} />
                    </Box>
                </Paper>
            )}
        </Box>
    );
}