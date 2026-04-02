import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { ConfigService } from './services/config'
import { TerminalService } from './services/terminal'
import { StatusService } from './services/status'
import { WindowService } from './services/window'
import { createPlatformAdapter } from './platform/index'

let mainWindow: BrowserWindow | null = null

const platform = createPlatformAdapter()
const configService = new ConfigService()
const terminalService = new TerminalService(platform)
const statusService = new StatusService(platform, terminalService)
const windowService = new WindowService(platform, terminalService, configService)

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Buffet',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  statusService.setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Start polling with configured interval
  const config = configService.load()
  statusService.startPolling(config.pollingIntervalMs)
}

app.whenReady().then(() => {
  registerIpcHandlers({
    terminal: terminalService,
    status: statusService,
    window: windowService,
    config: configService
  })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  statusService.destroy()
  terminalService.destroy()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow }
