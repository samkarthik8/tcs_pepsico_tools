import React, { useMemo } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
} from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import worldGeo from "../data/world-countries.json";

// Map market colors (reuse same as MarketChart)
const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"];

export default function IncidentMap({ data = [] }) {
    // Compute incidents per country
    const incidentCounts = useMemo(() => {
        const counts = {};
        data.forEach((d) => {
            if (!d.Market) return;
            const key = d.Market.replace(/\s/g, "").toUpperCase();
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [data]);

    // Assign colors per country
    const marketColors = {};
    Object.keys(incidentCounts).forEach((c, idx) => {
        marketColors[c] = COLORS[idx % COLORS.length];
    });

    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg relative">
            <h2 className="text-xl font-bold mb-2 text-purple-300">Incidents by Country</h2>

            <ComposableMap projectionConfig={{ scale: 150 }}>
                <Geographies geography={worldGeo}>
                    {({ geographies }) =>
                        geographies.map((geo) => {
                            const name = geo.properties.ADMIN || geo.properties.name;
                            const iso2 = geo.properties.iso_a2 || "N/A"; // ✅ Use iso_a2 directly
                            const countryKey = name.replace(/\s/g, "").toUpperCase();
                            const count = incidentCounts[countryKey] || 0;
                            const fillColor = count ? marketColors[countryKey] : "#374151";

                            return (
                                <React.Fragment key={`geo-${geo.rsmKey}`}>
                                    <Geography
                                        geography={geo}
                                        data-tooltip-id="tooltip"
                                        data-tooltip-content={`${name} (${iso2}): ${count} incident${count !== 1 ? "s" : ""}`}
                                        style={{
                                            default: { fill: fillColor, outline: "none" },
                                            hover: { fill: "#555", outline: "none" },
                                            pressed: { fill: fillColor, outline: "none" },
                                        }}
                                    />

                                    {count > 0 && (
                                        <CountryLabel
                                            geo={geo}
                                            iso={iso2}
                                            count={count}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })
                    }
                </Geographies>
            </ComposableMap>

            <ReactTooltip id="tooltip" />
        </div>
    );
}

function CountryLabel({ geo, iso, count }) {
    const centroid = geoCentroid(geo);
    if (!centroid) return null;
    const [x, y] = centroid;

    const smallCountries = ["SG", "QA", "KW", "BH", "MT", "LU", "CL", "EC", "PE", "NZ"];
    const hasSmallArea = (geo.properties.ADMIN || "").length > 10 || smallCountries.includes(iso);

    // Label offset further left for more gap
    const labelOffsetX = -22; // increased from -15
    const labelOffsetY = -4;

    return (
        <Marker key={`marker-${geo.rsmKey}`} coordinates={[x, y]}>
            {hasSmallArea ? (
                <>
                    {/* Line from label to country centroid */}
                    <line
                        x1={labelOffsetX + 4} // start slightly right of text for better gap
                        y1={labelOffsetY}
                        x2={0}
                        y2={0}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                    <text
                        x={labelOffsetX}
                        y={labelOffsetY}
                        textAnchor="end"
                        fontSize={4}
                        fill="#fff"
                        style={{ pointerEvents: "none" }}
                    >
                        {iso}: {count}
                    </text>
                </>
            ) : (
                <text
                    y={0}
                    textAnchor="middle"
                    fontSize={4}
                    fill="#fff"
                    style={{ pointerEvents: "none" }}
                >
                    {iso}: {count}
                </text>
            )}
        </Marker>
    );
}
