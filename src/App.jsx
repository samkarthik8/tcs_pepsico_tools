import React, {useState} from "react";
import {BrowserRouter, Route, Routes} from "react-router-dom";

// Home Tools Dashboard
import ToolsDashboard from "./components/ToolsDashboard.jsx";

// Tool pages
import IncidentReportDashboard from "./components/IncidentReportDashboard.jsx";
import ExcelFolderSearch from "./components/ExcelFolderSearch.jsx";
import VoucherDecryption from "./components/VoucherDecryption.jsx";

// Utilities
import {processData} from "./utils.js";
import "./index.css";

export default function App() {
    const [data, setData] = useState([]);

    // Handles file upload for the tools that require it
    const handleFileUpload = (parsedData) => {
        const processed = processData(parsedData);
        setData(processed);
    };

    return (
        <BrowserRouter>
            <Routes>
                {/* MAIN HOME DASHBOARD */}
                <Route path="/" element={<ToolsDashboard/>}/>

                {/* INCIDENT REPORT DASHBOARD */}
                <Route
                    path="/incident-report"
                    element={
                        <IncidentReportDashboard
                            data={data}
                            setData={setData}
                            onFileUpload={handleFileUpload}
                        />
                    }
                />

                {/* EXCEL FOLDER SEARCH */}
                <Route
                    path="/excel-folder-search"
                    element={
                        <ExcelFolderSearch
                            data={data}
                            setData={setData}
                            onFileUpload={handleFileUpload}
                        />
                    }
                />

                {/* VOUCHER DECRYPTION — usually does NOT need data props */}
                <Route
                    path="/voucher-decryption"
                    element={<VoucherDecryption/>}
                />
            </Routes>
        </BrowserRouter>
    );
}
