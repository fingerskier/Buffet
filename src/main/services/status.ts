import { execFile } from 'child_process'
import { promisify } from 'util'
import { createHash } from 'crypto'
import type { BrowserWindow } from 'electron'
import type { UnitStatus } from '../../shared/types'
import type { PlatformAdapter } from '../platform/index'
import type { TerminalService } from './terminal'

const exec = promisify(execFile)

export class StatusService {
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private contentHashes = new Map<number, string>()
  private mainWindow: BrowserWindow | null = null

  constructor(
    private platform: PlatformAdapter,
    private terminalService: TerminalService
  ) {}

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  async getResourceUsage(pid: number): Promise<{ cpu: number; memory: number }> {
    return this.platform.getResourceUsage(pid)
  }

  async captureScreen(pid: number): Promise<string> {
    return this.platform.captureScreenContent(pid)
  }

  async analyzeWithAI(screenContent: string): Promise<{
    waitingForInput: boolean
    hasErrors: boolean
    lastCommand: string
  }> {
    try {
      const prompt = `Analyze this terminal output and respond with ONLY a JSON object (no markdown, no explanation):
{"waitingForInput": boolean, "hasErrors": boolean, "lastCommand": "string"}

Terminal content:
${screenContent.slice(-2000)}`

      const { stdout } = await exec('claude', [
        '-m', 'haiku',
        '--output-format', 'json',
        '-p', prompt
      ], { timeout: 15000 })

      const parsed = JSON.parse(stdout.trim())
      return {
        waitingForInput: !!parsed.waitingForInput,
        hasErrors: !!parsed.hasErrors,
        lastCommand: String(parsed.lastCommand || '')
      }
    } catch {
      return { waitingForInput: false, hasErrors: false, lastCommand: '' }
    }
  }

  private hash(content: string): string {
    return createHash('md5').update(content).digest('hex')
  }

  private deriveState(
    cpu: number,
    ai: { waitingForInput: boolean; hasErrors: boolean }
  ): UnitStatus['state'] {
    if (ai.hasErrors) return 'error'
    if (ai.waitingForInput) return 'waiting'
    if (cpu > 5) return 'working'
    return 'idle'
  }

  async analyzeUnit(pid: number): Promise<UnitStatus> {
    const [resources, screen] = await Promise.all([
      this.getResourceUsage(pid),
      this.captureScreen(pid)
    ])

    const currentHash = this.hash(screen)
    const previousHash = this.contentHashes.get(pid)
    this.contentHashes.set(pid, currentHash)

    let ai = { waitingForInput: false, hasErrors: false, lastCommand: '' }

    if (screen && currentHash !== previousHash) {
      ai = await this.analyzeWithAI(screen)
    }

    const status: UnitStatus = {
      ...ai,
      cpu: resources.cpu,
      memory: resources.memory,
      state: this.deriveState(resources.cpu, ai),
      lastUpdated: Date.now()
    }

    this.terminalService.updateStatus(pid, status)
    return status
  }

  startPolling(intervalMs: number): void {
    this.stopPolling()
    this.pollInterval = setInterval(async () => {
      const units = this.terminalService.list()
      for (const unit of units) {
        try {
          const status = await this.analyzeUnit(unit.pid)
          this.mainWindow?.webContents.send('units:status-update', {
            pid: unit.pid,
            status
          })
        } catch {
          // Skip failed analyses
        }
      }

      // Send full unit list after status updates
      this.mainWindow?.webContents.send('units:list-update', this.terminalService.list())
    }, intervalMs)
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.contentHashes.clear()
  }

  destroy(): void {
    this.stopPolling()
  }
}
