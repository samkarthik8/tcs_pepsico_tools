export function processData(rows) {
    const today = new Date();

    return rows.map((row) => {
        let createdValue = row["Created"];

        if (!isNaN(createdValue)) {
            const excelEpoch = new Date(1900, 0, 1);
            createdValue = new Date(excelEpoch.getTime() + (createdValue - 2) * 86400000);
        } else if (typeof createdValue === "string" && !isNaN(Date.parse(createdValue))) {
            createdValue = new Date(createdValue);
        } else {
            createdValue = null;
        }

        const service = row["Service offering"] || "";
        const countryMatch = service.match(/\b[A-Z][A-Z\s]+$/i);
        const country = countryMatch ? countryMatch[0].trim() : "Unknown";

        const isAgingIncident = createdValue
            ? (today - createdValue) / (1000 * 60 * 60 * 24) > 15
            : false;

        return {
            ...row,
            Created: createdValue ? createdValue.toISOString().split("T")[0] : "Unknown",
            Market: country, // Use country as Market
            isAgingIncident,
        };
    });
}
