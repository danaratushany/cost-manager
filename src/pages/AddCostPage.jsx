import { useState } from "react";
import { Box, Button, MenuItem, TextField, Typography, Alert } from "@mui/material";

// Allowed currencies for the form dropdown
const currencies = ["USD", "ILS", "GBP", "EURO"];

export default function AddCostPage({ db }) {
    const [sum, setSum] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState(null);

    async function onSubmit(e) {
        e.preventDefault();
        setStatus(null);

        // Validate DB is ready (IndexedDB opens async)
        if (!db) {
            setStatus({ type: "error", msg: "Database not ready yet. Try again in a second." });
            return;
        }

        // Validate sum is a positive number
        const sumNumber = Number(sum);
        if (sum === "" || Number.isNaN(sumNumber) || sumNumber <= 0) {
            setStatus({ type: "error", msg: "Please enter a valid positive sum." });
            return;
        }

        // Validate category is not empty
        if (!category.trim()) {
            setStatus({ type: "error", msg: "Please enter a category." });
            return;
        }

        // Save cost in DB
        const added = await db.addCost({
            sum: sumNumber,
            currency,
            category: category.trim(),
            description: description.trim(),
        });

        // ✅ Success feedback (no id, because addCost returns only the required fields)
        setStatus({
            type: "success",
            msg: `Added! ${added.sum} ${added.currency} (${added.category})`,
        });

        // Reset form
        setSum("");
        setCurrency("USD");
        setCategory("");
        setDescription("");
    }

    return (
        <Box
            component="form"
            onSubmit={onSubmit}
            sx={{
                width: "100%",
                maxWidth: { xs: "100%", sm: 520 },
                display: "grid",
                gap: { xs: 1.5, sm: 2 },
            }}
        >
            <Typography variant="h5">Add Cost</Typography>

            {!db && <Alert severity="info">Loading database...</Alert>}
            {status && <Alert severity={status.type}>{status.msg}</Alert>}

            <Box
                sx={{
                    display: "grid",
                    gap: { xs: 1.5, sm: 2 },
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
            >
                <TextField
                    label="Sum"
                    value={sum}
                    onChange={(e) => setSum(e.target.value)}
                    inputMode="decimal"
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
            </Box>

            <TextField
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
            />

            <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
            />

            <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-start" } }}>
                <Button
                    type="submit"
                    variant="contained"
                    sx={{
                        width: { xs: "100%", sm: "auto" },
                        minHeight: 44,
                    }}
                >
                    Add
                </Button>
            </Box>
        </Box>
    );
}