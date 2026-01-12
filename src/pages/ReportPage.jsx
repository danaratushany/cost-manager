import { useMemo, useState } from "react";
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

const currencies = ["USD", "ILS", "GBP", "EURO"];

export default function ReportPage({ db }) {
    const now = useMemo(() => new Date(), []);

    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [currency, setCurrency] = useState("USD");

    const [report, setReport] = useState(null);
    const [status, setStatus] = useState(null);

    async function onGetReport() {
        setStatus(null);
        setReport(null);

        if (!db) {
            setStatus({ type: "error", msg: "Database not ready yet." });
            return;
        }

        try {
            const result = await db.getReport(Number(year), Number(month), currency);
            setReport(result);

            if (!result.costs || result.costs.length === 0) {
                setStatus({ type: "info", msg: "No costs found for this month." });
            }
        } catch (err) {
            setStatus({ type: "error", msg: err?.message || "Failed to get report." });
        }
    }

    function formatDay(costItem) {
        const day = Number(costItem?.Date?.day);
        if (!Number.isFinite(day)) return "";
        return `${day}/${month}/${year}`;
    }

    function formatMoney(v) {
        const n = Number(v);
        if (!Number.isFinite(n)) return "";
        return n.toFixed(2);
    }

    // show converted sum if exists, else original
    function getSumToShow(costItem) {
        const converted = Number(costItem?.sumInTarget);
        if (Number.isFinite(converted)) return formatMoney(converted);

        const original = Number(costItem?.sum);
        if (Number.isFinite(original)) return formatMoney(original);

        return "";
    }

    // show target currency if conversion was requested, else original
    function getCurrencyToShow(costItem) {
        return costItem?.targetCurrency || costItem?.currency || "";
    }

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h5">Monthly Report</Typography>

            {!db && <Alert severity="info">Loading database...</Alert>}
            {status && <Alert severity={status.type}>{status.msg}</Alert>}

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
                <TextField
                    label="Year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    fullWidth
                />

                <TextField
                    label="Month"
                    type="number"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    inputProps={{ min: 1, max: 12 }}
                    fullWidth
                />

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

                <Button
                    variant="contained"
                    onClick={onGetReport}
                    sx={{ width: { xs: "100%", sm: "auto" }, minHeight: 44 }}
                >
                    Get Report
                </Button>
            </Box>

            {report && (
                <>
                    <Paper variant="outlined">
                        <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
                            <Table size="small" sx={{ minWidth: 720 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell align="right">Sum</TableCell>
                                        <TableCell>Currency</TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {(report.costs || []).map((c, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{formatDay(c)}</TableCell>
                                            <TableCell>{c.category}</TableCell>
                                            <TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                                                {c.description}
                                            </TableCell>

                                            {/* ✅ now shows converted sum */}
                                            <TableCell align="right">{getSumToShow(c)}</TableCell>

                                            {/* ✅ now shows target currency */}
                                            <TableCell>{getCurrencyToShow(c)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Typography variant="h6">
                        Total: {formatMoney(report.total?.total)} {report.total?.currency}
                    </Typography>
                </>
            )}
        </Box>
    );
}