const { app, BrowserWindow, shell, Menu, nativeTheme } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

const APP_URL = "https://noisium.app";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Noisium",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f13" : "#f6f6f7",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Allow the web app to use localStorage, service workers, etc.
      partition: "persist:noisium",
    },
    // macOS: use native traffic lights
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 16, y: 18 },
  });

  mainWindow.loadURL(APP_URL);

  // Open external links in the default browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Úpravy",
      submenu: [
        { role: "undo", label: "Zpět" },
        { role: "redo", label: "Znovu" },
        { type: "separator" },
        { role: "cut", label: "Vyjmout" },
        { role: "copy", label: "Kopírovat" },
        { role: "paste", label: "Vložit" },
        { role: "selectAll", label: "Vybrat vše" },
      ],
    },
    {
      label: "Zobrazení",
      submenu: [
        {
          label: "Znovu načíst",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.webContents.reload(),
        },
        { type: "separator" },
        { role: "resetZoom", label: "Původní velikost" },
        { role: "zoomIn", label: "Přiblížit" },
        { role: "zoomOut", label: "Oddálit" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Celá obrazovka" },
      ],
    },
    {
      label: "Okno",
      submenu: [
        { role: "minimize", label: "Minimalizovat" },
        { role: "zoom", label: "Maximalizovat" },
        ...(process.platform === "darwin"
          ? [{ type: "separator" }, { role: "front" }]
          : [{ role: "close", label: "Zavřít" }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();

  // Check for Electron shell updates silently on startup
  autoUpdater.checkForUpdatesAndNotify();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Auto-updater events — notify user only when update is ready to install
autoUpdater.on("update-downloaded", () => {
  const { dialog } = require("electron");
  dialog
    .showMessageBox({
      type: "info",
      title: "Aktualizace připravena",
      message: "Nová verze Noisium je připravena k instalaci.",
      buttons: ["Restartovat a nainstalovat", "Později"],
      defaultId: 0,
    })
    .then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
});
