import { useState } from "react";
import { Box, Button, MenuItem, TextField, Typography, Alert } from "@mui/material";

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

        if (!db) {
            setStatus({ type: "error", msg: "Database not ready yet. Try again in a second." });
            return;
        }

        if (sum === "" || Number.isNaN(Number(sum))|| Number(sum) <= 0) {
            setStatus({ type: "error", msg: "Please enter a valid positive sum." });
            return;
        }
        if (!category.trim()) {
            setStatus({ type: "error", msg: "Please enter a category." });
            return;
        }

        const added = await db.addCost({
            sum: Number(sum),
            currency,
            category: category.trim(),
            description: description.trim()
        });

        setStatus({ type: "success", msg: `Added! id=${added.id}` });
        setSum("");
        setCurrency("USD");
        setCategory("");
        setDescription("");
    }

    return (
        <Box component="form" onSubmit={onSubmit} sx={{ maxWidth: 520, display: "grid", gap: 2 }}>
            <Typography variant="h5">Add Cost</Typography>

            {!db && <Alert severity="info">Loading database...</Alert>}
            {status && <Alert severity={status.type}>{status.msg}</Alert>}

            <TextField label="Sum" value={sum} onChange={(e) => setSum(e.target.value)} inputMode="decimal" />

            <TextField select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {currencies.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>

            <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

            <Button type="submit" variant="contained">Add</Button>
        </Box>
    );
}
