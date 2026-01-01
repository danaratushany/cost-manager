import { useEffect, useMemo, useState } from "react";
import { Box, Button, TextField, Typography, Alert, Stack } from "@mui/material";

//  Must match the key that idb.js reads from localStorage
// idb.js uses this value to know where to fetch the exchange rates JSON from.
const KEY = "ratesUrl";

//  Default URL for exchange rates
// Works locally (Vite serves files from /public) and also works when deployed (Netlify serves the same file path).
const DEFAULT_URL = "/rates.json";

//  Optional: if you used an older absolute Netlify URL before,
// we can auto-migrate to DEFAULT_URL to avoid CORS issues in localhost.
const OLD_NETLIFY_URL = "https://singular-pika-362948.netlify.app/rates.json";

export default function SettingsPage() {
    //  URL input state (what the user sees and edits)
    const [url, setUrl] = useState(DEFAULT_URL);

    //  Status message state (success / info / error)
    const [status, setStatus] = useState(null);

    //  Runs once on mount:
    // - Load ratesUrl from localStorage (if exists)
    // - If missing -> use DEFAULT_URL
    // - If old Netlify URL -> migrate to DEFAULT_URL
    useEffect(() => {
        const savedRaw = localStorage.getItem(KEY);
        const saved = (savedRaw || "").trim();

        // If nothing saved -> show default and do not store anything yet
        if (!saved) {
            setUrl(DEFAULT_URL);
            return;
        }

        // If old URL is saved -> migrate to DEFAULT_URL
        // This prevents CORS problems on localhost and keeps the project consistent.
        if (saved === OLD_NETLIFY_URL) {
            localStorage.setItem(KEY, DEFAULT_URL);
            setUrl(DEFAULT_URL);
            setStatus({
                type: "info",
                msg: "Migrated old Netlify URL to /rates.json (works locally + deployed).",
            });
            return;
        }

        // Otherwise use the saved value
        setUrl(saved);
    }, []);

    //  Save button:
    // - Trim the input
    // - If empty -> fallback to DEFAULT_URL
    // - Persist to localStorage so idb.js can fetch exchange rates
    function onSave() {
        const trimmed = url.trim() || DEFAULT_URL;
        localStorage.setItem(KEY, trimmed);
        setUrl(trimmed);
        setStatus({ type: "success", msg: "Saved!" });
    }

    //  Quick action: force the recommended local path (/rates.json)
    // This is the best option for both localhost and deployed app.
    function useLocal() {
        setUrl(DEFAULT_URL);
        localStorage.setItem(KEY, DEFAULT_URL);
        setStatus({ type: "success", msg: "Using /rates.json (recommended)." });
    }

    //  Reset action:
    // - Remove the setting from localStorage
    // - UI goes back to DEFAULT_URL
    function clearSetting() {
        localStorage.removeItem(KEY);
        setUrl(DEFAULT_URL);
        setStatus({ type: "success", msg: "Reset to default (/rates.json)." });
    }

    //  Helper text under the input:
    // If user types an external URL, warn about possible CORS issues on localhost.
    const helperText = useMemo(() => {
        if (url.startsWith("http")) {
            return "Tip: External URLs may be blocked in localhost due to CORS. Prefer /rates.json.";
        }
        return "Recommended: /rates.json";
    }, [url]);

    return (
        //  Responsive layout:
        // - Keep the page centered with maxWidth
        // - Add side padding so content doesn't touch screen edges on mobile
        <Box
            sx={{
                maxWidth: 720,
                mx: "auto", // center horizontally
                px: { xs: 2, sm: 0 }, // padding on mobile only
                display: "grid",
                gap: 2,
            }}
        >
            <Typography variant="h5">Settings</Typography>

            {/* Status message shown after Save / Reset / Migration */}
            {status && <Alert severity={status.type}>{status.msg}</Alert>}

            {/* Exchange rates URL input */}
            <TextField
                label="Exchange Rates URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/rates.json"
                helperText={helperText}
                fullWidth
            />

            {/* Buttons row (Responsive):
                - Mobile (xs): stack buttons vertically (easier to tap)
                - Desktop (sm+): buttons in a row
            */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ alignItems: "stretch" }}
            >
                {/* Save current input */}
                <Button
                    variant="contained"
                    onClick={onSave}
                    fullWidth
                    sx={{ minHeight: 44 }}
                >
                    Save
                </Button>

                {/* Use recommended local URL */}
                <Button
                    variant="outlined"
                    onClick={useLocal}
                    fullWidth
                    sx={{ minHeight: 44 }}
                >
                    Use /rates.json
                </Button>

                {/* Reset to default */}
                <Button
                    variant="text"
                    color="inherit"
                    onClick={clearSetting}
                    fullWidth
                    sx={{ minHeight: 44 }}
                >
                    Reset
                </Button>
            </Stack>

            {/* Example JSON format required by the project */}
            <Alert severity="info">
                The URL should return JSON like: {"{"} "USD": 1, "GBP": 0.6, "EURO": 0.7, "ILS": 3.4 {"}"}
            </Alert>
        </Box>
    );
}