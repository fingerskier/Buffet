import type { ShellType, WindowRect } from '../../shared/types'
import type { PlatformAdapter } from './index'

export class LinuxAdapter implements PlatformAdapter {
  async spawnTerminal(_shell: ShellType, _cwd?: string, _name?: string): Promise<number> {
    throw new Error('Linux support not yet implemented')
  }

  async injectText(_pid: number, _text: string): Promise<void> {
    throw new Error('Linux support not yet implemented')
  }

  async focusWindow(_pid: number): Promise<void> {
    throw new Error('Linux support not yet implemented')
  }

  async getWindowRect(_pid: number): Promise<WindowRect> {
    throw new Error('Linux support not yet implemented')
  }

  async setWindowRect(_pid: number, _rect: WindowRect): Promise<void> {
    throw new Error('Linux support not yet implemented')
  }

  async captureScreenContent(_pid: number): Promise<string> {
    throw new Error('Linux support not yet implemented')
  }

  async killProcess(pid: number): Promise<void> {
    try { process.kill(-pid, 'SIGTERM') } catch {
      try { process.kill(pid, 'SIGKILL') } catch { /* already dead */ }
    }
  }

  isProcessAlive(_pid: number): boolean {
    return false
  }

  async getResourceUsage(_pid: number): Promise<{ cpu: number; memory: number }> {
    throw new Error('Linux support not yet implemented')
  }
}
