import { execFile } from 'child_process'
import { promisify } from 'util'
import type { ShellType, WindowRect } from '../../shared/types'
import type { PlatformAdapter } from './index'

const exec = promisify(execFile)

function powershell(script: string): Promise<string> {
  return exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]).then(
    ({ stdout }) => stdout.trim()
  )
}

const SHELL_EXECUTABLES: Record<ShellType, { exe: string; args: string[] }> = {
  cmd: { exe: 'cmd.exe', args: [] },
  pwsh: { exe: 'pwsh.exe', args: [] },
  bash: { exe: 'bash.exe', args: [] },
  zsh: { exe: 'wsl.exe', args: ['--', 'zsh'] },
  wsl: { exe: 'wsl.exe', args: [] }
}

const WIN32_INTEROP = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left, Top, Right, Bottom; }
  public static IntPtr FindWindowByPid(uint pid) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((hWnd, lParam) => {
      uint wpid;
      GetWindowThreadProcessId(hWnd, out wpid);
      if (wpid == pid && IsWindowVisible(hWnd) && GetWindowTextLength(hWnd) > 0) {
        found = hWnd;
        return false;
      }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@
`

function escapeSendKeys(text: string): string {
  return text.replace(/[+^%~{}[\]()]/g, (ch) => `{${ch}}`)
}

export class WindowsAdapter implements PlatformAdapter {
  /**
   * Finds the HWND for a given PID. Console apps on Windows have their windows
   * owned by conhost.exe or Windows Terminal, not the shell process itself.
   * Tries multiple strategies: MainWindowHandle, conhost child, EnumWindows.
   */
  private async getHwnd(pid: number): Promise<string> {
    const script = `
${WIN32_INTEROP}

# Strategy 1: Direct MainWindowHandle from Get-Process
$proc = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
  Write-Output $proc.MainWindowHandle.ToInt64()
  exit
}

# Strategy 2: Find conhost.exe whose parent is our process
$conhost = Get-CimInstance Win32_Process -Filter "Name='conhost.exe' AND ParentProcessId=${pid}" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conhost) {
  $cproc = Get-Process -Id $conhost.ProcessId -ErrorAction SilentlyContinue
  if ($cproc -and $cproc.MainWindowHandle -ne [IntPtr]::Zero) {
    Write-Output $cproc.MainWindowHandle.ToInt64()
    exit
  }
  $h = [Win32]::FindWindowByPid([uint32]$conhost.ProcessId)
  if ($h -ne [IntPtr]::Zero) {
    Write-Output $h.ToInt64()
    exit
  }
}

# Strategy 3: EnumWindows on original PID (fallback)
$h = [Win32]::FindWindowByPid([uint32]${pid})
if ($h -ne [IntPtr]::Zero) {
  Write-Output $h.ToInt64()
  exit
}

# Strategy 4: Walk up the parent chain (handles Windows Terminal hosting)
$currentPid = ${pid}
for ($i = 0; $i -lt 3; $i++) {
  $wp = Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -ErrorAction SilentlyContinue
  if (-not $wp -or -not $wp.ParentProcessId) { break }
  $currentPid = $wp.ParentProcessId
  $parentProc = Get-Process -Id $currentPid -ErrorAction SilentlyContinue
  if ($parentProc -and $parentProc.MainWindowHandle -ne [IntPtr]::Zero) {
    Write-Output $parentProc.MainWindowHandle.ToInt64()
    exit
  }
}

throw 'No window found for PID ${pid}'
`
    return await powershell(script)
  }

  async spawnTerminal(shell: ShellType, cwd?: string): Promise<number> {
    const info = SHELL_EXECUTABLES[shell]
    if (!info) {
      throw new Error(`Shell "${shell}" is not supported on Windows`)
    }

    const cwdArg = cwd ? `-WorkingDirectory '${cwd.replace(/'/g, "''")}'` : ''
    const argsStr =
      info.args.length > 0
        ? `-ArgumentList ${info.args.map((a) => `'${a}'`).join(',')}`
        : ''

    try {
      const pidOut = await powershell(
        `$p = Start-Process -FilePath '${info.exe}' ${argsStr} ${cwdArg} -PassThru; $p.Id`
      )
      const pid = parseInt(pidOut, 10)
      if (!isNaN(pid)) return pid
    } catch {
      // Start-Process may have opened the terminal but errored on output;
      // fall through to PID recovery below
    }

    // Fallback: find the newest process matching the shell
    await new Promise((r) => setTimeout(r, 500))
    const pidOut = await powershell(
      `(Get-Process -Name '${info.exe.replace(/\.exe$/i, '')}' -ErrorAction Stop | Sort-Object StartTime -Descending | Select-Object -First 1).Id`
    )
    return parseInt(pidOut, 10)
  }

  async injectText(pid: number, text: string): Promise<void> {
    const escaped = escapeSendKeys(text).replace(/'/g, "''")
    await powershell(
      `$wshell = New-Object -ComObject WScript.Shell; ` +
        `$wshell.AppActivate(${pid}) | Out-Null; ` +
        `Start-Sleep -Milliseconds 100; ` +
        `$wshell.SendKeys('${escaped}')`
    )
  }

  async focusWindow(pid: number): Promise<void> {
    await powershell(
      `$wshell = New-Object -ComObject WScript.Shell; $wshell.AppActivate(${pid}) | Out-Null`
    )
  }

  async getWindowRect(pid: number): Promise<WindowRect> {
    const hwnd = await this.getHwnd(pid)
    const output = await powershell(
      `${WIN32_INTEROP}\n` +
        `$r = New-Object Win32+RECT; ` +
        `[Win32]::GetWindowRect([IntPtr]${hwnd}, [ref]$r); ` +
        `"$($r.Left),$($r.Top),$($r.Right),$($r.Bottom)"`
    )
    const [left, top, right, bottom] = output.split(',').map(Number)
    return { x: left, y: top, width: right - left, height: bottom - top }
  }

  async setWindowRect(pid: number, rect: WindowRect): Promise<void> {
    const hwnd = await this.getHwnd(pid)
    const { x, y, width, height } = rect
    await powershell(
      `${WIN32_INTEROP}\n[Win32]::SetWindowPos([IntPtr]${hwnd}, [IntPtr]::Zero, ${x}, ${y}, ${width}, ${height}, 0x0044)`
    )
  }

  async captureScreenContent(_pid: number): Promise<string> {
    // Console buffer reading via AttachConsole/ReadConsoleOutput is complex and fragile
    return ''
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
      const output = await powershell(
        `$p = Get-Process -Id ${pid} -ErrorAction Stop; "$([math]::Round($p.CPU, 2)),$([math]::Round($p.WorkingSet64 / 1048576))"`
      )
      const [cpu, memory] = output.split(',').map(Number)
      return { cpu: cpu || 0, memory: memory || 0 }
    } catch {
      return { cpu: 0, memory: 0 }
    }
  }
}
