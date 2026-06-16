import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext.jsx";
import Layout from "./Layout.jsx";
import "./index.css";
import App from "./App.jsx";
import Calculator from "./Calculator.jsx";
import Transactions from "./Transactions.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/transactions" element={<Transactions />} />
            {/* <Route path="/financial" element={<FinancialInsights />} /> */}
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
