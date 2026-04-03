import { execFile } from 'child_process'
import { promisify } from 'util'
import type { ShellType, WindowRect } from '../../shared/types'
import type { PlatformAdapter } from './index'

const exec = promisify(execFile)

function osascript(...lines: string[]): Promise<{ stdout: string; stderr: string }> {
  const args: string[] = []
  for (const line of lines) {
    args.push('-e', line)
  }
  return exec('osascript', args)
}

const SHELL_COMMANDS: Record<ShellType, string> = {
  bash: '/bin/bash',
  zsh: '/bin/zsh',
  cmd: '', // not supported on macOS
  pwsh: 'pwsh',
  wsl: '' // not supported on macOS
}

export class MacOSAdapter implements PlatformAdapter {
  private pidWindowIdMap = new Map<number, number>()

  private windowRef(pid: number): string {
    const wid = this.pidWindowIdMap.get(pid)
    return wid ? `window id ${wid}` : 'front window'
  }

  async spawnTerminal(shell: ShellType, cwd?: string, name?: string): Promise<number> {
    const shellCmd = SHELL_COMMANDS[shell]
    if (!shellCmd) {
      throw new Error(`Shell "${shell}" is not supported on macOS`)
    }

    const cdPrefix = cwd ? `cd ${JSON.stringify(cwd)} && ` : ''
    const script = `${cdPrefix}${shellCmd}`
    const title = name || shell

    // Snapshot existing PIDs before spawning
    let beforePids = new Set<number>()
    try {
      const { stdout: pgrepOut } = await exec('pgrep', [shell])
      beforePids = new Set(pgrepOut.trim().split(/\s+/).filter(Boolean).map(Number))
    } catch {
      // pgrep returns exit code 1 when no processes found
    }

    const { stdout: windowIdOut } = await osascript(
      'tell application "Terminal"',
      '  activate',
      `  set newTab to do script "${script.replace(/"/g, '\\"')}"`,
      `  set custom title of tab 1 of window 1 to "${title.replace(/"/g, '\\"')}"`,
      '  return id of window 1',
      'end tell'
    )
    const windowId = parseInt(windowIdOut.trim(), 10)

    // Poll for a new shell PID that wasn't in the before-snapshot (up to 3s)
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 500))
      try {
        const { stdout: pgrepOut } = await exec('pgrep', [shell])
        const currentPids = pgrepOut.trim().split(/\s+/).filter(Boolean).map(Number)
        const newPid = currentPids.find((p) => !beforePids.has(p))
        if (newPid) {
          if (!isNaN(windowId)) this.pidWindowIdMap.set(newPid, windowId)
          return newPid
        }
      } catch {
        // No processes yet, keep polling
      }
    }
    throw new Error(`Timed out waiting for ${shell} process to start`)
  }

  async injectText(pid: number, text: string): Promise<void> {
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const winRef = this.windowRef(pid)
    await osascript(
      'tell application "Terminal"',
      '  activate',
      `  do script "${escaped}" in ${winRef}`,
      'end tell'
    )
  }

  async focusWindow(pid: number): Promise<void> {
    const winRef = this.windowRef(pid)
    await osascript(
      'tell application "Terminal"',
      `  set index of ${winRef} to 1`,
      '  activate',
      'end tell'
    )
  }

  async getWindowRect(pid: number): Promise<WindowRect> {
    const winRef = this.windowRef(pid)
    const { stdout } = await osascript(
      'tell application "Terminal"',
      `  set b to bounds of ${winRef}`,
      '  return (item 1 of b) & "," & (item 2 of b) & "," & (item 3 of b) & "," & (item 4 of b)',
      'end tell'
    )
    const [x, y, x2, y2] = stdout.trim().split(',').map(Number)
    return { x, y, width: x2 - x, height: y2 - y }
  }

  async setWindowRect(pid: number, rect: WindowRect): Promise<void> {
    const { x, y, width, height } = rect
    const winRef = this.windowRef(pid)
    await osascript(
      'tell application "Terminal"',
      `  set bounds of ${winRef} to {${x}, ${y}, ${x + width}, ${y + height}}`,
      'end tell'
    )
  }

  async captureScreenContent(pid: number): Promise<string> {
    const winRef = this.windowRef(pid)
    try {
      const { stdout } = await osascript(
        'tell application "Terminal"',
        `  set windowContent to contents of ${winRef}`,
        '  return windowContent',
        'end tell'
      )
      return stdout.trim()
    } catch {
      return ''
    }
  }

  async killProcess(pid: number): Promise<void> {
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      try { process.kill(pid, 'SIGKILL') } catch { /* already dead */ }
    }
    this.pidWindowIdMap.delete(pid)
  }

  isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  async getResourceUsage(pid: number): Promise<{ cpu: number; memory: number }> {
    try {
      const { stdout } = await exec('ps', ['-p', String(pid), '-o', '%cpu,rss', '--no-header'])
      const parts = stdout.trim().split(/\s+/)
      return {
        cpu: parseFloat(parts[0]) || 0,
        memory: Math.round((parseInt(parts[1], 10) || 0) / 1024) // KB to MB
      }
    } catch {
      return { cpu: 0, memory: 0 }
    }
  }
}
