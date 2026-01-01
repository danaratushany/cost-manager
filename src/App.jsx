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
    useMediaQuery,
} from "@mui/material";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";

import AddCostPage from "./pages/AddCostPage";
import ReportPage from "./pages/ReportPage";
import ChartsPage from "./pages/ChartsPage";
import SettingsPage from "./pages/SettingsPage";
import { openCostsDB } from "./lib/idb";

export default function App() {
    //  Which tab is currently selected in the UI
    const [tab, setTab] = useState(0);

    //  DB wrapper object returned from openCostsDB (contains addCost/getReport/...)
    const [db, setDb] = useState(null);

    //  Open the IndexedDB connection ONCE when the app mounts
    //  We keep an isMounted flag to prevent setting state if the component unmounts
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

    //  Create the MUI theme once (useMemo)
    //  This theme controls the pink palette and styling for MUI components
    const theme = useMemo(() => {
        //  Colors taken from your palette images (pink theme)
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

        //  MUI theme object
        return createTheme({
            //  Base colors used by the entire UI
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

            //  Global rounding (but not too round)
            shape: { borderRadius: 8 },

            //  Font settings
            typography: {
                fontFamily:
                    'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
                h6: { fontWeight: 800 },
            },

            //  Component-level styling overrides
            components: {
                //  Top AppBar gradient background
                MuiAppBar: {
                    styleOverrides: {
                        root: {
                            background: `linear-gradient(90deg, ${COLORS.frenchPink}, ${COLORS.frenchFuchsia})`,
                            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                        },
                    },
                },

                //  Tabs indicator style
                MuiTabs: {
                    styleOverrides: {
                        indicator: {
                            height: 4,
                            borderRadius: 999,
                            backgroundColor: COLORS.cottonCandy,
                        },
                    },
                },

                //  Tab text style
                MuiTab: {
                    styleOverrides: {
                        root: {
                            color: "rgba(255,255,255,0.9)",
                            fontWeight: 700,
                            "&.Mui-selected": { color: "#fff" },
                        },
                    },
                },

                //  Paper style (cards)
                MuiPaper: {
                    styleOverrides: {
                        root: { borderRadius: 12 },
                    },
                },

                //  Buttons style
                MuiButton: {
                    styleOverrides: {
                        root: { borderRadius: 12, fontWeight: 800 },
                        containedPrimary: { boxShadow: "0 10px 18px rgba(0,0,0,0.12)" },
                    },
                },

                //  Tables container style
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

                //  Table header background
                MuiTableHead: {
                    styleOverrides: {
                        root: { backgroundColor: COLORS.cottonCandy },
                    },
                },

                //  Table cell styling (header/body)
                MuiTableCell: {
                    styleOverrides: {
                        head: {
                            fontWeight: 900,
                            color: "#2b2b2b",
                            borderBottom: `2px solid ${alpha(COLORS.rouge, 0.25)}`,
                        },
                        body: {
                            borderBottom: `1px solid ${alpha(COLORS.rouge, 0.15)}`,
                        },
                    },
                },

                //  Table row zebra striping + hover effect
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

                //  TextFields background + rounding
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

    //  Responsive detection:
    //  On phone (sm and down) => Tabs should be scrollable
    //  On desktop => Tabs should be centered normally
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    //  Wrapper that centers each page content
    //  Responsive: on phone -> full width, on desktop -> maxWidth 720
    const CenterPage = ({ children }) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 720 } }}>{children}</Box>
        </Box>
    );

    return (
        <ThemeProvider theme={theme}>
            {/*  CssBaseline resets default browser styles for consistent UI */}
            <CssBaseline />

            {/*  Remove focus ring (outline) completely across the entire site */}
            {/*  Note: Accessibility-wise, focus rings are helpful, but you asked to remove them fully */}
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

            {/*  Full page background */}
            <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
                {/*  Centered main layout
                    Responsive:
                    - xs (phone): full width
                    - md+ (desktop): max width 960 and centered
                */}
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: { xs: "100%", md: 960 },
                        mx: "auto",
                    }}
                >
                    {/* ===================== HEADER ===================== */}
                    <Box sx={{ px: { xs: 1, md: 2 }, pt: { xs: 1.5, md: 3 } }}>
                        <Paper elevation={10} sx={{ overflow: "hidden", borderRadius: "12px" }}>
                            <AppBar position="static" sx={{ boxShadow: "none" }}>
                                {/*  Center the title exactly */}
                                <Toolbar sx={{ py: 1, px: 2, justifyContent: "center" }}>
                                    <Typography variant="h6" sx={{ color: "#fff", textAlign: "center" }}>
                                        Cost Manager
                                    </Typography>
                                </Toolbar>

                                {/*  Tabs navigation (Responsive)
                                    - Phone: scrollable (so it won’t overflow)
                                    - Desktop: standard + centered (so it won’t “shift left”)
                                */}
                                <Tabs
                                    value={tab}
                                    onChange={(_, v) => setTab(v)}
                                    variant={isMobile ? "scrollable" : "standard"}
                                    scrollButtons={isMobile ? "auto" : false}
                                    allowScrollButtonsMobile={isMobile}
                                    centered={!isMobile}
                                    sx={{
                                        px: 1,
                                        //  Force true centering on desktop (even if MUI adds internal spacing)
                                        "& .MuiTabs-flexContainer": {
                                            justifyContent: isMobile ? "flex-start" : "center",
                                        },
                                    }}
                                >
                                    <Tab label="Add Cost" />
                                    <Tab label="Monthly Report" />
                                    <Tab label="Charts" />
                                    <Tab label="Settings" />
                                </Tabs>
                            </AppBar>
                        </Paper>
                    </Box>

                    {/* ===================== MAIN CONTENT ===================== */}
                    <Container
                        maxWidth={false}
                        sx={{
                            mt: { xs: 2, md: 3 },
                            pb: { xs: 3, md: 6 },
                            px: { xs: 1, md: 2 },
                        }}
                    >
                        {/* Add Cost Page */}
                        <Box hidden={tab !== 0}>
                            <CenterPage>
                                <AddCostPage db={db} />
                            </CenterPage>
                        </Box>

                        {/* Monthly Report Page */}
                        <Box hidden={tab !== 1}>
                            <CenterPage>
                                <ReportPage db={db} />
                            </CenterPage>
                        </Box>

                        {/* Charts Page */}
                        <Box hidden={tab !== 2}>
                            <CenterPage>
                                <ChartsPage db={db} />
                            </CenterPage>
                        </Box>

                        {/* Settings Page */}
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