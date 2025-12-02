import CryptoJS from "crypto-js";

// Constants
const KEY_STR = "7563424859574547"; // 16 bytes
const KEY = CryptoJS.enc.Utf8.parse(KEY_STR);
const IV_LEN = 16;
const HMAC_LEN = 32;

// Converts Base64 string to Uint8Array
export function base64ToUint8Array(base64Str) {
    if (typeof base64Str !== "string") return null;
    let s = base64Str.trim().replace(/["'\n\r]/g, "");
    const missing = s.length % 4;
    if (missing) s += "=".repeat(4 - missing);
    try {
        const binary = atob(s);
        const len = binary.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
        return arr;
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        return null;
    }
}

// Converts Uint8Array to CryptoJS WordArray
function wordArrayFromU8(u8arr) {
    return CryptoJS.lib.WordArray.create(u8arr);
}

// Compute HMAC-SHA256
function computeHmacSha256WordArray(cipherWA) {
    return CryptoJS.HmacSHA256(cipherWA, KEY);
}

// AES-CBC-PKCS7 decryption
function aesCbcPkcs7Decrypt(cipherBytes, ivBytes) {
    const ciphertextWA = wordArrayFromU8(cipherBytes);
    const ivWA = wordArrayFromU8(ivBytes);
    try {
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertextWA },
            KEY,
            { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );
        const plain = decrypted.toString(CryptoJS.enc.Utf8);
        return plain || "[Decryption produced empty string]";
    } catch (e) {
        return `[Decryption failed: ${e?.message || e}]`;
    }
}

// Main decrypt function
export function decryptVoucher(ciphertextB64) {
    try {
        if (!ciphertextB64?.trim()) return "[Empty Code]";
        const bytes = base64ToUint8Array(String(ciphertextB64));
        if (!bytes) return "[Base64 decode failed]";
        if (bytes.length <= IV_LEN + HMAC_LEN) return "[Ciphertext too short]";

        const iv = bytes.slice(0, IV_LEN);
        const hmacReceived = bytes.slice(IV_LEN, IV_LEN + HMAC_LEN);
        const cipherBytes = bytes.slice(IV_LEN + HMAC_LEN);

        const cipherWAforHmac = wordArrayFromU8(cipherBytes);
        const hmacCalcWA = computeHmacSha256WordArray(cipherWAforHmac);

        const hmacCalcHex = hmacCalcWA.toString(CryptoJS.enc.Hex);
        const hexToU8 = (hex) => {
            const arr = new Uint8Array(hex.length / 2);
            for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
            return arr;
        };
        const hmacCalcBytes = hexToU8(hmacCalcHex);

        if (hmacCalcBytes.length !== hmacReceived.length) return "[HMAC verification failed]";
        for (let i = 0; i < hmacReceived.length; i++) {
            if (hmacReceived[i] !== hmacCalcBytes[i]) return "[HMAC verification failed]";
        }

        return aesCbcPkcs7Decrypt(cipherBytes, iv);
    } catch (e) {
        return `[Decryption failed: ${e?.message || e}]`;
    }
}
