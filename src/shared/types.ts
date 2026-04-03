export type ShellType = 'bash' | 'zsh' | 'cmd' | 'pwsh' | 'wsl'

export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

export interface UnitStatus {
  waitingForInput: boolean
  hasErrors: boolean
  lastCommand: string
  cpu: number
  memory: number
  state: 'working' | 'waiting' | 'idle' | 'error'
  lastUpdated: number
}

export interface Unit {
  pid: number
  name: string
  shell: ShellType
  cwd: string
  status: UnitStatus
  isFavorite: boolean
  createdAt: number
}

export interface Layout {
  name: string
  positions: Array<{
    unitName: string
    shell: ShellType
    cwd: string
    rect: WindowRect
  }>
  createdAt: number
}

export interface Favorite {
  id: string
  name: string
  shell: ShellType
  cwd: string
}

export interface FavoriteGroup {
  id: string
  name: string
  favoriteIds: string[]
}

export interface Prompt {
  id: string
  name: string
  text: string
}

export interface AppConfig {
  defaultShell: ShellType
  pollingIntervalMs: number
  theme: 'dark'
}

export interface BuffetAPI {
  terminal: {
    spawn(shell: ShellType, name?: string, cwd?: string): Promise<Unit>
    list(): Promise<Unit[]>
    inject(pid: number, text: string): Promise<void>
    kill(pid: number): Promise<void>
    focus(pid: number): Promise<void>
  }
  window: {
    getPosition(pid: number): Promise<WindowRect>
    setPosition(pid: number, rect: WindowRect): Promise<void>
    saveLayout(name: string): Promise<Layout>
    restoreLayout(name: string): Promise<void>
    listLayouts(): Promise<Layout[]>
    deleteLayout(name: string): Promise<void>
  }
  status: {
    startPolling(intervalMs: number): Promise<void>
    stopPolling(): Promise<void>
    analyze(pid: number): Promise<UnitStatus>
  }
  config: {
    load(): Promise<AppConfig>
    save(config: AppConfig): Promise<void>
    exportAll(): Promise<string>
    importAll(json: string): Promise<void>
    getFavorites(): Promise<FavoriteGroup[]>
    saveFavorites(groups: FavoriteGroup[]): Promise<void>
  }
  on(channel: string, callback: (...args: any[]) => void): void
  off(channel: string, callback: (...args: any[]) => void): void
}
