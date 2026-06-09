const { app, BrowserWindow, shell, Menu, nativeTheme, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

const APP_URL = "https://noisium.app";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Noisium",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f13" : "#f6f6f7",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: "persist:noisium",
    },
  });

  mainWindow.loadURL(APP_URL);

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about", label: `O aplikaci ${app.name}` },
        { type: "separator" },
        { role: "services", label: "Služby" },
        { type: "separator" },
        { role: "hide", label: `Skrýt ${app.name}` },
        { role: "hideOthers", label: "Skrýt ostatní" },
        { role: "unhide", label: "Zobrazit vše" },
        { type: "separator" },
        { role: "quit", label: `Ukončit ${app.name}` },
      ],
    },
    {
      label: "Navigace",
      submenu: [
        {
          label: "Přehled",
          accelerator: "CmdOrCtrl+1",
          click: () => mainWindow?.loadURL(`${APP_URL}/dashboard`),
        },
        {
          label: "Úkoly",
          accelerator: "CmdOrCtrl+2",
          click: () => mainWindow?.loadURL(`${APP_URL}/tasks`),
        },
        {
          label: "Chat",
          accelerator: "CmdOrCtrl+3",
          click: () => mainWindow?.loadURL(`${APP_URL}/chat`),
        },
        {
          label: "Výkazy",
          accelerator: "CmdOrCtrl+4",
          click: () => mainWindow?.loadURL(`${APP_URL}/time`),
        },
        { type: "separator" },
        {
          label: "Nastavení",
          accelerator: "CmdOrCtrl+,",
          click: () => mainWindow?.loadURL(`${APP_URL}/settings`),
        },
      ],
    },
    {
      label: "Úpravy",
      submenu: [
        { role: "undo", label: "Zpět" },
        { role: "redo", label: "Znovu" },
        { type: "separator" },
        { role: "cut", label: "Vyjmout" },
        { role: "copy", label: "Kopírovat" },
        { role: "paste", label: "Vložit" },
        { role: "pasteAndMatchStyle", label: "Vložit a přizpůsobit styl" },
        { role: "delete", label: "Smazat" },
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
        {
          label: "Přejít zpět",
          accelerator: "CmdOrCtrl+Left",
          click: () => {
            if (mainWindow?.webContents.canGoBack()) mainWindow.webContents.goBack();
          },
        },
        {
          label: "Přejít vpřed",
          accelerator: "CmdOrCtrl+Right",
          click: () => {
            if (mainWindow?.webContents.canGoForward()) mainWindow.webContents.goForward();
          },
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
        { type: "separator" },
        { role: "front", label: "Přenést vše do popředí" },
        { type: "separator" },
        { role: "close", label: "Zavřít okno" },
      ],
    },
    {
      label: "Nápověda",
      submenu: [
        {
          label: "Otevřít v prohlížeči",
          click: () => shell.openExternal(APP_URL),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  autoUpdater.checkForUpdatesAndNotify();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

autoUpdater.on("update-downloaded", () => {
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
