import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import LandingPage from "./LandingPage";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";

if (!convexUrl && import.meta.env.DEV) {
  console.warn(
    "⚠️ VITE_CONVEX_URL is not set. Please run 'npx convex dev' to set up Convex."
  );
}

const convex = new ConvexReactClient(convexUrl);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/play" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ConvexProvider>
  </React.StrictMode>
);
