const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 900,
        autoHideMenuBar: true
    });

    const filePath = path.join(__dirname, "../dist/index.html");

    console.log("Loading:", filePath);

    win.loadFile(filePath);

    // win.webContents.openDevTools();

    win.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        console.log("LOAD FAILED:", errorCode, errorDescription);
    });
}

app.whenReady().then(createWindow);