import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#FBBF24", "#10B981"]; // Aging vs Recent

export default function AgingChart({ data = [] }) {
    const oldCount = data.filter((d) => d.isAgingIncident).length;
    const recentCount = data.length - oldCount;

    const chartData = [
        { name: "Aging Incidents (>15d)", value: oldCount },
        { name: "Recent Incidents", value: recentCount },
    ];

    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-2 text-yellow-400">Aging Incidents</h2>
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                        >
                            {chartData.map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-gray-400 text-sm mt-4">No data available for aging chart.</p>
            )}
        </div>
    );
}
