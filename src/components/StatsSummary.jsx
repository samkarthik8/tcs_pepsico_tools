import React from "react";
import dayjs from "dayjs";
import PptxGenJS from "pptxgenjs";
import html2canvas from "html2canvas";
import { BarChart3, Clock, Globe2, ListChecks, FileDown } from "lucide-react";

export default function StatsSummary({ data = [], isFileUploaded = false }) {
    if (!Array.isArray(data) || data.length === 0) {
        return (
            <div className="bg-gray-800 p-4 rounded-lg shadow-md text-gray-200 text-xl">
                Upload a file to see summary stats.
            </div>
        );
    }

    const today = dayjs();

    // === Summary Stats ===
    const totalIncidents = data.length;

    const oldIncidents = data.filter((d) => {
        const created = d.Created ? dayjs(d.Created) : null;
        return created && today.diff(created, "day") > 15;
    }).length;

    const openIncidents = data.filter(
        (d) => d.State && d.State.toLowerCase() !== "closed"
    );

    const uniqueMarkets = new Set(
        openIncidents.map((d) => (d.Market || "Unknown").trim().toUpperCase())
    ).size;

    const categoryCount = data.reduce((acc, d) => {
        const key = d.Category || "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const topCategory =
        Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "N/A";

    // === Helper: add full-image slide with aspect ratio preserved and centered ===
    const addFullImageSlide = async (pptx, title, imageData) => {
        const slide = pptx.addSlide();

        slide.addText(title, {
            x: 0.5,
            y: 0.3,
            fontSize: 28,
            color: "0033A0",
            bold: true,
        });

        const img = new Image();
        img.src = imageData;
        await new Promise((resolve) => (img.onload = resolve));

        const maxWidth = 9;    // max width in inches
        const maxHeight = 5.5; // leave room for title

        const widthRatio = maxWidth / img.width;
        const heightRatio = maxHeight / img.height;
        const scale = Math.min(widthRatio, heightRatio);

        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        const xPos = (10 - scaledWidth) / 2;
        const yPos = 1 + (maxHeight - scaledHeight) / 5;

        slide.addImage({
            data: imageData,
            x: xPos,
            y: yPos,
            w: scaledWidth,
            h: scaledHeight,
        });
    };

// === Helper: capture section as image, with optional top and bottom crop in percent ===
    const captureSection = async (id, cropTopPercent = 0, cropBottomPercent = 0) => {
        const el = document.getElementById(id);
        if (!el) return null;

        const canvas = await html2canvas(el, { scale: 2 });

        const cropTop = canvas.height * (cropTopPercent / 100);
        const cropBottom = canvas.height * (cropBottomPercent / 100);

        // If no cropping, return original
        if (cropTop === 0 && cropBottom === 0) return canvas.toDataURL("image/png");

        const croppedCanvas = document.createElement("canvas");
        const ctx = croppedCanvas.getContext("2d");

        const croppedHeight = canvas.height - cropTop - cropBottom;

        croppedCanvas.width = canvas.width;
        croppedCanvas.height = croppedHeight;

        ctx.drawImage(
            canvas,
            0,
            cropTop,                  // start drawing from cropTop
            canvas.width,
            croppedHeight,            // height to draw from original
            0,
            0,
            canvas.width,
            croppedHeight             // height of cropped canvas
        );

        return croppedCanvas.toDataURL("image/png");
    };


    // === Generate PPT ===
    const generatePPT = async () => {
        const pptx = new PptxGenJS();

        const pepsiBlue = "0033A0";
        const pepsiRed = "E41E26";
        const pepsiWhite = "FFFFFF";
        const pepsiGray = "F5F5F5";

        // Capture sections
        const marketImg = await captureSection("marketChartSection");
        const categoryImg = await captureSection("categoryChartSection");
        const mapImg = await captureSection("mapSection", 15,21); // crop ~12% bottom (Antarctica)

        // 1️⃣ Title slide
        const slide1 = pptx.addSlide();
        slide1.background = { fill: pepsiBlue };
        slide1.addText("Incident Report Dashboard", {
            x: 0.5,
            y: 2,
            fontSize: 36,
            bold: true,
            color: pepsiWhite,
        });
        slide1.addText(`Date: ${today.format("DD-MMM-YYYY")}`, {
            x: 0.5,
            y: 3,
            fontSize: 18,
            color: pepsiGray,
        });

        // 2️⃣ Stats Summary
        const slide2 = pptx.addSlide();
        slide2.addText("Key Stats Summary", {
            x: 0.5,
            y: 0.3,
            fontSize: 28,
            color: pepsiBlue,
            bold: true,
        });
        const stats = [
            ["Total Incidents", totalIncidents],
            ["Aging Incidents (>15d)", oldIncidents],
            ["Markets with Open Incidents", uniqueMarkets],
            ["Top Category", topCategory],
        ];
        slide2.addTable(stats, {
            x: 0.5,
            y: 1,
            colW: [4, 3],
            fontSize: 18,
            color: pepsiBlue,
            border: { pt: 1, color: pepsiBlue },
        });

        // 3️⃣ Market Chart
        if (marketImg) await addFullImageSlide(pptx, "Market Chart", marketImg);

        // 4️⃣ Category Chart
        if (categoryImg) await addFullImageSlide(pptx, "Category Chart", categoryImg);

// 5️⃣ Global Incident Map
        if (mapImg) {
            const slide = pptx.addSlide();

            // Slide title
            slide.addText("Global Incident Map", {
                x: 0.5,
                y: 0.3,
                fontSize: 28,
                color: "0033A0",
                bold: true,
            });

            // Load image to get dimensions
            const img = new Image();
            img.src = mapImg;
            await new Promise((resolve) => (img.onload = resolve));

            const maxWidth = 9;
            const maxHeight = 5.5;

            const widthRatio = maxWidth / img.width;
            const heightRatio = maxHeight / img.height;
            const scale = Math.min(widthRatio, heightRatio);

            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;

            const xPos = (10 - scaledWidth) / 2;
            const yPos = 0.8 + (maxHeight - scaledHeight) / 6; // reduced y offset to move higher

            slide.addImage({
                data: mapImg,
                x: xPos,
                y: yPos,
                w: scaledWidth,
                h: scaledHeight,
            });
        }


        // 6️⃣ Thank You slide
        const slide6 = pptx.addSlide();
        slide6.background = { fill: pepsiBlue };
        slide6.addText("Thank You", {
            x: 0,
            y: 2,
            w: "100%",
            align: "center",
            fontSize: 36,
            color: pepsiWhite,
            bold: true,
        });

        await pptx.writeFile({
            fileName: `Incident_Report_${today.format("YYYY-MM-DD")}.pptx`,
        });
    };


    // === Stat Card UI ===
    const card = (Icon, label, value, color) => (
        <div className="bg-gray-900 hover:bg-red-900 transition-all p-4 rounded-xl shadow-lg flex items-center gap-4">
            <div className={`p-3 rounded-full ${color} bg-opacity-20`}>
                <Icon className={`w-6 h-6 ${color.replace("text-", "stroke-")}`} />
            </div>
            <div>
                <p className="text-gray-400 text-sm">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative">
            {card(BarChart3, "Total Incidents", totalIncidents, "text-blue-400")}
            {card(Clock, "Aging Incidents (>15d)", oldIncidents, "text-yellow-400")}
            {card(Globe2, "Markets with Open Incidents", uniqueMarkets, "text-green-400")}
            {card(ListChecks, "Top Category", topCategory, "text-pink-400")}

            {/* Export as PPT Button */}
            {isFileUploaded && (
                <div className="col-span-2 md:col-span-4 flex justify-end">
                    <button
                        onClick={generatePPT}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md"
                    >
                        <FileDown className="w-5 h-5" /> Export as PPT
                    </button>
                </div>
            )}
        </div>
    );
}
