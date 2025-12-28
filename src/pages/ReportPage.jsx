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
    Paper
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
            const r = await db.getReport(Number(year), Number(month), currency);

            console.log("REPORT DEBUG (full):", r);
            console.table(
                (r.costs || []).map((c) => ({
                    id: c.id,
                    sum: c.sum,
                    currency: c.currency,
                    sumInTarget: c.sumInTarget,
                    targetCurrency: c.targetCurrency
                }))
            );

            setReport(r);

            if (!r.costs || r.costs.length === 0) {
                setStatus({ type: "info", msg: "No costs found for this month." });
            }
        } catch (err) {
            setStatus({ type: "error", msg: err?.message || "Failed to get report." });
        }
    }
    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h5">Monthly Report</Typography>


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

                <Button variant="contained" onClick={onGetReport}>
                    Get Report
                </Button>
            </Box>

            {report && (
                <>
                    <Paper variant="outlined">
                        <Table size="small">
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
                                {report.costs.map((c) => {
                                    const sumToShow = Number.isFinite(Number(c.sumInTarget))
                                        ? Number(c.sumInTarget)
                                        : Number.isFinite(Number(c.sum))
                                            ? Number(c.sum)
                                            : "";
                                    const currencyToShow = c.targetCurrency ?? c.currency ?? "";

                                    return (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.createdAt ? c.createdAt.slice(0, 10) : ""}</TableCell>
                                            <TableCell>{c.category}</TableCell>
                                            <TableCell>{c.description}</TableCell>
                                            <TableCell align="right">{sumToShow}</TableCell>
                                            <TableCell>{currencyToShow}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Paper>

                    <Typography variant="h6">
                        Total: {report.total.total} {report.total.currency}
                    </Typography>
                </>
            )}
        </Box>
    );
}