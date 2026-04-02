import { writable } from 'svelte/store'
import type { Layout } from '../../shared/types'

export const layouts = writable<Layout[]>([])

export async function refreshLayouts(): Promise<void> {
  const api = (window as any).api
  const list = await api.window.listLayouts()
  layouts.set(list)
}
