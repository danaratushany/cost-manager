import { useMemo, useState } from "react";
//  MUI components for layout + inputs + table + UI messages
import {
    Box,
    Button,
    MenuItem,
    TextField,
    Typography,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    TableContainer,
} from "@mui/material";

//  Supported currencies (project requirement)
const currencies = ["USD", "ILS", "GBP", "EURO"];

export default function ReportPage({ db }) {
    //  Keep "now" stable so initial year/month won't change on re-render
    const now = useMemo(() => new Date(), []);

    //  User inputs
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [currency, setCurrency] = useState("USD");

    //  Data state: report object returned from db.getReport(...)
    const [report, setReport] = useState(null);

    //  Status messages: error/info/success
    const [status, setStatus] = useState(null);

    //  Fetch monthly report from DB and show it in the table
    async function onGetReport() {
        // Reset UI before running
        setStatus(null);
        setReport(null);

        // DB must be ready (db comes from App.jsx after openCostsDB)
        if (!db) {
            setStatus({ type: "error", msg: "Database not ready yet." });
            return;
        }

        try {
            // Ask DB layer for report in chosen currency
            const result = await db.getReport(Number(year), Number(month), currency);

            // Save report in state so UI can render table + total
            setReport(result);

            // If month has no costs, show info message
            if (!result.costs || result.costs.length === 0) {
                setStatus({ type: "info", msg: "No costs found for this month." });
            }
        } catch (err) {
            // Show readable error message
            setStatus({ type: "error", msg: err?.message || "Failed to get report." });
        }
    }

    //  Helper: format ISO date to YYYY-MM-DD (safe)
    function formatDate(isoString) {
        if (!isoString) return "";
        // createdAt is ISO string, slice(0,10) => YYYY-MM-DD
        return String(isoString).slice(0, 10);
    }

    //  Helper: decide what "sum" to show (converted sum preferred)
    function getSumToShow(costItem) {
        // sumInTarget exists when conversion happened
        const converted = Number(costItem?.sumInTarget);
        if (Number.isFinite(converted)) return converted;

        // fallback to original sum if conversion wasn't needed
        const original = Number(costItem?.sum);
        if (Number.isFinite(original)) return original;

        // last fallback: empty cell
        return "";
    }

    //  Helper: decide what currency label to show in the table
    function getCurrencyToShow(costItem) {
        // If conversion happened, we store targetCurrency
        if (costItem?.targetCurrency) return costItem.targetCurrency;

        // Otherwise, show original currency saved in DB
        if (costItem?.currency) return costItem.currency;

        return "";
    }

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Page title */}
            <Typography variant="h5">Monthly Report</Typography>

            {/* DB loading message */}
            {!db && <Alert severity="info">Loading database...</Alert>}

            {/* Status messages (error/info) */}
            {status && <Alert severity={status.type}>{status.msg}</Alert>}

            {/* Controls row (Responsive):
          - Mobile (xs): stacked (1 column), inputs full width
          - Desktop (sm+): row-like grid with fixed widths
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

                {/* Currency select */}
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

                {/* Fetch report button:
            - Mobile: full width
            - Desktop: auto width
        */}
                <Button
                    variant="contained"
                    onClick={onGetReport}
                    sx={{ width: { xs: "100%", sm: "auto" }, minHeight: 44 }}
                >
                    Get Report
                </Button>
            </Box>

            {/* Render table + total only if we have a report */}
            {report && (
                <>
                    {/* Table card (Responsive):
              - Wrap table in TableContainer with horizontal scroll on mobile
              - This prevents "table overflow" and keeps layout clean
          */}
                    <Paper variant="outlined">
                        <TableContainer
                            sx={{
                                width: "100%",
                                overflowX: "auto",
                            }}
                        >
                            <Table
                                size="small"
                                sx={{
                                    // Ensure table doesn't shrink too much on mobile
                                    minWidth: 720,
                                }}
                            >
                                {/* Header row */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell align="right">Sum</TableCell>
                                        <TableCell>Currency</TableCell>
                                    </TableRow>
                                </TableHead>

                                {/* Rows */}
                                <TableBody>
                                    {(report.costs || []).map((c) => {
                                        // Decide which sum to display (converted/original)
                                        const sumToShow = getSumToShow(c);

                                        // Decide which currency to display (target/original)
                                        const currencyToShow = getCurrencyToShow(c);

                                        return (
                                            <TableRow key={c.id}>
                                                <TableCell>{formatDate(c.createdAt)}</TableCell>
                                                <TableCell>{c.category}</TableCell>

                                                {/* Allow description to wrap nicely instead of breaking layout */}
                                                <TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                                                    {c.description}
                                                </TableCell>

                                                <TableCell align="right">{sumToShow}</TableCell>
                                                <TableCell>{currencyToShow}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Total line (already calculated in db.getReport) */}
                    <Typography variant="h6">
                        Total: {report.total?.total} {report.total?.currency}
                    </Typography>
                </>
            )}
        </Box>
    );
}