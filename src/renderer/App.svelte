<script lang="ts">
  import Toolbar from './components/Toolbar.svelte'
  import Dashboard from './components/Dashboard.svelte'
  import SpawnDialog from './components/SpawnDialog.svelte'
  import InjectDialog from './components/InjectDialog.svelte'
  import LayoutManager from './components/LayoutManager.svelte'
  import ConfigPanel from './components/ConfigPanel.svelte'
  import FavoritesPanel from './components/FavoritesPanel.svelte'
  import { refreshUnits, setupUnitListeners, units } from './stores/units'
  import { favoriteRecords, refreshFavoriteRecords } from './stores/config'
  import type { Favorite, ShellType, Unit } from '../shared/types'

  let showSpawn = $state(false)
  let showLayouts = $state(false)
  let showConfig = $state(false)
  let showFavorites = $state(false)
  let injectTarget = $state<{ pid: number; name: string } | null>(null)

  let favs = $state<Favorite[]>([])
  favoriteRecords.subscribe(v => favs = v)

  const api = (window as any).api

  $effect(() => {
    refreshUnits()
    refreshFavoriteRecords()
    const cleanup = setupUnitListeners()
    return cleanup
  })

  async function handleSpawn(shell: ShellType, name: string, cwd: string) {
    try {
      await api.terminal.spawn(shell, name, cwd)
    } catch (e) {
      console.error('Spawn failed:', e)
    }
    await refreshUnits()
  }

  async function handleFocus(pid: number) {
    await api.terminal.focus(pid)
  }

  function handleInjectOpen(pid: number) {
    let unitList: Unit[] = []
    units.subscribe(v => unitList = v)()
    const unit = unitList.find(u => u.pid === pid)
    injectTarget = { pid, name: unit?.name || `PID ${pid}` }
  }

  async function handleInject(pid: number, text: string) {
    await api.terminal.inject(pid, text)
  }

  async function handleKill(pid: number) {
    await api.terminal.kill(pid)
    await refreshUnits()
  }

  async function handleAnalyze(pid: number) {
    await api.status.analyze(pid)
    await refreshUnits()
  }

  async function handleToggleFavorite(pid: number) {
    let unitList: Unit[] = []
    units.subscribe(v => unitList = v)()
    const unit = unitList.find(u => u.pid === pid)
    if (!unit) return

    const currentFavs = [...favs]
    const existing = currentFavs.find(
      f => f.name === unit.name && f.shell === unit.shell && f.cwd === unit.cwd
    )

    if (existing) {
      await api.config.saveFavoriteRecords(currentFavs.filter(f => f.id !== existing.id))
    } else {
      const fav: Favorite = {
        id: crypto.randomUUID(),
        name: unit.name,
        shell: unit.shell,
        cwd: unit.cwd
      }
      await api.config.saveFavoriteRecords([...currentFavs, fav])
    }
    await refreshFavoriteRecords()
  }

  async function handleSpawnFavorite(fav: Favorite) {
    try {
      await api.terminal.spawn(fav.shell, fav.name, fav.cwd)
    } catch (e) {
      console.error('Spawn from favorite failed:', e)
    }
    await refreshUnits()
  }

  async function handleDeleteFavorite(id: string) {
    const currentFavs = [...favs]
    await api.config.saveFavoriteRecords(currentFavs.filter(f => f.id !== id))
    await refreshFavoriteRecords()
  }
</script>

<div id="app-root">
  <Toolbar
    onSpawn={() => showSpawn = true}
    onToggleLayouts={() => showLayouts = !showLayouts}
    onToggleConfig={() => showConfig = !showConfig}
  />

  <Dashboard
    onInject={handleInjectOpen}
    onFocus={handleFocus}
    onKill={handleKill}
    onAnalyze={handleAnalyze}
    onToggleFavorite={handleToggleFavorite}
    onSpawnFavorite={handleSpawnFavorite}
    onDeleteFavorite={handleDeleteFavorite}
    favorites={favs}
  />

  {#if showSpawn}
    <SpawnDialog
      onSpawn={handleSpawn}
      onClose={() => showSpawn = false}
    />
  {/if}

  {#if injectTarget}
    <InjectDialog
      pid={injectTarget.pid}
      unitName={injectTarget.name}
      onInject={handleInject}
      onClose={() => injectTarget = null}
    />
  {/if}

  {#if showLayouts}
    <LayoutManager onClose={() => showLayouts = false} />
  {/if}

  {#if showConfig}
    <ConfigPanel onClose={() => showConfig = false} />
  {/if}

  {#if showFavorites}
    <FavoritesPanel onClose={() => showFavorites = false} />
  {/if}
</div>

<style>
  #app-root {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
</style>
