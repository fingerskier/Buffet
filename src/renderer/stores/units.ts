import { writable, derived } from 'svelte/store'
import type { Unit } from '../../shared/types'

export const units = writable<Unit[]>([])
export const searchQuery = writable('')
export const statusFilter = writable<'all' | 'working' | 'waiting' | 'idle' | 'error' | 'favorites'>('all')

export const filteredUnits = derived(
  [units, searchQuery, statusFilter],
  ([$units, $search, $filter]) => {
    let result = $units

    if ($filter === 'favorites') {
      result = result.filter(u => u.isFavorite)
    } else if ($filter !== 'all') {
      result = result.filter(u => u.status.state === $filter)
    }

    if ($search.trim()) {
      const q = $search.toLowerCase()
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.shell.toLowerCase().includes(q) ||
        u.status.lastCommand.toLowerCase().includes(q)
      )
    }

    return result
  }
)

export async function refreshUnits(): Promise<void> {
  const api = (window as any).api
  const list = await api.terminal.list()
  units.set(list)
}

export function setupUnitListeners(): () => void {
  const api = (window as any).api

  const unsubList = api.on('units:list-update', (list: Unit[]) => {
    units.set(list)
  })

  const unsubStatus = api.on('units:status-update', (update: { pid: number; status: any }) => {
    units.update(current =>
      current.map(u =>
        u.pid === update.pid ? { ...u, status: update.status } : u
      )
    )
  })

  return () => {
    unsubList?.()
    unsubStatus?.()
  }
}
