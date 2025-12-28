import { useEffect, useMemo, useState } from "react";
import {
    AppBar,
    Tabs,
    Tab,
    Box,
    Container,
    Toolbar,
    Typography,
    CssBaseline,
    Paper,
    GlobalStyles,
} from "@mui/material";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";

import AddCostPage from "./pages/AddCostPage";
import ReportPage from "./pages/ReportPage";
import ChartsPage from "./pages/ChartsPage";
import SettingsPage from "./pages/SettingsPage";
import { openCostsDB } from "./lib/idb";

export default function App() {
    const [tab, setTab] = useState(0);
    const [db, setDb] = useState(null);

    useEffect(() => {
        let isMounted = true;

        (async () => {
            const opened = await openCostsDB("costsdb", 1);
            if (isMounted) setDb(opened);
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    const theme = useMemo(() => {
        const COLORS = {
            piggyPink: "#FDDDE6",
            cottonCandy: "#FFBCD9",
            cameoPink: "#EFBBCC",
            frenchPink: "#F64A8A",
            persianPink: "#F77FBE",
            rose: "#FC94AF",
            frenchFuchsia: "#FC46AA",
            watermelon: "#FE7F9C",
            flamingo: "#FDA4BA",
            rouge: "#F26B8A",
        };

        return createTheme({
            palette: {
                mode: "light",
                primary: { main: COLORS.frenchPink },
                secondary: { main: COLORS.persianPink },
                background: {
                    default: COLORS.piggyPink,
                    paper: "#ffffff",
                },
                text: { primary: "#2b2b2b" },
            },
            shape: { borderRadius: 8 },
            typography: {
                fontFamily:
                    'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
                h6: { fontWeight: 800 },
            },
            components: {
                MuiAppBar: {
                    styleOverrides: {
                        root: {
                            background: `linear-gradient(90deg, ${COLORS.frenchPink}, ${COLORS.frenchFuchsia})`,
                            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                        },
                    },
                },
                MuiTabs: {
                    styleOverrides: {
                        indicator: {
                            height: 4,
                            borderRadius: 999,
                            backgroundColor: COLORS.cottonCandy,
                        },
                    },
                },
                MuiTab: {
                    styleOverrides: {
                        root: {
                            color: "rgba(255,255,255,0.9)",
                            fontWeight: 700,
                            "&.Mui-selected": { color: "#fff" },
                        },
                    },
                },
                MuiPaper: {
                    styleOverrides: {
                        root: { borderRadius: 12 }, // עדין, לא כדור
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: { borderRadius: 12, fontWeight: 800 },
                        containedPrimary: { boxShadow: "0 10px 18px rgba(0,0,0,0.12)" },
                    },
                },
                MuiTableContainer: {
                    styleOverrides: {
                        root: {
                            borderRadius: 12,
                            overflow: "hidden",
                            border: `1px solid ${alpha(COLORS.rouge, 0.25)}`,
                            background: "#fff",
                        },
                    },
                },
                MuiTableHead: {
                    styleOverrides: {
                        root: { backgroundColor: COLORS.cottonCandy },
                    },
                },
                MuiTableCell: {
                    styleOverrides: {
                        head: {
                            fontWeight: 900,
                            color: "#2b2b2b",
                            borderBottom: `2px solid ${alpha(COLORS.rouge, 0.25)}`,
                        },
                        body: { borderBottom: `1px solid ${alpha(COLORS.rouge, 0.15)}` },
                    },
                },
                MuiTableRow: {
                    styleOverrides: {
                        root: {
                            "&:nth-of-type(even)": {
                                backgroundColor: alpha(COLORS.piggyPink, 0.45),
                            },
                            "&:hover": {
                                backgroundColor: alpha(COLORS.flamingo, 0.25),
                            },
                        },
                    },
                },
                MuiTextField: {
                    styleOverrides: {
                        root: {
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 12,
                                backgroundColor: alpha(COLORS.piggyPink, 0.35),
                            },
                        },
                    },
                },
            },
        });
    }, []);

    const CenterPage = ({ children }) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Box sx={{ width: "100%", maxWidth: 720 }}>{children}</Box>
        </Box>
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />

            {/* ✅ מעלים לגמרי את ה־focus ring (כחול/outline) בכל האתר */}
            <GlobalStyles
                styles={{
                    "*:focus": { outline: "none" },
                    "*:focus-visible": { outline: "none", boxShadow: "none" },
                    "button:focus, button:focus-visible": { outline: "none", boxShadow: "none" },
                    "a:focus, a:focus-visible": { outline: "none", boxShadow: "none" },
                    "[role='button']:focus, [role='button']:focus-visible": { outline: "none", boxShadow: "none" },
                    ".Mui-focusVisible": { outline: "none", boxShadow: "none" },
                }}
            />

            <Box
                sx={{
                    minHeight: "100vh",
                    bgcolor: "background.default",
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <Box sx={{ width: "100%", maxWidth: 960 }}>
                    {/* Header */}
                    <Box sx={{ px: 2, pt: 3 }}>
                        <Paper elevation={10} sx={{ overflow: "hidden", borderRadius: "12px" }}>
                            <AppBar position="static" sx={{ boxShadow: "none" }}>
                                {/* ✅ "Cost Manager" באמצע */}
                                <Toolbar sx={{ py: 1, px: 2, justifyContent: "center" }}>
                                    <Typography variant="h6" sx={{ color: "#fff", textAlign: "center" }}>
                                        Cost Manager
                                    </Typography>
                                </Toolbar>

                                <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
                                    <Tab label="Add Cost" />
                                    <Tab label="Monthly Report" />
                                    <Tab label="Charts" />
                                    <Tab label="Settings" />
                                </Tabs>
                            </AppBar>
                        </Paper>
                    </Box>

                    {/* Main */}
                    <Container maxWidth={false} sx={{ mt: 3, pb: 6, px: 2 }}>
                        <Box hidden={tab !== 0}>
                            <CenterPage>
                                <AddCostPage db={db} />
                            </CenterPage>
                        </Box>

                        <Box hidden={tab !== 1}>
                            <CenterPage>
                                <ReportPage db={db} />
                            </CenterPage>
                        </Box>

                        <Box hidden={tab !== 2}>
                            <CenterPage>
                                <ChartsPage db={db} />
                            </CenterPage>
                        </Box>

                        <Box hidden={tab !== 3}>
                            <CenterPage>
                                <SettingsPage />
                            </CenterPage>
                        </Box>
                    </Container>
                </Box>
            </Box>
        </ThemeProvider>
    );
}