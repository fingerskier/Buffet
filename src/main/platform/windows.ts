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

const WIN32_INTEROP_TITLE = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class Win32Title {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll", CharSet = CharSet.Auto)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")]
  public static extern int GetWindowTextLength(IntPtr hWnd);
  public static IntPtr FindWindowByTitle(string title) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((hWnd, lParam) => {
      if (!IsWindowVisible(hWnd)) return true;
      int len = GetWindowTextLength(hWnd);
      if (len == 0) return true;
      StringBuilder sb = new StringBuilder(len + 1);
      GetWindowText(hWnd, sb, sb.Capacity);
      if (sb.ToString().Contains(title)) {
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

export class WindowsAdapter implements PlatformAdapter {
  private pidTitleMap = new Map<number, string>()
  /**
   * Finds the HWND for a given PID. Console apps on Windows have their windows
   * owned by conhost.exe or Windows Terminal, not the shell process itself.
   * Tries multiple strategies: MainWindowHandle, conhost child, EnumWindows.
   */
  private async getHwnd(pid: number): Promise<string> {
    // Strategy 0: Title-based lookup (most reliable for wt.exe-spawned windows)
    const title = this.pidTitleMap.get(pid)
    if (title) {
      try {
        const hwnd = await powershell(
          `${WIN32_INTEROP_TITLE}\n` +
          `$h = [Win32Title]::FindWindowByTitle('${title.replace(/'/g, "''")}')\n` +
          `if ($h -ne [IntPtr]::Zero) { $h.ToInt64() } else { throw 'not found' }`
        )
        return hwnd
      } catch {
        // Title lookup failed, fall through to PID-based strategies
      }
    }

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

# Strategy 4: Walk up the parent chain
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

# Strategy 5: Find Windows Terminal hosting this process (Win 11 default terminal)
$targetSession = $proc.SessionId
$wt = Get-Process -Name 'WindowsTerminal' -ErrorAction SilentlyContinue |
  Where-Object { $_.SessionId -eq $targetSession } | Select-Object -First 1
if ($wt) {
  if ($wt.MainWindowHandle -ne [IntPtr]::Zero) {
    Write-Output $wt.MainWindowHandle.ToInt64()
    exit
  }
  $h = [Win32]::FindWindowByPid([uint32]$wt.Id)
  if ($h -ne [IntPtr]::Zero) {
    Write-Output $h.ToInt64()
    exit
  }
}

throw 'No window found for PID ${pid}'
`
    return await powershell(script)
  }

  private async resolveExe(shell: ShellType): Promise<{ exe: string; args: string[] }> {
    const info = SHELL_EXECUTABLES[shell]
    if (!info) throw new Error(`Shell "${shell}" is not supported on Windows`)

    // For pwsh, fall back to powershell.exe (Windows PowerShell 5.1) if pwsh.exe (7+) isn't installed
    if (shell === 'pwsh') {
      for (const candidate of [info.exe, 'powershell.exe']) {
        try {
          await powershell(`Get-Command '${candidate}' -ErrorAction Stop | Out-Null`)
          return { exe: candidate, args: info.args }
        } catch { /* try next */ }
      }
      throw new Error('Neither pwsh.exe (PowerShell 7) nor powershell.exe is available')
    }

    try {
      await powershell(`Get-Command '${info.exe}' -ErrorAction Stop | Out-Null`)
    } catch {
      throw new Error(`"${info.exe}" is not installed or not in PATH`)
    }
    return info
  }

  private async hasWt(): Promise<boolean> {
    try {
      await powershell(`Get-Command wt.exe -ErrorAction Stop | Out-Null`)
      return true
    } catch {
      return false
    }
  }

  async spawnTerminal(shell: ShellType, cwd?: string, name?: string): Promise<number> {
    const info = await this.resolveExe(shell)
    const title = name ? name.replace(/'/g, "''") : shell

    // Prefer wt.exe new-window so each terminal gets its own window (own HWND)
    if (await this.hasWt()) {
      const processName = info.exe.replace(/\.exe$/i, '')

      // Snapshot existing PIDs for this shell before spawning
      const beforePids = await powershell(
        `@(Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id) -join ','`
      ).then((out) => new Set(out.split(',').filter(Boolean).map(Number)))

      // Build wt.exe arguments
      const wtArgs = ['new-window', '--title', `'${title}'`]
      if (cwd) wtArgs.push('-d', `'${cwd.replace(/'/g, "''")}'`)
      wtArgs.push(`'${info.exe}'`)
      if (shell === 'cmd') {
        wtArgs.push('/K', `'title ${title}'`)
      } else if (info.args.length > 0) {
        wtArgs.push(...info.args.map((a) => `'${a}'`))
      }

      await powershell(`Start-Process wt.exe -ArgumentList ${wtArgs.join(',')}`)

      // Poll for the new process (up to 3s)
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 500))
        const pidOut = await powershell(
          `Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | ` +
          `Sort-Object StartTime -Descending | Select-Object -ExpandProperty Id`
        )
        const newPid = pidOut
          .split(/\r?\n/)
          .map(Number)
          .find((p) => !isNaN(p) && !beforePids.has(p))
        if (newPid) {
          this.pidTitleMap.set(newPid, name || shell)
          return newPid
        }
      }
      throw new Error(`Timed out waiting for ${shell} process to start`)
    }

    // Fallback: Start-Process directly (no wt.exe available)
    const cwdArg = cwd ? `-WorkingDirectory '${cwd.replace(/'/g, "''")}'` : ''
    let argsStr = ''
    if (shell === 'cmd') {
      argsStr = `-ArgumentList '/K','title ${title}'`
    } else if (shell === 'pwsh' || info.exe === 'powershell.exe') {
      argsStr = `-ArgumentList '-NoExit','-Command','$Host.UI.RawUI.WindowTitle = ''${title}'''`
    } else if (info.args.length > 0) {
      argsStr = `-ArgumentList ${info.args.map((a) => `'${a}'`).join(',')}`
    }

    try {
      const pidOut = await powershell(
        `$p = Start-Process -FilePath '${info.exe}' ${argsStr} ${cwdArg} -PassThru; $p.Id`
      )
      const pid = parseInt(pidOut, 10)
      if (!isNaN(pid)) {
        this.pidTitleMap.set(pid, name || shell)
        return pid
      }
    } catch {
      // fall through to PID recovery
    }

    await new Promise((r) => setTimeout(r, 500))
    const pidOut = await powershell(
      `(Get-Process -Name '${info.exe.replace(/\.exe$/i, '')}' -ErrorAction Stop | Sort-Object StartTime -Descending | Select-Object -First 1).Id`
    )
    const pid = parseInt(pidOut, 10)
    this.pidTitleMap.set(pid, name || shell)
    return pid
  }

  async injectText(pid: number, text: string): Promise<void> {
    // Handle trailing newline → Enter
    let body = text
    let sendEnter = false
    if (body.endsWith('\r\n')) {
      body = body.slice(0, -2)
      sendEnter = true
    } else if (body.endsWith('\n')) {
      body = body.slice(0, -1)
      sendEnter = true
    }

    // Focus the terminal window, then send keystrokes via WScript.Shell
    // (WriteConsoleInput is unreliable on Win 11 where ConPTY is default)
    await this.focusWindow(pid)
    await new Promise((r) => setTimeout(r, 150))
    let escaped = escapeSendKeys(body).replace(/'/g, "''")
    if (sendEnter) escaped += '~'
    await powershell(
      `$wshell = New-Object -ComObject WScript.Shell; ` +
        `$wshell.SendKeys('${escaped}')`
    )
  }

  async focusWindow(pid: number): Promise<void> {
    // Try HWND-based focus first (works for conhost-hosted terminals)
    try {
      const hwnd = await this.getHwnd(pid)
      await powershell(
        `Add-Type @"\nusing System;\nusing System.Runtime.InteropServices;\npublic class FocusHelper {\n  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);\n  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);\n  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);\n}\n"@\n` +
        `$h = [IntPtr]${hwnd}; ` +
        `if ([FocusHelper]::IsIconic($h)) { [FocusHelper]::ShowWindow($h, 9) }; ` +
        `[FocusHelper]::SetForegroundWindow($h) | Out-Null`
      )
      return
    } catch {
      // HWND resolution failed (e.g. Windows Terminal hosting) — fall through
    }

    // Fallback: AppActivate by title (if known), then by PID, then by process name
    const fallbackTitle = this.pidTitleMap.get(pid)
    if (fallbackTitle) {
      await powershell(
        `$wshell = New-Object -ComObject WScript.Shell; ` +
        `$wshell.AppActivate('${fallbackTitle.replace(/'/g, "''")}') | Out-Null`
      )
    } else {
      await powershell(
        `$wshell = New-Object -ComObject WScript.Shell; ` +
        `if (-not $wshell.AppActivate(${pid})) { ` +
          `$proc = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; ` +
          `if ($proc) { $wshell.AppActivate($proc.ProcessName) | Out-Null } ` +
        `}`
      )
    }
  }

  async killProcess(pid: number): Promise<void> {
    // taskkill /T kills the entire process tree, /F forces termination
    await powershell(`taskkill /T /F /PID ${pid} 2>$null; $null`)
    this.pidTitleMap.delete(pid)
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

  async captureScreenContent(pid: number): Promise<string> {
    // Full console buffer reading isn't feasible on Windows.
    // Instead, capture the window title + active child processes as a proxy
    // for the AI to determine working/waiting/error state.
    try {
      const output = await powershell(
        `$title = (Get-Process -Id ${pid} -ErrorAction SilentlyContinue).MainWindowTitle; ` +
        `$children = Get-CimInstance Win32_Process -Filter "ParentProcessId=${pid}" -ErrorAction SilentlyContinue | ` +
        `  Select-Object Name, ProcessId, CommandLine | ForEach-Object { "$($_.Name) (PID $($_.ProcessId)): $($_.CommandLine)" }; ` +
        `$cpuInfo = Get-Process -Id ${pid} -ErrorAction SilentlyContinue | ` +
        `  ForEach-Object { "CPU Time: $([math]::Round($_.TotalProcessorTime.TotalSeconds, 1))s, Threads: $($_.Threads.Count)" }; ` +
        `"Window Title: $title"; ` +
        `"Process Info: $cpuInfo"; ` +
        `if ($children) { "Active Child Processes:"; $children } else { "No child processes" }`
      )
      return output
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
      // Walk the entire process tree (shell + children + grandchildren)
      // because the shell (cmd.exe) uses almost no CPU — the work is in child processes
      const script = `
$allPids = [System.Collections.ArrayList]@(${pid})
$queue = [System.Collections.Queue]::new()
$queue.Enqueue(${pid})
while ($queue.Count -gt 0) {
  $cur = $queue.Dequeue()
  Get-CimInstance Win32_Process -Filter "ParentProcessId=$cur" -ErrorAction SilentlyContinue |
    ForEach-Object { [void]$allPids.Add($_.ProcessId); $queue.Enqueue($_.ProcessId) }
}

$t1 = [double]0; $mem = [long]0
foreach ($p in $allPids) {
  $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
  if ($proc) { $t1 += $proc.TotalProcessorTime.TotalMilliseconds; $mem += $proc.WorkingSet64 }
}

Start-Sleep -Milliseconds 500

$t2 = [double]0
foreach ($p in $allPids) {
  $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
  if ($proc) { $t2 += $proc.TotalProcessorTime.TotalMilliseconds }
}

$cpuPct = [math]::Round(($t2 - $t1) / 500 * 100 / [Environment]::ProcessorCount, 1)
$memMb = [math]::Round($mem / 1048576)
"$cpuPct,$memMb"
`
      const output = await powershell(script)
      const [cpu, memory] = output.split(',').map(Number)
      return { cpu: cpu || 0, memory: memory || 0 }
    } catch {
      return { cpu: 0, memory: 0 }
    }
  }
}
