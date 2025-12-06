import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import LandingPage from "./LandingPage";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/play" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
