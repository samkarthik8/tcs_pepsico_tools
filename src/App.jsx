import React, { useState } from "react";
import Dashboard from "./components/ExcelFolderSearch.jsx";
import { processData } from "./utils.js";
import './index.css';

export default function App() {
    const [data, setData] = useState([]);

    const handleFileUpload = (parsedData) => {
        const processed = processData(parsedData);
        setData(processed);

    };

    return (
        <div className="bg-gray-900 min-h-screen w-full text-white flex flex-col items-center">
            <Dashboard data={data} setData={setData} onFileUpload={handleFileUpload} />
        </div>
    );
}
