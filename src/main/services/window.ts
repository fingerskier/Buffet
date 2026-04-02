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
        let rect: WindowRect = { x: 100, y: 100, width: 800, height: 600 }
        try {
          rect = await this.platform.getWindowRect(unit.pid)
        } catch {
          // Use default rect if window handle not found
        }
        return { unitName: unit.name, shell: unit.shell, cwd: unit.cwd, rect }
      })
    )

    const layout: Layout = {
      name,
      positions,
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

    // Spawn missing units, reuse existing ones by name
    for (const pos of layout.positions) {
      let unit = this.terminalService.list().find(u => u.name === pos.unitName)
      if (!unit) {
        unit = await this.terminalService.spawn(pos.shell, pos.unitName, pos.cwd)
      }
    }

    // Brief delay to let windows appear before positioning
    await new Promise(r => setTimeout(r, 800))

    // Position all matched units
    for (const pos of layout.positions) {
      const unit = this.terminalService.list().find(u => u.name === pos.unitName)
      if (unit) {
        try {
          await this.platform.setWindowRect(unit.pid, pos.rect)
        } catch {
          // Window may not be ready yet
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
