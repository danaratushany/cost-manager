import { useEffect, useState } from "react";
import { Box, Button, TextField, Typography, Alert } from "@mui/material";

const KEY = "ratesUrl";

export default function SettingsPage() {
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem(KEY) || "";
        setUrl(saved);
    }, []);

    function onSave() {
        localStorage.setItem(KEY, url.trim());
        setStatus({ type: "success", msg: "Saved!" });
    }

    return (
        <Box sx={{ maxWidth: 720, display: "grid", gap: 2 }}>
            <Typography variant="h5">Settings</Typography>

            {status && <Alert severity={status.type}>{status.msg}</Alert>}

            <TextField
                label="Exchange Rates URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-server.com/rates.json"
                fullWidth
            />

            <Button variant="contained" onClick={onSave}>Save</Button>

            <Alert severity="info">
                The URL should return JSON like: {"{\"USD\":1,\"GBP\":0.6,\"EURO\":0.7,\"ILS\":3.4}"}
            </Alert>
        </Box>
    );
}
