import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"];

export default function MarketChart({ data = [] }) {
    if (!Array.isArray(data)) data = [];

    const marketData = Object.entries(
        data.reduce((acc, d) => {
            const key = d.Market || "Unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value }));

    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-2 text-purple-300">Incidents by Market</h2>
            {marketData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={marketData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                        >
                            {marketData.map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-gray-400 text-sm mt-4">No market data available.</p>
            )}
        </div>
    );
}
