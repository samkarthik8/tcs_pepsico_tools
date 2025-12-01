import React, { useState } from "react";
import FileUpload from "./FileUpload.jsx";
import Filters from "./Filters.jsx";
import CategoryChart from "./CategoryChart.jsx";
import MarketChart from "./MarketChart.jsx";
import AgingChart from "./AgingChart.jsx";
import IncidentTable from "./IncidentTable.jsx";
import StatsSummary from "./StatsSummary.jsx";
import IncidentMap from "./IncidentMap";

export default function Dashboard({ data, setData, onFileUpload }) {
    const [filters, setFilters] = useState({
        state: "",
        category: "",
        market: "",
        oldIncidents: false,
    });

    const handleFile = (parsedData) => {
        onFileUpload(parsedData);
    };

    // Apply filters
    const filteredData = data.filter((d) => {
        const stateMatch = !filters.state || filters.state === "All" || d.State === filters.state;
        const categoryMatch = !filters.category || filters.category === "All" || d.Category === filters.category;
        const marketMatch = !filters.market || filters.market === "All" || d.Market === filters.market;
        const oldIncidentMatch = !filters.oldIncidents || d.isAgingIncident;
        return stateMatch && categoryMatch && marketMatch && oldIncidentMatch;
    });

    const isFileUploaded = !!data.length;

    return (
        <div className="min-h-screen w-full bg-gray-700 text-gray-900 p-6 font-sans flex flex-col gap-6">

            {/* Main Title */}
            <div className="flex justify-center bg-gray-900 py-8">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-white to-blue-500 drop-shadow-lg animate-fade-in">
                    Incident Report Dashboard
                </h1>
            </div>

            {/* Stats Summary */}
            <StatsSummary data={filteredData} isFileUploaded={isFileUploaded} />

            {/* File Upload */}
            <div className="my-4 animate-fade-in-delay">
                <FileUpload setData={handleFile} />
            </div>

            {/* Filters (visible only if data uploaded) */}
            {isFileUploaded && (
                <div className="my-4 flex flex-col gap-2 animate-fade-in-delay-2">
                    <Filters filters={filters} setFilters={setFilters} data={data} />
                    <label className="flex items-center gap-2 text-gray-200 mt-2 text-lg">
                        <input
                            type="checkbox"
                            className="accent-yellow-400 w-6 h-6"
                            checked={filters.oldIncidents}
                            onChange={(e) =>
                                setFilters({ ...filters, oldIncidents: e.target.checked })
                            }
                        />
                        Show Aging Incidents (&gt;15 days)
                    </label>
                </div>
            )}

            {/* Charts (visible only if data uploaded) */}
            {isFileUploaded && (
                <>
                    {/* Market Chart */}
                    <div id="marketChartSection">
                        <MarketChart data={filteredData} />
                    </div>

                    {/* Optional: Incidents by Market Slide */}
                    {/* Only render a separate chart if you want a different chart type */}
                    <div id="incidentsByMarketSection" style={{ display: "none" }}>
                        <MarketChart data={filteredData} showByMarketOnly={true} />
                    </div>

                    {/* Category Chart */}
                    <div id="categoryChartSection">
                        <CategoryChart data={filteredData} />
                    </div>

                    {/* Map */}
                    <div id="mapSection">
                        <IncidentMap data={filteredData} />
                    </div>
                    {/* Incident Table */}
                    {isFileUploaded && (
                        <div id="incidentTableSection">
                            <IncidentTable data={filteredData} />
                        </div>
                    )}
                </>

            )}
        </div>
    );
}
