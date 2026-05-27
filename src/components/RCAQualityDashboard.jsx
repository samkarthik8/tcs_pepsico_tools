import React, {useMemo, useState} from "react";
import FileUpload from "./FileUpload.jsx";
import CategoryChart from "./CategoryChart.jsx";
import MarketChart from "./MarketChart.jsx";
import IncidentTable from "./IncidentTable.jsx";

const REQUIRED_COLUMNS = [
    "Number",
    "Resolution notes",
    "Resolution subcode",
    "Service",
    "Impacted Companies List",
];
const INVALID_ROOT_CAUSES = [
    "Root Cause Unknown",
    "No Documentation",
    "Abandoned / Auto-Closed",
    "Other",
];
const INVALID_RESOLUTION_TYPES = [
    "Other Resolution",
    "",
    null,
    undefined,
];
const CAUSAL_KEYWORDS = [
    "because",
    "root cause",
    "due to",
    "caused by",
    "result of",
    "fixed by",
    "resolved by",
    "the issue was",
    // Spanish
    "causa",
    "solución",
    "solucion",
    "resuelto",
    "se identificó",
    "se identifico",
];
export default function RCAQualityDashboard({
                                                data,
                                                setData,
                                                onFileUpload,
                                            }) {
    const [filters, setFilters] = useState({
        bucket: "All",
        service: "All",
        serviceOffering: "All",
        resolvedBy: "All",
        scoreRange: "All",
        search: "",
    });
    const [missingColumns, setMissingColumns] = useState([]);
    const [liveResolutionNotes, setLiveResolutionNotes] =
        useState("");
    // -----------------------------------------
    // Utility: Find Column Dynamically
    // -----------------------------------------
    const findColumn = (row, possibleNames) => {
        const keys = Object.keys(row || {});
        return keys.find((key) =>
            possibleNames.some(
                (name) =>
                    key?.trim()?.toLowerCase() ===
                    name?.trim()?.toLowerCase()
            )
        );
    };
    // -----------------------------------------
    // RCA Score Calculation
    // -----------------------------------------
    const calculateRCAScore = (row) => {
        const closeNotesKey = findColumn(row, [
            "Resolution notes",
        ]);
        const resolutionSubcodeKey = findColumn(row, [
            "Resolution subcode",
        ]);
        const serviceKey = findColumn(row, ["Service"]);
        const impactedCompaniesKey = findColumn(row, [
            "Impacted Companies List",
        ]);
        const closeNotes = String(
            row?.[closeNotesKey] || ""
        ).trim();
        const resolutionType = String(
            row?.[resolutionSubcodeKey] || ""
        ).trim();
        const rootCauseCategory = String(
            row?.[resolutionSubcodeKey] || ""
        ).trim();
        const systemImpacted = `${row?.[serviceKey] || ""} - ${
            row?.[impactedCompaniesKey] || ""
        }`.trim();
        let score = 0;
        // 1
        if (
            closeNotes &&
            !["nan", "none", "null"].includes(
                closeNotes.toLowerCase()
            )
        ) {
            score += 20;
            // 2
            if (closeNotes.length > 20) {
                score += 15;
            }
            // 3
            if (closeNotes.length > 50) {
                score += 10;
            }
        }
        // 4
        if (
            rootCauseCategory &&
            !INVALID_ROOT_CAUSES.includes(rootCauseCategory)
        ) {
            score += 20;
        }
        // 5
        if (
            resolutionType &&
            !INVALID_RESOLUTION_TYPES.includes(
                resolutionType
            )
        ) {
            score += 15;
        }
        // 6
        if (
            systemImpacted &&
            !systemImpacted
                .toLowerCase()
                .includes("unidentified")
        ) {
            score += 10;
        }
        // 7
        const lowerCloseNotes =
            closeNotes.toLowerCase();
        const containsCausalKeyword =
            CAUSAL_KEYWORDS.some((keyword) =>
                lowerCloseNotes.includes(keyword)
            );
        if (containsCausalKeyword) {
            score += 10;
        }
        return Math.min(score, 100);
    };
    // -----------------------------------------
    // RCA Bucket
    // -----------------------------------------
    const getBucket = (score) => {
        if (score >= 80) return "Excellent";
        if (score >= 50) return "Good";
        if (score >= 20) return "Poor";
        return "Critical";
    };
    // -----------------------------------------
    // File Upload
    // -----------------------------------------
    const handleFileUpload = (parsedData) => {
        if (!parsedData?.length) {
            setData([]);
            return;
        }
        const firstRow = parsedData[0];
        const columns = Object.keys(firstRow);
        const missing = REQUIRED_COLUMNS.filter(
            (requiredColumn) =>
                !columns.some(
                    (col) =>
                        col.trim().toLowerCase() ===
                        requiredColumn
                            .trim()
                            .toLowerCase()
                )
        );
        setMissingColumns(missing);
        const enrichedData = parsedData.map((row) => {
            const score = calculateRCAScore(row);
            const resolutionNotesKey = findColumn(
                row,
                ["Resolution notes"]
            );
            const resolutionSubcodeKey =
                findColumn(row, [
                    "Resolution subcode",
                ]);
            const serviceKey = findColumn(row, [
                "Service",
            ]);
            const impactedCompaniesKey =
                findColumn(row, [
                    "Impacted Companies List",
                ]);
            return {
                ...row,
                rcaScore: score,
                rcaBucket: getBucket(score),
                close_notes:
                    row?.[resolutionNotesKey] || "",
                resolution_type:
                    row?.[resolutionSubcodeKey] || "",
                root_cause_category:
                    row?.[resolutionSubcodeKey] || "",
                system_impacted: `${row?.[serviceKey] || ""} - ${
                    row?.[impactedCompaniesKey] || ""
                }`,
            };
        });
        setData(enrichedData);
        if (onFileUpload) {
            onFileUpload(enrichedData);
        }
    };
    // -----------------------------------------
    // Filters
    // -----------------------------------------
    const filteredOptionsData = useMemo(() => {
        return data.filter((item) => {
            const bucketMatch =
                filters.bucket === "All" ||
                item.rcaBucket === filters.bucket;
            const serviceMatch =
                filters.service === "All" ||
                item.system_impacted === filters.service;
            const serviceOfferingMatch =
                filters.serviceOffering === "All" ||
                item["Service offering"] ===
                filters.serviceOffering;
            const resolvedByMatch =
                filters.resolvedBy === "All" ||
                item["Resolved by"] ===
                filters.resolvedBy;
            const scoreMatch =
                filters.scoreRange === "All" ||
                (filters.scoreRange === "80+" &&
                    item.rcaScore >= 80) ||
                (filters.scoreRange === "50-79" &&
                    item.rcaScore >= 50 &&
                    item.rcaScore < 80) ||
                (filters.scoreRange === "20-49" &&
                    item.rcaScore >= 20 &&
                    item.rcaScore < 50) ||
                (filters.scoreRange === "0-19" &&
                    item.rcaScore < 20);
            return (
                bucketMatch &&
                serviceMatch &&
                serviceOfferingMatch &&
                resolvedByMatch &&
                scoreMatch
            );
        });
    }, [data, filters]);
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const bucketMatch =
                filters.bucket === "All" ||
                item.rcaBucket === filters.bucket;
            const serviceMatch =
                filters.service === "All" ||
                item.system_impacted ===
                filters.service;
            const serviceOfferingMatch =
                filters.serviceOffering === "All" ||
                item["Service offering"] ===
                filters.serviceOffering;
            const resolvedByMatch =
                filters.resolvedBy === "All" ||
                item["Resolved by"] ===
                filters.resolvedBy;
            const scoreMatch =
                filters.scoreRange === "All" ||
                (filters.scoreRange === "80+" &&
                    item.rcaScore >= 80) ||
                (filters.scoreRange === "50-79" &&
                    item.rcaScore >= 50 &&
                    item.rcaScore < 80) ||
                (filters.scoreRange === "20-49" &&
                    item.rcaScore >= 20 &&
                    item.rcaScore < 50) ||
                (filters.scoreRange === "0-19" &&
                    item.rcaScore < 20);
            const searchMatch =
                !filters.search ||
                JSON.stringify(item)
                    .toLowerCase()
                    .includes(
                        filters.search.toLowerCase()
                    );
            return (
                bucketMatch &&
                serviceMatch &&
                serviceOfferingMatch &&
                resolvedByMatch &&
                scoreMatch &&
                searchMatch
            );
        });
    }, [data, filters]);
    const isFileUploaded = !!data.length;
    // -----------------------------------------
    // Stats
    // -----------------------------------------
    const stats = {
        excellent: filteredData.filter(
            (d) => d.rcaBucket === "Excellent"
        ).length,
        good: filteredData.filter(
            (d) => d.rcaBucket === "Good"
        ).length,
        poor: filteredData.filter(
            (d) => d.rcaBucket === "Poor"
        ).length,
        critical: filteredData.filter(
            (d) => d.rcaBucket === "Critical"
        ).length,
    };
    const liveChecks = useMemo(() => {
        const notes =
            liveResolutionNotes.trim();
        const lowerNotes =
            notes.toLowerCase();
        const hasNotes =
            notes.length > 0;
        const over20 =
            notes.length > 20;
        const over50 =
            notes.length > 50;
        const hasCausalKeyword =
            CAUSAL_KEYWORDS.some((keyword) =>
                lowerNotes.includes(
                    keyword.toLowerCase()
                )
            );
        let score = 45;
        if (hasNotes) {
            score += 20;
        }
        if (over20) {
            score += 15;
        }
        if (over50) {
            score += 10;
        }
        if (hasCausalKeyword) {
            score += 10;
        }
        score = Math.min(score, 100);
        return {
            hasNotes,
            over20,
            over50,
            hasCausalKeyword,
            score,
        };
    }, [liveResolutionNotes]);
    const liveRCAScore =
        liveChecks.score;
    return (
        <div className="min-h-screen w-full bg-gray-700 text-gray-900 p-6 font-sans flex flex-col gap-6">
            {/* Main Title */}
            <div className="flex justify-center bg-gray-900 py-8">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-white to-blue-500 drop-shadow-lg animate-fade-in">
                    RCA Quality Dashboard
                </h1>
            </div>
            {/* RCA Live Score Analyzer */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl border-2 border-black-400">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Side */}
                    <div className="flex-shrink-0">
                        <FileUpload setData={handleFileUpload}/>
                    </div>
                    {/* Right Side */}
                    <div className="flex-1 w-full">
                        {/* Text Area */}
                        <textarea
                            rows={10}
                            placeholder="Type Resolution Notes here..."
                            className="w-full bg-gray-900 text-white p-4 rounded-xl border-2 border-black-400 focus:outline-none focus:ring-2 focus:ring-black-300 resize-y"
                            value={liveResolutionNotes}
                            onChange={(e) =>
                                setLiveResolutionNotes(
                                    e.target.value
                                )
                            }
                        />
                        {/* Score */}
                        <div className="mt-4">
                            <h2 className="text-2xl font-bold text-white">
                                Live RCA Score:
                                <span className="text-yellow-300 ml-2">
                        {liveRCAScore}/100
                    </span>
                            </h2>
                            <h4 className="text-1xl font-bold text-gray-400">
                                (Ensure Root cause category, resolution type, and system impacted are properly
                                selected in SNOW)
                            </h4>
                        </div>
                        {/* Conditions */}
                        <div className="mt-6 space-y-3">
                            {/* Condition 1 */}
                            <div
                                className={`p-3 rounded-lg font-semibold ${
                                    liveChecks.hasNotes
                                        ? "bg-green-700 text-white"
                                        : "bg-gray-700 text-gray-300"
                                }`}
                            >
                                +20 → Resolution notes entered
                            </div>
                            {/* Condition 2 */}
                            <div
                                className={`p-3 rounded-lg font-semibold ${
                                    liveChecks.over20
                                        ? "bg-green-700 text-white"
                                        : "bg-gray-700 text-gray-300"
                                }`}
                            >
                                +15 → More than 20 characters
                            </div>
                            {/* Condition 3 */}
                            <div
                                className={`p-3 rounded-lg font-semibold ${
                                    liveChecks.over50
                                        ? "bg-green-700 text-white"
                                        : "bg-gray-700 text-gray-300"
                                }`}
                            >
                                +10 → More than 50 characters
                            </div>
                            {/* Condition 4 */}
                            <div
                                className={`p-3 rounded-lg font-semibold ${
                                    liveChecks.hasCausalKeyword
                                        ? "bg-green-700 text-white"
                                        : "bg-gray-700 text-gray-300"
                                }`}
                            >
                                +10 → Contains causal phrase
                            </div>
                        </div>
                        {/* Causal Keywords */}
                        <div className="mt-8">
                            <h3 className="text-xl font-bold text-yellow-300 mb-3">
                                Supported Causal Phrases
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {CAUSAL_KEYWORDS.map((keyword) => {
                                    const isUsed =
                                        liveResolutionNotes
                                            .toLowerCase()
                                            .includes(
                                                keyword.toLowerCase()
                                            );
                                    return (
                                        <div
                                            key={keyword}
                                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                                                isUsed
                                                    ? "bg-green-600 text-white scale-105"
                                                    : "bg-gray-700 text-gray-300"
                                            }`}
                                        >
                                            {keyword}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Missing Columns */}
            {missingColumns.length > 0 && (
                <div className="bg-red-900 border border-red-500 text-red-100 p-4 rounded-xl">
                    <h2 className="font-bold text-lg mb-2">
                        Missing Required Columns
                    </h2>
                    <ul className="list-disc ml-6">
                        {missingColumns.map((column) => (
                            <li key={column}>
                                {column}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {/* Stats */}
            {isFileUploaded && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-green-700 rounded-xl p-6 shadow-lg text-white">
                        <h2 className="text-xl font-bold">
                            Excellent
                        </h2>
                        <p className="text-4xl font-extrabold">
                            {stats.excellent}
                        </p>
                    </div>
                    <div className="bg-blue-700 rounded-xl p-6 shadow-lg text-white">
                        <h2 className="text-xl font-bold">
                            Good
                        </h2>
                        <p className="text-4xl font-extrabold">
                            {stats.good}
                        </p>
                    </div>
                    <div className="bg-yellow-600 rounded-xl p-6 shadow-lg text-white">
                        <h2 className="text-xl font-bold">
                            Poor
                        </h2>
                        <p className="text-4xl font-extrabold">
                            {stats.poor}
                        </p>
                    </div>
                    <div className="bg-red-700 rounded-xl p-6 shadow-lg text-white">
                        <h2 className="text-xl font-bold">
                            Critical
                        </h2>
                        <p className="text-4xl font-extrabold">
                            {stats.critical}
                        </p>
                    </div>
                </div>
            )}
            {/* Filters */}
            {isFileUploaded && (
                <div className="my-4 flex flex-col gap-4 animate-fade-in-delay-2">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Bucket */}
                        <select
                            className="bg-gray-800 text-white p-3 rounded-lg"
                            value={filters.bucket}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    bucket:
                                    e.target.value,
                                })
                            }
                        >
                            <option value="All">
                                All Buckets
                            </option>
                            <option value="Excellent">
                                Excellent
                            </option>
                            <option value="Good">
                                Good
                            </option>
                            <option value="Poor">
                                Poor
                            </option>
                            <option value="Critical">
                                Critical
                            </option>
                        </select>
                        {/* Score Range */}
                        <select
                            className="bg-gray-800 text-white p-3 rounded-lg"
                            value={
                                filters.scoreRange
                            }
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    scoreRange:
                                    e.target.value,
                                })
                            }
                        >
                            <option value="All">
                                All Scores
                            </option>
                            <option value="80+">
                                80+
                            </option>
                            <option value="50-79">
                                50-79
                            </option>
                            <option value="20-49">
                                20-49
                            </option>
                            <option value="0-19">
                                0-19
                            </option>
                        </select>
                        {/* Service */}
                        <select
                            className="bg-gray-800 text-white p-3 rounded-lg"
                            value={filters.service}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    service:
                                    e.target.value,
                                })
                            }
                        >
                            <option value="All">
                                All Services
                            </option>
                            {[
                                ...new Set(
                                    filteredOptionsData.map(
                                        (d) =>
                                            d.system_impacted
                                    )
                                ),
                            ]
                                .filter(Boolean)
                                .map((service) => (
                                    <option
                                        key={
                                            service
                                        }
                                        value={
                                            service
                                        }
                                    >
                                        {service}
                                    </option>
                                ))}
                        </select>
                        {/* Service Offering */}
                        <select
                            className="bg-gray-800 text-white p-3 rounded-lg"
                            value={filters.serviceOffering}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    serviceOffering: e.target.value,
                                })
                            }
                        >
                            <option value="All">
                                All Service Offerings
                            </option>
                            {[
                                ...new Set(
                                    filteredOptionsData.map(
                                        (d) => d["Service offering"]
                                    )
                                ),
                            ]
                                .sort((a, b) => String(a).localeCompare(String(b)))
                                .map((serviceOffering) => (
                                    <option
                                        key={serviceOffering || "blank"}
                                        value={serviceOffering}
                                    >
                                        {serviceOffering || "(Blank Service Offering)"}
                                    </option>
                                ))}
                        </select>
                        {/* Resolved By */}
                        <select
                            className="bg-gray-800 text-white p-3 rounded-lg"
                            value={filters.resolvedBy}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    resolvedBy: e.target.value,
                                })
                            }
                        >
                            <option value="All">
                                All Resolved By
                            </option>
                            {[
                                ...new Set(
                                    filteredOptionsData.map(
                                        (d) => d["Resolved by"]
                                    )
                                ),
                            ]
                                .sort((a, b) =>
                                    String(a).localeCompare(String(b))
                                )
                                .map((resolvedBy) => (
                                    <option
                                        key={resolvedBy || "blank"}
                                        value={resolvedBy}
                                    >
                                        {resolvedBy ||
                                            "(Blank Resolved By)"}
                                    </option>
                                ))}
                        </select>
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search incidents..."
                            className="bg-gray-800 text-white p-3 rounded-lg"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    search:
                                    e.target.value,
                                })
                            }
                        />
                    </div>
                </div>
            )}
            {/* Charts */}
            {isFileUploaded && (
                <>
                    {/* RCA Bucket Distribution */}
                    <div id="categoryChartSection">
                        <CategoryChart
                            data={filteredData}
                            title="RCA Bucket Distribution"
                            dataKey="rcaBucket"
                        />
                    </div>
                    {/* Incidents by Market */}
                    <div id="marketChartSection">
                        <MarketChart
                            data={filteredData}
                            title="RCA Score Distribution"
                            dataKey="rcaScore"
                        />
                    </div>
                    {/* RCA Incident Details Table */}
                    <div
                        id="rcaIncidentDetailsSection"
                        className="bg-gray-800 rounded-xl p-6 shadow-lg"
                    >
                        <h2 className="text-2xl font-bold text-white mb-4">
                            RCA Incident Details
                        </h2>
                        <div className="overflow-x-auto">
                            <table
                                className="min-w-full bg-gray-900 text-white rounded-xl overflow-hidden border-2 border-amber-300 shadow-xl">
                                <thead className="bg-gray-700 text-left">
                                <tr>
                                    <th className="p-3">
                                        Number
                                    </th>
                                    <th className="p-3">
                                        Service Offering
                                    </th>
                                    <th className="p-3">
                                        Resolved By
                                    </th>
                                    <th className="p-3">
                                        Resolution Notes
                                    </th>
                                    <th className="p-3">
                                        Score
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredData.map(
                                    (
                                        incident,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                index
                                            }
                                            className={`border-b border-gray-700 ${
                                                incident.rcaBucket === "Excellent"
                                                    ? "bg-green-700 text-white"
                                                    : incident.rcaBucket === "Good"
                                                        ? "bg-blue-700 text-white"
                                                        : incident.rcaBucket === "Poor"
                                                            ? "bg-yellow-600 text-white"
                                                            : "bg-red-700 text-white"
                                            }`}
                                        >
                                            <td className="p-3">
                                                {
                                                    incident.Number
                                                }
                                            </td>
                                            <td className="p-3">
                                                {
                                                    incident[
                                                        "Service offering"
                                                        ]
                                                }
                                            </td>
                                            <td className="p-3">
                                                {
                                                    incident[
                                                        "Resolved by"
                                                        ]
                                                }
                                            </td>
                                            <td className="p-3 max-w-xl whitespace-pre-wrap break-words">
                                                {(() => {
                                                    const notes =
                                                        incident["Resolution notes"] || "";
                                                    const keywords = [
                                                        "because",
                                                        "root cause",
                                                        "due to",
                                                        "caused by",
                                                        "result of",
                                                        "fixed by",
                                                        "resolved by",
                                                        "the issue was",
                                                        "causa",
                                                        "solución",
                                                        "solucion",
                                                        "resuelto",
                                                        "se identificó",
                                                        "se identifico",
                                                    ];
                                                    let highlightedText = notes;
                                                    keywords.forEach((keyword) => {
                                                        const regex = new RegExp(
                                                            `(${keyword})`,
                                                            "gi"
                                                        );
                                                        highlightedText =
                                                            highlightedText.replace(
                                                                regex,
                                                                `<span class="text-yellow-300 font-extrabold">$1</span>`
                                                            );
                                                    });
                                                    return (
                                                        <span
                                                            dangerouslySetInnerHTML={{
                                                                __html: highlightedText,
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </td>
                                            <td className="p-3 font-bold text-xl">
                                                {
                                                    incident.rcaScore
                                                }
                                            </td>
                                        </tr>
                                    )
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Full RCA Incident Table */}
                    <div id="incidentTableSection">
                        <IncidentTable data={filteredData}/>
                    </div>
                </>
            )}
        </div>
    );
}