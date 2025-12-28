import { useEffect, useMemo, useState } from "react";
import { Box, Button, TextField, Typography, Alert, Stack } from "@mui/material";

const KEY = "ratesUrl";

// Default that works both locally (Vite serves public/) and on Netlify (same site serves it)
const DEFAULT_URL = "/rates.json";

// (Optional) If you previously used this Netlify URL, we can auto-migrate to DEFAULT_URL
const OLD_NETLIFY_URL = "https://singular-pika-362948.netlify.app/rates.json";

export default function SettingsPage() {
    const [url, setUrl] = useState(DEFAULT_URL);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        const savedRaw = localStorage.getItem(KEY);
        const saved = (savedRaw || "").trim();

        // If nothing saved -> use default
        if (!saved) {
            setUrl(DEFAULT_URL);
            return;
        }

        // If old URL is saved -> migrate to default (prevents CORS issues on localhost)
        if (saved === OLD_NETLIFY_URL) {
            localStorage.setItem(KEY, DEFAULT_URL);
            setUrl(DEFAULT_URL);
            setStatus({ type: "info", msg: "Migrated old Netlify URL to /rates.json (works locally + deployed)." });
            return;
        }
        setUrl(saved);
    }, []);

    function onSave() {
        const trimmed = url.trim() || DEFAULT_URL;
        localStorage.setItem(KEY, trimmed);
        setUrl(trimmed);
        setStatus({ type: "success", msg: "Saved!" });
    }

    function useLocal() {
        setUrl(DEFAULT_URL);
        localStorage.setItem(KEY, DEFAULT_URL);
        setStatus({ type: "success", msg: "Using /rates.json (recommended)." });
    }

    function clearSetting() {
        localStorage.removeItem(KEY);
        setUrl(DEFAULT_URL);
        setStatus({ type: "success", msg: "Reset to default (/rates.json)." });
    }

    const helperText = useMemo(() => {
        if (url.startsWith("http")) {
            return "Tip: External URLs may be blocked in localhost due to CORS. Prefer /rates.json.";
        }
        return "Recommended: /rates.json";
    }, [url]);

    return (
        <Box sx={{ maxWidth: 720, display: "grid", gap: 2 }}>
            <Typography variant="h5">Settings</Typography>

            {status && <Alert severity={status.type}>{status.msg}</Alert>}

            <TextField
                label="Exchange Rates URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/rates.json"
                helperText={helperText}
                fullWidth
            />

            <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={onSave}>Save</Button>
                <Button variant="outlined" onClick={useLocal}>Use /rates.json</Button>
                <Button variant="text" color="inherit" onClick={clearSetting}>Reset</Button>
            </Stack>

            <Alert severity="info">
                The URL should return JSON like: {"{"} "USD": 1, "GBP": 0.6, "EURO": 0.7, "ILS": 3.4 {"}"}
            </Alert>
        </Box>
    );
}