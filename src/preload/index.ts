import { contextBridge, ipcRenderer } from 'electron'

const api = {
  ping: () => ipcRenderer.invoke('app:ping'),

  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
  },

  terminal: {
    spawn: (shell: string, name?: string, cwd?: string) =>
      ipcRenderer.invoke('terminal:spawn', shell, name, cwd),
    list: () => ipcRenderer.invoke('terminal:list'),
    inject: (pid: number, text: string) =>
      ipcRenderer.invoke('terminal:inject', pid, text),
    kill: (pid: number) => ipcRenderer.invoke('terminal:kill', pid),
    focus: (pid: number) => ipcRenderer.invoke('terminal:focus', pid),
    rename: (pid: number, name: string) => ipcRenderer.invoke('terminal:rename', pid, name),
    toggleFavorite: (pid: number) => ipcRenderer.invoke('terminal:toggleFavorite', pid)
  },

  window: {
    getPosition: (pid: number) => ipcRenderer.invoke('window:getPosition', pid),
    setPosition: (pid: number, rect: any) =>
      ipcRenderer.invoke('window:setPosition', pid, rect),
    saveLayout: (name: string) => ipcRenderer.invoke('window:saveLayout', name),
    restoreLayout: (name: string) => ipcRenderer.invoke('window:restoreLayout', name),
    listLayouts: () => ipcRenderer.invoke('window:listLayouts'),
    deleteLayout: (name: string) => ipcRenderer.invoke('window:deleteLayout', name)
  },

  status: {
    startPolling: (intervalMs: number) =>
      ipcRenderer.invoke('status:startPolling', intervalMs),
    stopPolling: () => ipcRenderer.invoke('status:stopPolling'),
    analyze: (pid: number) => ipcRenderer.invoke('status:analyze', pid)
  },

  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config: any) => ipcRenderer.invoke('config:save', config),
    exportAll: () => ipcRenderer.invoke('config:exportAll'),
    importAll: (json: string) => ipcRenderer.invoke('config:importAll', json),
    getFavorites: () => ipcRenderer.invoke('config:getFavorites'),
    saveFavorites: (groups: any) => ipcRenderer.invoke('config:saveFavorites', groups),
    getFavoriteRecords: () => ipcRenderer.invoke('config:getFavoriteRecords'),
    saveFavoriteRecords: (favs: any) => ipcRenderer.invoke('config:saveFavoriteRecords', favs),
    getPrompts: () => ipcRenderer.invoke('config:getPrompts'),
    savePrompts: (prompts: any) => ipcRenderer.invoke('config:savePrompts', prompts)
  },

  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
}

contextBridge.exposeInMainWorld('api', api)
