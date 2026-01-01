// main.jsx
// Entry point of the React application.
//
// Responsibilities:
// 1) Import global CSS (index.css) once for the whole app.
// 2) Create the React root and render <App /> into the #root element.
// 3) Wrap with <StrictMode> in development to help catch potential issues.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";     // Global styles (minimal; most styling is via MUI Theme in App.jsx)
import App from "./App.jsx"; // Main application component (tabs/pages + theme + DB init)

// Get the DOM element where React will mount the application.
const rootElement = document.getElementById("root");

// Create a React root (React 18+ API) and render the application.
createRoot(rootElement).render(
    <StrictMode>
        {/* App contains the UI (MUI) and the IndexedDB connection */}
        <App />
    </StrictMode>
);