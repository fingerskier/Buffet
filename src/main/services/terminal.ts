import type { ShellType, Unit, UnitStatus } from '../../shared/types'
import type { PlatformAdapter } from '../platform/index'

const EMPTY_STATUS: UnitStatus = {
  waitingForInput: false,
  hasErrors: false,
  lastCommand: '',
  cpu: 0,
  memory: 0,
  state: 'idle',
  lastUpdated: Date.now()
}

export class TerminalService {
  private units = new Map<number, Unit>()
  private livenessInterval: ReturnType<typeof setInterval> | null = null

  constructor(private platform: PlatformAdapter) {}

  async spawn(shell: ShellType, name?: string, cwd?: string): Promise<Unit> {
    const pid = await this.platform.spawnTerminal(shell, cwd)
    const unit: Unit = {
      pid,
      name: name || `${shell}-${pid}`,
      shell,
      cwd: cwd || process.cwd(),
      status: { ...EMPTY_STATUS, lastUpdated: Date.now() },
      isFavorite: false,
      createdAt: Date.now()
    }
    this.units.set(pid, unit)
    return unit
  }

  list(): Unit[] {
    return Array.from(this.units.values())
  }

  get(pid: number): Unit | undefined {
    return this.units.get(pid)
  }

  async inject(pid: number, text: string): Promise<void> {
    if (!this.units.has(pid)) throw new Error(`Unit ${pid} not found`)
    await this.platform.injectText(pid, text)
  }

  async kill(pid: number): Promise<void> {
    if (!this.units.has(pid)) throw new Error(`Unit ${pid} not found`)
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // Process may already be dead
    }
    this.units.delete(pid)
  }

  async focus(pid: number): Promise<void> {
    await this.platform.focusWindow(pid)
  }

  updateStatus(pid: number, status: Partial<UnitStatus>): void {
    const unit = this.units.get(pid)
    if (unit) {
      unit.status = { ...unit.status, ...status, lastUpdated: Date.now() }
    }
  }

  toggleFavorite(pid: number): boolean {
    const unit = this.units.get(pid)
    if (!unit) throw new Error(`Unit ${pid} not found`)
    unit.isFavorite = !unit.isFavorite
    return unit.isFavorite
  }

  startLivenessCheck(intervalMs = 5000): void {
    this.livenessInterval = setInterval(() => {
      for (const [pid, unit] of this.units) {
        if (!this.platform.isProcessAlive(pid)) {
          this.units.delete(pid)
        }
      }
    }, intervalMs)
  }

  stopLivenessCheck(): void {
    if (this.livenessInterval) {
      clearInterval(this.livenessInterval)
      this.livenessInterval = null
    }
  }

  destroy(): void {
    this.stopLivenessCheck()
    this.units.clear()
  }
}
