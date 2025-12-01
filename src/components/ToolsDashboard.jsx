import React from "react";
import {Card} from "./ui/card";
import {useNavigate} from "react-router-dom";
import {FiFileText, FiKey, FiSearch} from "react-icons/fi"; // icons for each tool

export default function ToolsDashboard() {
    const navigate = useNavigate();

    const tools = [
        {
            title: "Incident Report Dashboard",
            description: "Open and view incident reports",
            path: "/incident-report",
            icon: <FiFileText/>
        },
        {
            title: "Excel Folder Search",
            description: "Search and process Excel files",
            path: "/excel-folder-search",
            icon: <FiSearch/>
        },
        {
            title: "Voucher Decryption",
            description: "Decrypt and analyze voucher codes",
            path: "/voucher-decryption",
            icon: <FiKey/>
        },
    ];

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-b from-blue-900 via-blue-950 to-blue-900 text-gray-100 p-10 flex flex-col items-center font-sans">
            <h1 className="text-4xl font-extrabold text-white mb-10">
                TCS PepsiCo Tools
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                {tools.map((tool, index) => (
                    <Card
                        key={index}
                        icon={tool.icon}
                        onClick={() => navigate(tool.path)}
                        className="text-center"
                    >
                        <h2 className="text-2xl font-semibold mb-3 text-white">
                            {tool.title}
                        </h2>
                        <p className="text-gray-300">{tool.description}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}
