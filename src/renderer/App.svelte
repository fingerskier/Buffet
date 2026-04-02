<script lang="ts">
  import Toolbar from './components/Toolbar.svelte'
  import Dashboard from './components/Dashboard.svelte'
  import SpawnDialog from './components/SpawnDialog.svelte'
  import InjectDialog from './components/InjectDialog.svelte'
  import LayoutManager from './components/LayoutManager.svelte'
  import ConfigPanel from './components/ConfigPanel.svelte'
  import FavoritesPanel from './components/FavoritesPanel.svelte'
  import { refreshUnits, setupUnitListeners, units } from './stores/units'
  import type { ShellType, Unit } from '../shared/types'

  let showSpawn = $state(false)
  let showLayouts = $state(false)
  let showConfig = $state(false)
  let showFavorites = $state(false)
  let injectTarget = $state<{ pid: number; name: string } | null>(null)

  const api = (window as any).api

  $effect(() => {
    refreshUnits()
    const cleanup = setupUnitListeners()
    return cleanup
  })

  async function handleSpawn(shell: ShellType, name: string, cwd: string) {
    await api.terminal.spawn(shell, name, cwd)
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
    await api.terminal.toggleFavorite(pid)
    await refreshUnits()
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
