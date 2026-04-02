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
  async spawnTerminal(shell: ShellType, cwd?: string): Promise<number> {
    const shellCmd = SHELL_COMMANDS[shell]
    if (!shellCmd) {
      throw new Error(`Shell "${shell}" is not supported on macOS`)
    }

    const cdPrefix = cwd ? `cd ${JSON.stringify(cwd)} && ` : ''
    const script = `${cdPrefix}${shellCmd}`

    const { stdout } = await osascript(
      'tell application "Terminal"',
      '  activate',
      `  set newTab to do script "${script.replace(/"/g, '\\"')}"`,
      '  return id of window 1',
      'end tell'
    )

    // Get the PID of the shell process in the new tab
    const { stdout: pidOut } = await osascript(
      'tell application "Terminal"',
      '  set procs to processes of window 1',
      '  return item 1 of procs',
      'end tell'
    )

    // Fallback: use lsof to find the newest shell process
    try {
      const { stdout: lsofOut } = await exec('pgrep', ['-n', shell])
      return parseInt(lsofOut.trim(), 10)
    } catch {
      // If pgrep fails, return a placeholder from the window ID
      return parseInt(stdout.trim(), 10) || Date.now()
    }
  }

  async injectText(pid: number, text: string): Promise<void> {
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    await osascript(
      'tell application "Terminal"',
      '  activate',
      `  do script "${escaped}" in front window`,
      'end tell'
    )
  }

  async focusWindow(_pid: number): Promise<void> {
    await osascript(
      'tell application "Terminal"',
      '  activate',
      'end tell'
    )
  }

  async getWindowRect(_pid: number): Promise<WindowRect> {
    const { stdout } = await osascript(
      'tell application "Terminal"',
      '  set b to bounds of front window',
      '  return (item 1 of b) & "," & (item 2 of b) & "," & (item 3 of b) & "," & (item 4 of b)',
      'end tell'
    )
    const [x, y, x2, y2] = stdout.trim().split(',').map(Number)
    return { x, y, width: x2 - x, height: y2 - y }
  }

  async setWindowRect(_pid: number, rect: WindowRect): Promise<void> {
    const { x, y, width, height } = rect
    await osascript(
      'tell application "Terminal"',
      `  set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}`,
      'end tell'
    )
  }

  async captureScreenContent(_pid: number): Promise<string> {
    try {
      const { stdout } = await osascript(
        'tell application "Terminal"',
        '  set windowContent to contents of front window',
        '  return windowContent',
        'end tell'
      )
      return stdout.trim()
    } catch {
      return ''
    }
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
