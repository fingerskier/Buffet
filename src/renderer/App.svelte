<script lang="ts">
  import Toolbar from './components/Toolbar.svelte'
  import Dashboard from './components/Dashboard.svelte'
  import SpawnDialog from './components/SpawnDialog.svelte'
  import InjectDialog from './components/InjectDialog.svelte'
  import LayoutManager from './components/LayoutManager.svelte'
  import ConfigPanel from './components/ConfigPanel.svelte'
  import PromptsPanel from './components/PromptsPanel.svelte'
  import { refreshUnits, setupUnitListeners, units } from './stores/units'
  import { favoriteRecords, favoriteGroups, prompts as promptsStore, refreshFavoriteRecords, refreshFavorites, refreshPrompts } from './stores/config'
  import type { Favorite, FavoriteGroup, Prompt, ShellType, Unit } from '../shared/types'

  let showSpawn = $state(false)
  let showLayouts = $state(false)
  let showConfig = $state(false)
  let showPrompts = $state(false)
  let injectTarget = $state<{ pid: number; name: string } | null>(null)

  let favs = $state<Favorite[]>([])
  favoriteRecords.subscribe(v => favs = v)

  let grps = $state<FavoriteGroup[]>([])
  favoriteGroups.subscribe(v => grps = v)

  let savedPrompts = $state<Prompt[]>([])
  promptsStore.subscribe(v => savedPrompts = v)

  const api = (window as any).api

  $effect(() => {
    refreshUnits()
    refreshFavoriteRecords()
    refreshFavorites()
    refreshPrompts()
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
    try {
      await api.terminal.focus(pid)
    } catch (err) {
      console.error('Focus failed:', err)
    }
  }

  function handleInjectOpen(pid: number) {
    let unitList: Unit[] = []
    units.subscribe(v => unitList = v)()
    const unit = unitList.find(u => u.pid === pid)
    injectTarget = { pid, name: unit?.name || `PID ${pid}` }
  }

  async function handleInject(pid: number, text: string) {
    try {
      await api.terminal.inject(pid, text)
    } catch (err) {
      console.error('Inject failed:', err)
    }
  }

  async function handleSavePrompt(name: string, text: string) {
    const current = JSON.parse(JSON.stringify(savedPrompts)) as Prompt[]
    current.push({ id: crypto.randomUUID(), name, text })
    await api.config.savePrompts(current)
    await refreshPrompts()
  }

  async function handleDeletePrompt(id: string) {
    const current = JSON.parse(JSON.stringify(savedPrompts)) as Prompt[]
    await api.config.savePrompts(current.filter(p => p.id !== id))
    await refreshPrompts()
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

    const currentFavs = JSON.parse(JSON.stringify(favs)) as Favorite[]
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

  async function handleRenameUnit(pid: number, name: string) {
    await api.terminal.rename(pid, name)
    await refreshUnits()
  }

  async function handleRenameFavorite(id: string, name: string) {
    const currentFavs = JSON.parse(JSON.stringify(favs)) as Favorite[]
    const fav = currentFavs.find(f => f.id === id)
    if (!fav) return
    fav.name = name
    await api.config.saveFavoriteRecords(currentFavs)
    await refreshFavoriteRecords()
  }

  async function handleDeleteFavorite(id: string) {
    const currentFavs = JSON.parse(JSON.stringify(favs)) as Favorite[]
    await api.config.saveFavoriteRecords(currentFavs.filter(f => f.id !== id))
    await refreshFavoriteRecords()
  }

  async function handleCreateGroup(name: string) {
    const group: FavoriteGroup = {
      id: crypto.randomUUID(),
      name,
      favoriteIds: []
    }
    const current = JSON.parse(JSON.stringify(grps)) as FavoriteGroup[]
    await api.config.saveFavorites([...current, group])
    await refreshFavorites()
  }

  async function handleRenameGroup(id: string, name: string) {
    const current = JSON.parse(JSON.stringify(grps)) as FavoriteGroup[]
    const group = current.find(g => g.id === id)
    if (!group) return
    group.name = name
    await api.config.saveFavorites(current)
    await refreshFavorites()
  }

  async function handleDeleteGroup(id: string) {
    const current = JSON.parse(JSON.stringify(grps)) as FavoriteGroup[]
    await api.config.saveFavorites(current.filter(g => g.id !== id))
    await refreshFavorites()
  }

  async function handleToggleGroupMembership(groupId: string, favoriteId: string) {
    const current = JSON.parse(JSON.stringify(grps)) as FavoriteGroup[]
    const group = current.find(g => g.id === groupId)
    if (!group) return
    if (group.favoriteIds.includes(favoriteId)) {
      group.favoriteIds = group.favoriteIds.filter(id => id !== favoriteId)
    } else {
      group.favoriteIds.push(favoriteId)
    }
    await api.config.saveFavorites(current)
    await refreshFavorites()
  }

  async function handleRemoveFromGroup(groupId: string, favoriteId: string) {
    const current = JSON.parse(JSON.stringify(grps)) as FavoriteGroup[]
    const group = current.find(g => g.id === groupId)
    if (!group) return
    group.favoriteIds = group.favoriteIds.filter(id => id !== favoriteId)
    await api.config.saveFavorites(current)
    await refreshFavorites()
  }

  async function handleLaunchGroup(groupId: string) {
    const group = grps.find(g => g.id === groupId)
    if (!group) return
    for (const favId of group.favoriteIds) {
      const fav = favs.find(f => f.id === favId)
      if (fav) {
        try {
          await api.terminal.spawn(fav.shell, fav.name, fav.cwd)
        } catch (e) {
          console.error('Group launch failed for', fav.name, e)
        }
      }
    }
    await refreshUnits()
  }

  async function handleDropFavorite(favoriteId: string, sourceGroupId: string | null, targetGroupId: string | null, copy: boolean) {
    const current = JSON.parse(JSON.stringify(grps)) as FavoriteGroup[]

    // Remove from source group (unless copying)
    if (!copy && sourceGroupId) {
      const source = current.find(g => g.id === sourceGroupId)
      if (source) {
        source.favoriteIds = source.favoriteIds.filter(id => id !== favoriteId)
      }
    }

    // Add to target group (if not already there)
    if (targetGroupId) {
      const target = current.find(g => g.id === targetGroupId)
      if (target && !target.favoriteIds.includes(favoriteId)) {
        target.favoriteIds.push(favoriteId)
      }
    }

    await api.config.saveFavorites(current)
    await refreshFavorites()
  }
</script>

<div id="app-root">
  <Toolbar
    onSpawn={() => showSpawn = true}
    onToggleLayouts={() => showLayouts = !showLayouts}
    onTogglePrompts={() => showPrompts = !showPrompts}
    onToggleConfig={() => showConfig = !showConfig}
  />

  <Dashboard
    onInject={handleInjectOpen}
    onFocus={handleFocus}
    onKill={handleKill}
    onAnalyze={handleAnalyze}
    onToggleFavorite={handleToggleFavorite}
    onRenameUnit={handleRenameUnit}
    onRenameFavorite={handleRenameFavorite}
    onSpawnFavorite={handleSpawnFavorite}
    onDeleteFavorite={handleDeleteFavorite}
    favorites={favs}
    groups={grps}
    onCreateGroup={handleCreateGroup}
    onRenameGroup={handleRenameGroup}
    onDeleteGroup={handleDeleteGroup}
    onToggleGroupMembership={handleToggleGroupMembership}
    onRemoveFromGroup={handleRemoveFromGroup}
    onLaunchGroup={handleLaunchGroup}
    onDropFavorite={handleDropFavorite}
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
      prompts={savedPrompts}
      onInject={handleInject}
      onSavePrompt={handleSavePrompt}
      onDeletePrompt={handleDeletePrompt}
      onClose={() => injectTarget = null}
    />
  {/if}

  {#if showLayouts}
    <LayoutManager onClose={() => showLayouts = false} />
  {/if}

  {#if showPrompts}
    <PromptsPanel onClose={() => showPrompts = false} />
  {/if}

  {#if showConfig}
    <ConfigPanel onClose={() => showConfig = false} />
  {/if}

</div>

<style>
  #app-root {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
</style>
