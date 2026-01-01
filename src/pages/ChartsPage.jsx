import { useMemo, useState } from "react";
//  MUI components for layout + inputs + status + card UI + loader
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

//  Chart components (React wrapper) + Chart.js auto registration
import { Pie, Bar } from "react-chartjs-2";
import "chart.js/auto";

//  Supported currencies (must match project requirements)
const currencies = ["USD", "ILS", "GBP", "EURO"];

//  Pink palette for the UI / charts (from your design images)
const pinks = [
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

//  Helper: returns N colors (cycled) for pie slices
function pickPinkColors(n) {
    // Create an array of length n and pick colors by index modulo palette length
    return Array.from({ length: n }, (_, i) => pinks[i % pinks.length]);
}

//  Chart text + grid styling (soft + readable)
const textColor = "#4a2c3a"; // dark rose/brown for text
const gridColor = "rgba(242,107,138,0.18)"; // light rouge for axis grid lines

//  Shared options for both charts (legend + tooltip styling)
const commonOptions = {
    responsive: true, // chart resizes with container
    maintainAspectRatio: false, // allow custom height (we set Box height)
    plugins: {
        // Legend styling
        legend: {
            labels: {
                color: textColor, // legend label color
                boxWidth: 18, // small legend color box
            },
        },
        // Tooltip styling
        tooltip: {
            titleColor: textColor,
            bodyColor: textColor,
            backgroundColor: "rgba(255,255,255,0.95)",
            borderColor: "rgba(246,74,138,0.35)",
            borderWidth: 1,
        },
    },
};

//  Bar chart options extend common options with axis grid/ticks styles
const barOptions = {
    ...commonOptions,
    scales: {
        // X axis styling
        x: {
            grid: { color: gridColor },
            ticks: { color: textColor },
        },
        // Y axis styling
        y: {
            grid: { color: gridColor },
            ticks: { color: textColor },
        },
    },
};

//  Main page component
export default function ChartsPage({ db }) {
    //  Store "now" only once (so default values are stable)
    const now = useMemo(() => new Date(), []);

    //  User inputs: selected year / month / currency
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [currency, setCurrency] = useState("USD");

    //  Chart state: data objects for Pie and Bar
    const [pieData, setPieData] = useState(null);
    const [barData, setBarData] = useState(null);

    //  Status state: messages shown to the user
    const [status, setStatus] = useState(null);

    //  Loading states: disable buttons + show spinner
    const [loadingPie, setLoadingPie] = useState(false);
    const [loadingBar, setLoadingBar] = useState(false);

    //  Handler: build Pie chart for a given month/year
    async function onShowPie() {
        // Reset status and previous pie chart
        setStatus(null);
        setPieData(null);

        // Start loading UI
        setLoadingPie(true);

        // Validate DB readiness (db comes from App.jsx)
        if (!db) {
            setStatus({ type: "error", msg: "Database not ready yet." });
            setLoadingPie(false);
            return;
        }

        try {
            // Ask db layer for totals by category (already converted to selected currency)
            const totals = await db.getCategoryTotals(Number(year), Number(month), currency);

            // If no data, show info message and stop
            if (!totals || totals.length === 0) {
                setStatus({ type: "info", msg: "No costs found for this month." });
                return;
            }

            // Extract labels (category names)
            const labels = totals.map((t) => t.category);

            // Extract values (category totals) and ensure they are numbers
            const values = totals.map((t) => Number(t.total) || 0);

            // Build the final data object for Pie chart
            setPieData({
                labels,
                datasets: [
                    {
                        // Dataset label used in tooltip/legend
                        label: `Costs by Category (${currency})`,
                        // Pie slice values
                        data: values,
                        // Slice colors (pink palette)
                        backgroundColor: pickPinkColors(labels.length),
                        // Slice borders
                        borderColor: "#FFFFFF",
                        borderWidth: 2,
                    },
                ],
            });
        } catch (err) {
            // Show errors nicely in UI
            setStatus({ type: "error", msg: err?.message || "Failed to build pie chart." });
        } finally {
            // Stop loading UI
            setLoadingPie(false);
        }
    }

    //  Handler: build Bar chart for the whole year (12 months)
    async function onShowBar() {
        // Reset status and previous bar chart
        setStatus(null);
        setBarData(null);

        // Start loading UI
        setLoadingBar(true);

        // Validate DB readiness
        if (!db) {
            setStatus({ type: "error", msg: "Database not ready yet." });
            setLoadingBar(false);
            return;
        }

        try {
            // Ask db layer for totals per month (array of 12 numbers)
            const totals = await db.getYearMonthlyTotals(Number(year), currency);

            // Normalize to a safe array of 12 numeric values
            const values = Array.isArray(totals)
                ? totals.map((v) => Number(v) || 0)
                : new Array(12).fill(0);

            // Build the final data object for Bar chart
            setBarData({
                // Month labels (12 bars)
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                datasets: [
                    {
                        // Dataset label shown in legend/tooltip
                        label: `Monthly totals (${currency})`,
                        // Bar values
                        data: values,
                        // Bar fill color
                        backgroundColor: "#F64A8A",
                        // Bar border style
                        borderColor: "#FFFFFF",
                        borderWidth: 2,
                        // Rounded corners on bars
                        borderRadius: 10,
                    },
                ],
            });
        } catch (err) {
            // Show errors nicely in UI
            setStatus({ type: "error", msg: err?.message || "Failed to build bar chart." });
        } finally {
            // Stop loading UI
            setLoadingBar(false);
        }
    }

    //  Render UI
    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Page title */}
            <Typography variant="h5" sx={{ color: textColor }}>
                Charts
            </Typography>

            {/* Show DB loading message when db is still null */}
            {!db && <Alert severity="info">Loading database...</Alert>}

            {/* Show success/error/info messages */}
            {status && <Alert severity={status.type}>{status.msg}</Alert>}

            {/* Controls (Responsive):
                - Mobile (xs): 1 column stacked, everything full width
                - Desktop (sm+): 4 columns like before (140/140/160/auto)
            */}
            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    alignItems: "center",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "140px 140px 160px auto",
                    },
                }}
            >
                {/* Year input */}
                <TextField
                    label="Year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    fullWidth
                />

                {/* Month input */}
                <TextField
                    label="Month"
                    type="number"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    inputProps={{ min: 1, max: 12 }}
                    fullWidth
                />

                {/* Currency selector */}
                <TextField
                    select
                    label="Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    fullWidth
                >
                    {currencies.map((c) => (
                        <MenuItem key={c} value={c}>
                            {c}
                        </MenuItem>
                    ))}
                </TextField>

                {/* Buttons row (Responsive):
                    - Mobile: stack the buttons under each other
                    - Desktop: show them next to each other
                */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 1.5,
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: "stretch",
                    }}
                >
                    {/* Pie button */}
                    <Button
                        variant="contained"
                        onClick={onShowPie}
                        disabled={loadingPie || loadingBar}
                        sx={{
                            width: { xs: "100%", sm: "auto" },
                            minHeight: 44,
                            backgroundColor: "#F64A8A",
                            "&:hover": { backgroundColor: "#FC46AA" },
                        }}
                    >
                        {loadingPie ? "Loading..." : "Show Pie"}
                    </Button>

                    {/* Bar button */}
                    <Button
                        variant="outlined"
                        onClick={onShowBar}
                        disabled={loadingPie || loadingBar}
                        sx={{
                            width: { xs: "100%", sm: "auto" },
                            minHeight: 44,
                            borderColor: "rgba(246,74,138,0.55)",
                            color: "#F26B8A",
                            "&:hover": { borderColor: "#FC46AA", backgroundColor: "rgba(252,70,170,0.06)" },
                        }}
                    >
                        {loadingBar ? "Loading..." : "Show Bar"}
                    </Button>

                    {/* Small spinner when either chart loads */}
                    {(loadingPie || loadingBar) && (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <CircularProgress size={22} />
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Pie chart card */}
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
                    {/* Pie section title */}
                    <Typography variant="h6" sx={{ mb: 1, color: textColor }}>
                        Pie Chart (by Category)
                    </Typography>

                    {/* Responsive height:
                        - Mobile: a bit shorter
                        - Desktop: bigger
                    */}
                    <Box sx={{ height: { xs: 260, sm: 360 } }}>
                        <Pie data={pieData} options={commonOptions} />
                    </Box>
                </Paper>
            )}

            {/* Bar chart card */}
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
                    {/* Bar section title */}
                    <Typography variant="h6" sx={{ mb: 1, color: textColor }}>
                        Bar Chart (12 months)
                    </Typography>

                    {/* Responsive height:
                        - Mobile: a bit shorter
                        - Desktop: bigger
                    */}
                    <Box sx={{ height: { xs: 260, sm: 360 } }}>
                        <Bar data={barData} options={barOptions} />
                    </Box>
                </Paper>
            )}
        </Box>
    );
}