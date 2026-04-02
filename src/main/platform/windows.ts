import type { ShellType, WindowRect } from '../../shared/types'
import type { PlatformAdapter } from './index'

export class WindowsAdapter implements PlatformAdapter {
  async spawnTerminal(_shell: ShellType, _cwd?: string): Promise<number> {
    throw new Error('Windows support not yet implemented')
  }

  async injectText(_pid: number, _text: string): Promise<void> {
    throw new Error('Windows support not yet implemented')
  }

  async focusWindow(_pid: number): Promise<void> {
    throw new Error('Windows support not yet implemented')
  }

  async getWindowRect(_pid: number): Promise<WindowRect> {
    throw new Error('Windows support not yet implemented')
  }

  async setWindowRect(_pid: number, _rect: WindowRect): Promise<void> {
    throw new Error('Windows support not yet implemented')
  }

  async captureScreenContent(_pid: number): Promise<string> {
    throw new Error('Windows support not yet implemented')
  }

  isProcessAlive(_pid: number): boolean {
    return false
  }

  async getResourceUsage(_pid: number): Promise<{ cpu: number; memory: number }> {
    throw new Error('Windows support not yet implemented')
  }
}
