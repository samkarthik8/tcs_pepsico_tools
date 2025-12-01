import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ToolsDashboard from "./components/ToolsDashboard";

// Your existing pages
import IncidentReport from "./components/ExcelFolderSearch.jsx";
import ExcelFolderSearch from "./components/ExcelFolderSearch.jsx";
import VoucherDecryption from "./components/ExcelFolderSearch.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ToolsDashboard />} />
                <Route path="/incident-report" element={<IncidentReport />} />
                <Route path="/excel-folder-search" element={<ExcelFolderSearch />} />
                <Route path="/voucher-decryption" element={<VoucherDecryption />} />
            </Routes>
        </BrowserRouter>
    );
}
