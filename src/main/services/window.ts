import type { Layout, WindowRect } from '../../shared/types'
import type { PlatformAdapter } from '../platform/index'
import type { TerminalService } from './terminal'
import type { ConfigService } from './config'

export class WindowService {
  constructor(
    private platform: PlatformAdapter,
    private terminalService: TerminalService,
    private configService: ConfigService
  ) {}

  async getPosition(pid: number): Promise<WindowRect> {
    return this.platform.getWindowRect(pid)
  }

  async setPosition(pid: number, rect: WindowRect): Promise<void> {
    return this.platform.setWindowRect(pid, rect)
  }

  async saveLayout(name: string): Promise<Layout> {
    const units = this.terminalService.list()
    const positions = await Promise.all(
      units.map(async (unit) => {
        try {
          const rect = await this.platform.getWindowRect(unit.pid)
          return { unitName: unit.name, shell: unit.shell, rect }
        } catch {
          return null
        }
      })
    )

    const layout: Layout = {
      name,
      positions: positions.filter((p): p is NonNullable<typeof p> => p !== null),
      createdAt: Date.now()
    }

    const layouts = this.configService.getLayouts()
    const existing = layouts.findIndex(l => l.name === name)
    if (existing >= 0) {
      layouts[existing] = layout
    } else {
      layouts.push(layout)
    }
    this.configService.saveLayouts(layouts)

    return layout
  }

  async restoreLayout(name: string): Promise<void> {
    const layouts = this.configService.getLayouts()
    const layout = layouts.find(l => l.name === name)
    if (!layout) throw new Error(`Layout "${name}" not found`)

    const units = this.terminalService.list()
    for (const pos of layout.positions) {
      const unit = units.find(u => u.name === pos.unitName)
      if (unit) {
        try {
          await this.platform.setWindowRect(unit.pid, pos.rect)
        } catch {
          // Window may not exist anymore
        }
      }
    }
  }

  listLayouts(): Layout[] {
    return this.configService.getLayouts()
  }

  deleteLayout(name: string): void {
    const layouts = this.configService.getLayouts().filter(l => l.name !== name)
    this.configService.saveLayouts(layouts)
  }
}
