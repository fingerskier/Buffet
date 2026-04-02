import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import type { TerminalService } from './services/terminal'
import type { StatusService } from './services/status'
import type { WindowService } from './services/window'
import type { ConfigService } from './services/config'

interface Services {
  terminal: TerminalService
  status: StatusService
  window: WindowService
  config: ConfigService
}

export function registerIpcHandlers(services: Services): void {
  const { terminal, status, window: windowService, config } = services

  // App
  ipcMain.handle('app:ping', () => ({ ok: true, platform: process.platform }))

  // Terminal
  ipcMain.handle('terminal:spawn', (_e, shell, name?, cwd?) =>
    terminal.spawn(shell, name, cwd)
  )
  ipcMain.handle('terminal:list', () => terminal.list())
  ipcMain.handle('terminal:inject', (_e, pid, text) => terminal.inject(pid, text))
  ipcMain.handle('terminal:kill', (_e, pid) => terminal.kill(pid))
  ipcMain.handle('terminal:focus', (_e, pid) => terminal.focus(pid))
  ipcMain.handle('terminal:toggleFavorite', (_e, pid) => terminal.toggleFavorite(pid))

  // Status
  ipcMain.handle('status:startPolling', (_e, intervalMs) => {
    status.startPolling(intervalMs)
  })
  ipcMain.handle('status:stopPolling', () => {
    status.stopPolling()
  })
  ipcMain.handle('status:analyze', (_e, pid) => status.analyzeUnit(pid))

  // Window / Layouts
  ipcMain.handle('window:getPosition', (_e, pid) => windowService.getPosition(pid))
  ipcMain.handle('window:setPosition', (_e, pid, rect) =>
    windowService.setPosition(pid, rect)
  )
  ipcMain.handle('window:saveLayout', (_e, name) => windowService.saveLayout(name))
  ipcMain.handle('window:restoreLayout', (_e, name) => windowService.restoreLayout(name))
  ipcMain.handle('window:listLayouts', () => windowService.listLayouts())
  ipcMain.handle('window:deleteLayout', (_e, name) => windowService.deleteLayout(name))

  // Config
  ipcMain.handle('config:load', () => config.load())
  ipcMain.handle('config:save', (_e, cfg) => config.save(cfg))
  ipcMain.handle('config:getFavorites', () => config.getFavorites())
  ipcMain.handle('config:saveFavorites', (_e, groups) => config.saveFavorites(groups))

  ipcMain.handle('config:exportAll', async () => {
    const json = config.exportAll()
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const { filePath } = await dialog.showSaveDialog(win, {
      defaultPath: 'buffet-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (filePath) {
      writeFileSync(filePath, json, 'utf-8')
      return filePath
    }
    return null
  })

  ipcMain.handle('config:importAll', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false
    const { filePaths } = await dialog.showOpenDialog(win, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (filePaths.length > 0) {
      const json = readFileSync(filePaths[0], 'utf-8')
      config.importAll(json)
      return true
    }
    return false
  })
}
