import { useEffect, useState } from "react";
import { AppBar, Tabs, Tab, Box, Container, Toolbar, Typography } from "@mui/material";
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

        return () => { isMounted = false; };
    }, []);

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
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

            <Container sx={{ mt: 3 }}>
                <Box hidden={tab !== 0}><AddCostPage db={db} /></Box>
                <Box hidden={tab !== 1}><ReportPage db={db} /></Box>
                <Box hidden={tab !== 2}><ChartsPage db={db} /></Box>
                <Box hidden={tab !== 3}><SettingsPage /></Box>
            </Container>
        </>
    );
}
