import { writable } from 'svelte/store'
import type { AppConfig, Favorite, FavoriteGroup, Prompt } from '../../shared/types'

export const appConfig = writable<AppConfig>({
  defaultShell: 'zsh',
  pollingIntervalMs: 15000,
  theme: 'dark'
})

export const favoriteGroups = writable<FavoriteGroup[]>([])
export const favoriteRecords = writable<Favorite[]>([])
export const prompts = writable<Prompt[]>([])

export async function refreshConfig(): Promise<void> {
  const api = (window as any).api
  const config = await api.config.load()
  appConfig.set(config)
}

export async function refreshFavorites(): Promise<void> {
  const api = (window as any).api
  const groups = await api.config.getFavorites()
  favoriteGroups.set(groups)
}

export async function refreshFavoriteRecords(): Promise<void> {
  const api = (window as any).api
  const favs = await api.config.getFavoriteRecords()
  favoriteRecords.set(favs)
}

export async function refreshPrompts(): Promise<void> {
  const api = (window as any).api
  const p = await api.config.getPrompts()
  prompts.set(p)
}
