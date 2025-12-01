import React from "react";
import * as XLSX from "xlsx";

export default function FileUpload({ setData }) {
    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const workbook = XLSX.read(bstr, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            setData(jsonData);
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="my-4">
            <label className="bg-purple-600 hover:bg-purple-500 text-white text-xl px-4 py-2 rounded cursor-pointer transition-all">
                Upload Excel
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFile}
                />
            </label>
        </div>
    );
}
