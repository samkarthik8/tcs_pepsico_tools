import React from "react";
import {Card} from "./ui/card";
import {useNavigate} from "react-router-dom";
import {FiBarChart2, FiCheckSquare, FiChevronsUp, FiFileText, FiKey, FiSearch, FiDatabase} from "react-icons/fi";


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
        {
            title: "TH Reconciliation",
            description: "Process and reconcile TH transaction records",
            path: "/th-reconciliation",
            icon: <FiCheckSquare/>
        },
        {
            title: "RCA Quality Dashboard",
            description: "Analyze RCA quality scores and incident documentation",
            path: "/rca-quality-dashboard",
            icon: <FiBarChart2/>
        },
        {
            title: "Trino Connection",
            description: "Run queries on catalogs and schemas via Trino",
            path: "/trino-connection",
            icon: <FiDatabase/>
        },
        {
            title: "Customer Rewards History",
            description: "Check Customer Rewards History for a customer in any market",
            path: "/customer-rewards-history",
            icon: <FiChevronsUp/>
        }
    ];

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-b from-blue-900 via-blue-950 to-blue-900 text-gray-100 p-10 flex flex-col items-center font-sans">
            <h1 className="text-4xl font-extrabold text-white mb-10">
                TCS PepsiCo Tools
            </h1>
            <div className="fixed bottom-3 right-4 text-xs text-gray-400">
                v1.2.5
            </div>

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
