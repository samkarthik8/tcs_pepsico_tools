import React, {useEffect, useState} from "react";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronLeft, ChevronRight} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";

export default function ExcelFolderSearch() {
    const [filesData, setFilesData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [direction, setDirection] = useState(0);
    const RESULTS_PER_PAGE = 20;

    useEffect(() => {
        window.scrollTo({top: 0, behavior: "smooth"});
    }, [currentPage]);

    const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const highlightText = (text, term) => {
        if (!term.trim() || !text) return String(text);
        const escapedTerm = escapeRegExp(term);
        const regex = new RegExp(escapedTerm, 'gi');
        const parts = [];
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            parts.push(text.slice(lastIndex, match.index));
            parts.push(`<mark class="bg-orange-400 text-black font-bold px-1 rounded">${match[0]}</mark>`);
            lastIndex = match.index + match[0].length;
        }
        parts.push(text.slice(lastIndex));
        return parts.join('');
    };

    // Handle folder selection and parsing all XLSX files
    const handleFolderSelect = async (e) => {
        const files = Array.from(e.target.files).filter((f) =>
            f.name.match(/\.(xlsx|docx)$/i)
        );
        if (!files.length) {
            alert("No supported files (.xlsx or .docx) found in the selected folder.");
            return;
        }
        setLoading(true);
        setProgress(0);
        const parsedFiles = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split(".").pop().toLowerCase();
            const subfolderPath = file.webkitRelativePath
                ? file.webkitRelativePath.substring(
                    0,
                    file.webkitRelativePath.lastIndexOf("/")
                )
                : "";
            try {
                if (ext === "xlsx") {
                    const data = await file.arrayBuffer();
                    const workbook = XLSX.read(data, {type: "array"});
                    // Process all sheets in workbook
                    const allRows = [];
                    workbook.SheetNames.forEach((sheetName) => {
                        const sheet = workbook.Sheets[sheetName];
                        const json = XLSX.utils.sheet_to_json(sheet, {header: 1});
                        if (json.length > 0) {
                            const headers = json[0];
                            const rows = json.slice(1).map((r, index) => {
                                const obj = {Sheet: sheetName, RowNumber: index + 2};
                                headers.forEach((h, j) => {
                                    obj[h || `Column ${j + 1}`] = r[j] ?? "";
                                });
                                return obj;
                            });
                            allRows.push(...rows);
                        }
                    });
                    parsedFiles.push({
                        type: "excel",
                        fileName: file.name,
                        subfolder: subfolderPath,
                        url: URL.createObjectURL(file),
                        rows: allRows,
                    });
                } else if (ext === "docx") {
                    const arrayBuffer = await file.arrayBuffer();
                    const {value} = await mammoth.extractRawText({arrayBuffer});
                    const lines = value.split("\n").map((line, i) => ({
                        lineNumber: i + 1,
                        text: line.trim(),
                    }));
                    parsedFiles.push({
                        type: "word",
                        fileName: file.name,
                        subfolder: subfolderPath,
                        url: URL.createObjectURL(file),
                        lines,
                    });
                }
            } catch (err) {
                console.error("Error reading file:", file.name, err);
            }
            // Update progress
            setProgress(Math.round(((i + 1) / files.length) * 100));
            await new Promise((resolve) => setTimeout(resolve, 15));
        }
        setFilesData(parsedFiles);
        setSearchResults([]);
        setSearchTerm("");
        setLoading(false);
    };

    // Search logic (case-insensitive)
    const handleSearch = (term) => {
        setSearchTerm(term);
        setCurrentPage(1);
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }
        const lowerTerm = term.toLowerCase();
        const matches = [];
        for (const file of filesData) {
            if (file.type === "excel") {
                for (const row of file.rows) {
                    for (const [header, value] of Object.entries(row)) {
                        if (String(value).toLowerCase().includes(lowerTerm)) {
                            matches.push({
                                ...file,
                                header,
                                value,
                                rowData: row,
                            });
                            break; // move to next row
                        }
                    }
                }
            } else if (file.type === "word") {
                for (const line of file.lines) {
                    if (line.text.toLowerCase().includes(lowerTerm)) {
                        matches.push({
                            ...file,
                            lineNumber: line.lineNumber,
                            lineText: line.text,
                        });
                    }
                }
            }
        }
        setSearchResults(matches);
    };

    // Pagination logic
    const totalPages = Math.ceil(searchResults.length / RESULTS_PER_PAGE);
    const paginatedResults = searchResults.slice(
        (currentPage - 1) * RESULTS_PER_PAGE,
        currentPage * RESULTS_PER_PAGE
    );
    const nextPage = () => {
        if (currentPage < totalPages) {
            setDirection(1);
            setCurrentPage((p) => p + 1);
        }
    };
    const prevPage = () => {
        if (currentPage > 1) {
            setDirection(-1);
            setCurrentPage((p) => p - 1);
        }
    };

    const variants = {
        enter: (dir) => ({
            x: dir > 0 ? 80 : -80,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: {duration: 0.4, ease: "easeInOut"},
        },
        exit: (dir) => ({
            x: dir < 0 ? 80 : -80,
            opacity: 0,
            transition: {duration: 0.4, ease: "easeInOut"},
        }),
    };

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-b from-blue-900 via-blue-950 to-blue-900 text-gray-100 p-8 font-sans flex flex-col items-center">
            {/* Header */}
            <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
                <img src={pepsicoLogo} alt="Pepsico Logo" className="h-16"/>
                <h1 className="text-4xl font-extrabold text-white tracking-wide">
                    PepsiCo Excel Search
                </h1>
            </div>
            {/* Folder Upload */}
            {!loading && (
                <div className="flex justify-center mb-8">
                    <label
                        className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg cursor-pointer text-white font-semibold shadow-lg transition-transform transform hover:scale-105">
                        📁 Select Folder
                        <input
                            type="file"
                            webkitdirectory="true"
                            multiple
                            accept=".xlsx,.docx"
                            onChange={handleFolderSelect}
                            className="hidden"
                        />
                    </label>
                </div>
            )}
            {/* Progress Bar */}
            {loading && (
                <div className="flex flex-col items-center justify-center h-64 w-full max-w-lg mx-auto">
                    <p className="text-lg text-blue-300 font-semibold mb-4">
                        Scanning Excel files... ({progress}%)
                    </p>
                    <div className="w-full bg-gray-800 rounded-full h-4">
                        <div
                            className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-in-out"
                            style={{width: `${progress}%`}}
                        ></div>
                    </div>
                </div>
            )}
            {/* Search Bar */}
            {!loading && filesData.length > 0 && (
                <div className="flex justify-center mb-6 w-full">
                    <input
                        type="text"
                        placeholder="Search term..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-2/3 md:w-1/2 p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
                    />
                </div>
            )}
            {/* Results */}
            {!loading && searchTerm && (
                <>
                    <div className="relative w-full max-w-6xl min-h-[400px]">
                        <AnimatePresence custom={direction} mode="wait">
                            <motion.div
                                key={currentPage}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
                            >
                                {paginatedResults.length === 0 ? (
                                    <p className="text-center text-red-400 col-span-2">
                                        No matches found.
                                    </p>
                                ) : (
                                    paginatedResults.map((result, index) => (
                                        <div
                                            key={index}
                                            className="border border-gray-700 rounded-lg p-4 bg-gray-800 shadow-lg animate-fade-in"
                                        >
                                            <h2 className={`text-lg font-semibold mb-1 ${
                                                result.type === "excel"
                                                    ? "text-blue-400"
                                                    : "text-green-400"
                                            }`}>
                                                <a
                                                    href={result.url}
                                                    download={result.fileName}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    {result.type === "excel" ? "📊" : "📄"} {result.fileName}
                                                </a>
                                            </h2>
                                            {result.subfolder && (
                                                <p className="text-sm text-gray-400 mb-1">
                                                    <strong>Subfolder:</strong> {result.subfolder}
                                                </p>
                                            )}
                                            {result.type === "excel" ? (
                                                <>
                                                    <p className="text-sm text-gray-300 mb-2">
                                                        <strong>Sheet:</strong>{" "}
                                                        {result.rowData.Sheet} <br/>
                                                        <strong>Row Number:</strong>{" "}
                                                        {result.rowData.RowNumber}
                                                    </p>
                                                    <p className="mb-2 text-sm text-gray-300">
                                                        <strong>Column:</strong> {result.header}
                                                        <br/>
                                                        <strong>Matched Value:</strong>{" "}
                                                        <span
                                                            dangerouslySetInnerHTML={{__html: highlightText(String(result.value), searchTerm)}}/>
                                                    </p>
                                                    <div className="mt-3 text-sm">
                                                        <h3 className="font-semibold text-gray-200 mb-1">
                                                            Entire Row:
                                                        </h3>
                                                        <div
                                                            className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                            {Object.entries(result.rowData).map(
                                                                ([key, val], i) => (
                                                                    <p key={i}>
                                                                        <strong>{key}:</strong>{" "}
                                                                        <span
                                                                            dangerouslySetInnerHTML={{__html: highlightText(String(val), searchTerm)}}/>
                                                                    </p>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-gray-300">
                                                        <strong>Line:</strong>{" "}
                                                        {result.lineNumber}
                                                    </p>
                                                    <p className="text-gray-200 mt-2">
                                                        <span className="italic"
                                                              dangerouslySetInnerHTML={{__html: `"${highlightText(result.lineText, searchTerm)}"`}}/>
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                    {/* Pagination Controls */}
                    {paginatedResults.length > 0 && (
                        <div className="flex justify-center items-center gap-6 mt-10">
                            <button
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-all duration-300 ${
                                    currentPage === 1
                                        ? "bg-gray-600 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                                }`}
                            >
                                <ChevronLeft size={20}/>
                                Prev
                            </button>
                            <span className="text-gray-300 font-semibold">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-all duration-300 ${
                                    currentPage === totalPages
                                        ? "bg-gray-600 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                                }`}
                            >
                                Next
                                <ChevronRight size={20}/>
                            </button>
                        </div>
                    )}
                </>
            )}
            {/* No files selected */}
            {!loading && filesData.length === 0 && (
                <p className="text-center text-gray-400 mt-6">
                    Please select a folder containing .xlsx files to begin.
                </p>
            )}
        </div>
    );
}