import React from "react";
import { Card } from "./ui/card";
import { useNavigate } from "react-router-dom";

export default function ToolsDashboard() {
    const navigate = useNavigate();

    const tools = [
        {
            title: "Incident Report Dashboard",
            description: "Open and view incident reports",
            path: "/incident-report"
        },
        {
            title: "Excel Folder Search",
            description: "Search and process Excel files",
            path: "/excel-folder-search"
        },
        {
            title: "Voucher Decryption",
            description: "Decrypt and analyze voucher codes",
            path: "/voucher-decryption"
        },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-10">
            <h1 className="text-4xl font-bold mb-10">TCS PepsiCo Tools</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
                {tools.map((tool, index) => (
                    <Card
                        key={index}
                        className="cursor-pointer p-6 hover:bg-gray-700 transition"
                        onClick={() => navigate(tool.path)}
                    >
                        <h2 className="text-2xl font-semibold mb-3">
                            {tool.title}
                        </h2>
                        <p className="text-gray-300">{tool.description}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}
