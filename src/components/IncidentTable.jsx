import React from "react";

export default function IncidentTable({ data }) {
    if (!data.length) return null;

    const headers = Object.keys(data[0]);

    return (
        <div className="overflow-x-auto my-6 shadow-lg rounded-lg">
            <table className="min-w-full border border-gray-700">
                <thead className="bg-gray-800 text-white sticky top-0 z-10">
                <tr>
                    {headers.map(h => (
                        <th key={h} className="px-4 py-2 border">{h}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {data.map((row, idx) => {
                    const isAging =
                        row.isAgingIncident === true ||
                        row.isAgingIncident === "TRUE" ||
                        row.isAgingIncident === 1;

                    return (
                        <tr
                            key={idx}
                            className={`border-b ${
                                isAging
                                    ? "bg-yellow-200 text-black font-bold hover:bg-yellow-300"
                                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                            }`}
                        >
                            {headers.map(h => (
                                <td key={h} className="px-4 py-2 border">
                                    {h === "isAgingIncident" ? (isAging ? "Yes" : "No") : row[h]}
                                </td>
                            ))}
                        </tr>


                    );
                })}
                </tbody>
            </table>
        </div>
    );
}
