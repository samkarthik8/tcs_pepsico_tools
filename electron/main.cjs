const {app, BrowserWindow} = require("electron");
const path = require("path");

function createMainWindow() {
    const win = new BrowserWindow({
        autoHideMenuBar: true,
        icon: path.join(__dirname, "assets/pepsico.ico")
    });
    win.maximize();
    win.loadFile(
        path.join(__dirname, "../dist/index.html")
    );
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    // Splash Screen
    const splash = new BrowserWindow({
        width: 600,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        movable: false,
    });
    splash.loadFile(
        path.join(__dirname, "splash.html")
    );
    // Show splash for 2.5 seconds
    setTimeout(() => {
        splash.close();
        createMainWindow();
    }, 2500);
});