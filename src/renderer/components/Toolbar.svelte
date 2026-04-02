<script lang="ts">
  import { searchQuery, statusFilter, units } from '../stores/units'
  import { get } from 'svelte/store'

  let { onSpawn, onToggleLayouts, onToggleConfig }: {
    onSpawn: () => void
    onToggleLayouts: () => void
    onToggleConfig: () => void
  } = $props()

  let search = $state('')
  let activeFilter = $state<string>('all')

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'working', label: 'Working' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'idle', label: 'Idle' },
    { key: 'favorites', label: '⭐ Favorites' }
  ] as const

  function handleSearch() {
    searchQuery.set(search)
  }

  function setFilter(key: string) {
    activeFilter = key
    statusFilter.set(key as any)
  }
</script>

<div class="titlebar">
  <div class="titlebar-left">
    <span class="app-title">🍽 Buffet</span>
    <span class="unit-count">{get(units).length} units</span>
  </div>
  <div class="titlebar-right">
    <input
      class="search-input"
      type="text"
      placeholder="🔍 Search units..."
      bind:value={search}
      oninput={handleSearch}
    />
    <button class="spawn-btn" onclick={onSpawn}>+ Spawn</button>
  </div>
</div>

<div class="toolbar">
  <span class="filter-label">Filter:</span>
  {#each filters as f}
    <button
      class="filter-chip"
      class:active={activeFilter === f.key}
      onclick={() => setFilter(f.key)}
    >
      {f.label}
    </button>
  {/each}
  <div class="spacer"></div>
  <button class="toolbar-btn" onclick={onToggleLayouts}>📐 Layouts</button>
  <button class="toolbar-btn" onclick={onToggleConfig}>⚙ Config</button>
</div>

<style>
  .titlebar {
    background: var(--bg-secondary);
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    -webkit-app-region: drag;
  }

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .app-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--accent);
  }

  .unit-count {
    color: var(--text-muted);
    font-size: 12px;
  }

  .titlebar-right {
    display: flex;
    gap: 8px;
    -webkit-app-region: no-drag;
  }

  .search-input {
    background: var(--bg-action);
    border: 1px solid #1a4080;
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 13px;
    color: var(--text-secondary);
    width: 200px;
    outline: none;
  }

  .search-input:focus {
    border-color: var(--info);
  }

  .spawn-btn {
    background: var(--accent);
    border: none;
    border-radius: 6px;
    padding: 4px 12px;
    color: white;
    font-size: 13px;
    cursor: pointer;
  }

  .spawn-btn:hover {
    opacity: 0.9;
  }

  .toolbar {
    background: var(--bg-secondary);
    padding: 6px 16px;
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    align-items: center;
  }

  .filter-label {
    font-size: 11px;
    color: var(--text-muted);
    margin-right: 4px;
  }

  .filter-chip {
    background: transparent;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 11px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .filter-chip.active {
    background: var(--bg-action);
    border-color: var(--info);
    color: var(--info);
  }

  .toolbar-btn {
    background: transparent;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 11px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .toolbar-btn:hover {
    border-color: var(--text-secondary);
    color: var(--text-secondary);
  }

  .spacer {
    flex: 1;
  }
</style>
