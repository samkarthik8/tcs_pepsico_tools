import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function CategoryChart({ data = [] }) {
    const categoryData = Object.entries(
        data.reduce((acc, d) => {
            const key = d.Category || "Unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value }));

    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-2 text-pink-400">Incidents by Category</h2>
            {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                        data={categoryData}
                        margin={{ top: 20, right: 20, left: 20, bottom: 60 }} // increase bottom margin
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="name"
                            stroke="#D1D5DB"
                            angle={-45}          // slanted upward
                            textAnchor="end"
                            interval={0}          // show all labels
                            tick={{ fontSize: 12 }} // smaller font
                        />
                        <YAxis stroke="#D1D5DB" />
                        <Tooltip cursor={false} formatter={(value) => [`${value}`, "Count"]} />
                        <Bar dataKey="value" fill="#EC4899" />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-gray-400 text-sm mt-4">No category data available.</p>
            )}
        </div>
    );
}
