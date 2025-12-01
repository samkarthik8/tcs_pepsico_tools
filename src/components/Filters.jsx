import React from "react";

export default function Filters({ filters, setFilters, data }) {
    const categories = ["All", ...new Set(data.map(d => d.Category).filter(Boolean))];
    const markets = ["All", ...new Set(data.map(d => d.Market).filter(Boolean))];

    return (
        <div className="flex flex-wrap gap-4 mt-4">
            <select
                className="bg-gray-900 text-white text-lg p-3 rounded shadow hover:bg-blue-900 transition min-w-[180px]"
                value={filters.category}
                onChange={e => setFilters({ ...filters, category: e.target.value })}
            >
                {categories.map(c => <option key={c}>{c}</option>)}
            </select>

            <select
                className="bg-gray-900 text-white text-lg p-3 rounded shadow hover:bg-blue-900 transition min-w-[180px]"
                value={filters.market}
                onChange={e => setFilters({ ...filters, market: e.target.value })}
            >
                {markets.map(m => <option key={m}>{m}</option>)}
            </select>
        </div>
    );
}
