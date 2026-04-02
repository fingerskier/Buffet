import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import type { AppConfig, Favorite, FavoriteGroup, Layout } from '../../shared/types'

const DATA_DIR = join(app.getPath('userData'), 'buffet-data')

const DEFAULTS: AppConfig = {
  defaultShell: process.platform === 'win32' ? 'cmd' : 'zsh',
  pollingIntervalMs: 15000,
  theme: 'dark'
}

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readJson<T>(filename: string, fallback: T): T {
  const filepath = join(DATA_DIR, filename)
  if (!existsSync(filepath)) return fallback
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'))
  } catch {
    return fallback
  }
}

function writeJson(filename: string, data: unknown): void {
  ensureDir()
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
}

export class ConfigService {
  load(): AppConfig {
    return { ...DEFAULTS, ...readJson('config.json', {}) }
  }

  save(config: AppConfig): void {
    writeJson('config.json', config)
  }

  getFavorites(): FavoriteGroup[] {
    const raw = readJson<any[]>('favorites.json', [])
    const favs = this.getFavoriteRecords()
    let migrated = false

    const groups: FavoriteGroup[] = raw.map((g: any) => {
      // Already new format
      if (Array.isArray(g.favoriteIds)) {
        return { id: g.id, name: g.name, favoriteIds: g.favoriteIds }
      }
      // Old format: convert units[] to favoriteIds[]
      migrated = true
      const ids = (g.units || [])
        .map((u: any) => {
          const match = favs.find(
            f => f.name === u.name && f.shell === u.shell && f.cwd === u.cwd
          )
          return match?.id
        })
        .filter(Boolean) as string[]
      return { id: crypto.randomUUID(), name: g.name, favoriteIds: ids }
    })

    // Clean dangling references
    const validIds = new Set(favs.map(f => f.id))
    let cleaned = false
    for (const group of groups) {
      const before = group.favoriteIds.length
      group.favoriteIds = group.favoriteIds.filter(id => validIds.has(id))
      if (group.favoriteIds.length !== before) cleaned = true
    }

    if (migrated || cleaned) {
      this.saveFavorites(groups)
    }

    return groups
  }

  saveFavorites(groups: FavoriteGroup[]): void {
    writeJson('favorites.json', groups)
  }

  getFavoriteRecords(): Favorite[] {
    return readJson('favorite-records.json', [])
  }

  saveFavoriteRecords(favs: Favorite[]): void {
    writeJson('favorite-records.json', favs)
  }

  getLayouts(): Layout[] {
    return readJson('layouts.json', [])
  }

  saveLayouts(layouts: Layout[]): void {
    writeJson('layouts.json', layouts)
  }

  exportAll(): string {
    return JSON.stringify({
      config: this.load(),
      favorites: this.getFavorites(),
      favoriteRecords: this.getFavoriteRecords(),
      layouts: this.getLayouts()
    }, null, 2)
  }

  importAll(json: string): void {
    const data = JSON.parse(json)
    if (data.config) this.save(data.config)
    if (data.favorites) this.saveFavorites(data.favorites)
    if (data.favoriteRecords) this.saveFavoriteRecords(data.favoriteRecords)
    if (data.layouts) this.saveLayouts(data.layouts)
  }
}
