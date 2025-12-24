const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 480,
    webPreferences: {
      nodeIntegration: true, // สำคัญ: เปิดให้ใช้ Node.js ในหน้าเว็บได้ (ถ้าต้องการ)
      contextIsolation: false, // ถ้าจะใช้ require ในหน้าเว็บต้องปิดตัวนี้ (แต่ไม่แนะนำในระยะยาว)
      // หรือใช้ preload script เพื่อความปลอดภัย (แนะนำ)
    },
  })

  // เช็คว่ารันแบบไหน (Dev หรือ Prod)
  const isDev = !app.isPackaged;

  if (isDev) {
    // ถ้า Dev: ให้โหลดหน้าเว็บจาก localhost ที่ Next.js รันอยู่
    mainWindow.loadURL('http://localhost:3000')
    // เปิด DevTools (Console) ขึ้นมาด้วย
    mainWindow.webContents.openDevTools() 
  } else {
    // ถ้า Production (Build แล้ว): ให้โหลดไฟล์ HTML ที่ Build แล้ว
    // (ส่วนนี้ต้องตั้งค่า Next.js ให้ export เป็น static)
    mainWindow.loadFile(path.join(__dirname, 'out/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})