import React, { useState } from "react";
import Dashboard from "./components/ExcelFolderSearch.jsx";
import { Card } from "./components/ui/card.jsx";
import { processData } from "./utils.js";
import "./index.css";

export default function App() {
    const [data, setData] = useState([]);

    const handleFileUpload = (parsedData) => {
        const processed = processData(parsedData);
        setData(processed);
    };

    return (
        <div className="bg-gray-900 min-h-screen w-full text-white flex flex-col items-center p-4">
            <Card className="w-full max-w-4xl mt-10">
                <Dashboard
                    data={data}
                    setData={setData}
                    onFileUpload={handleFileUpload}
                />
            </Card>
        </div>
    );
}
