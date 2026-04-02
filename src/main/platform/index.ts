import type { ShellType, WindowRect } from '../../shared/types'

export interface PlatformAdapter {
  spawnTerminal(shell: ShellType, cwd?: string): Promise<number>
  injectText(pid: number, text: string): Promise<void>
  focusWindow(pid: number): Promise<void>
  getWindowRect(pid: number): Promise<WindowRect>
  setWindowRect(pid: number, rect: WindowRect): Promise<void>
  captureScreenContent(pid: number): Promise<string>
  isProcessAlive(pid: number): boolean
  getResourceUsage(pid: number): Promise<{ cpu: number; memory: number }>
}

import { MacOSAdapter } from './macos'
import { WindowsAdapter } from './windows'
import { LinuxAdapter } from './linux'

export function createPlatformAdapter(): PlatformAdapter {
  switch (process.platform) {
    case 'darwin':
      return new MacOSAdapter()
    case 'win32':
      return new WindowsAdapter()
    default:
      return new LinuxAdapter()
  }
}
