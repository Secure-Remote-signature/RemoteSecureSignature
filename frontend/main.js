const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 480,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  const isDev = !app.isPackaged;

  if (isDev) {
    // ถ้า Dev: ให้โหลดหน้าเวบจาก localhost ที่ Next.js รันอยู่
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools() 
  } else {
    mainWindow.loadFile(path.join(__dirname, 'out/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})