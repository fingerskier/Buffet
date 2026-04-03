<script lang="ts">
  import { searchQuery, statusFilter, units } from '../stores/units'
  import { get } from 'svelte/store'

  let { onSpawn, onToggleLayouts, onTogglePrompts, onToggleConfig }: {
    onSpawn: () => void
    onToggleLayouts: () => void
    onTogglePrompts: () => void
    onToggleConfig: () => void
  } = $props()

  let search = $state('')
  let activeFilter = $state<string>('all')

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'working', label: 'Working' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'idle', label: 'Idle' },
    { key: 'favorites', label: '★ Favorites' }
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
    <span class="app-title">Buffet</span>
    <span class="unit-count">{get(units).length} units</span>
  </div>
  <div class="titlebar-right">
    <input
      class="search-input"
      type="text"
      placeholder="Search units..."
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
  <button class="toolbar-btn" onclick={onToggleLayouts}>Layouts</button>
  <button class="toolbar-btn" onclick={onTogglePrompts}>Prompts</button>
  <button class="toolbar-btn" onclick={onToggleConfig}>Config</button>
</div>

<style>
  .titlebar {
    background: var(--bg-secondary);
    padding: 10px var(--space-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    -webkit-app-region: drag;
  }

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .app-title {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.02em;
  }

  .unit-count {
    color: var(--text-muted);
    font-size: var(--text-sm);
    background: var(--bg-action);
    padding: 2px 10px;
    border-radius: 10px;
  }

  .titlebar-right {
    display: flex;
    gap: var(--space-sm);
    -webkit-app-region: no-drag;
  }

  .search-input {
    background: var(--bg-action);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 14px;
    font-size: var(--text-base);
    color: var(--text-secondary);
    width: 280px;
    outline: none;
  }

  .search-input:focus {
    border-color: var(--border-focus);
  }

  .spawn-btn {
    background: var(--accent);
    border: none;
    border-radius: 6px;
    padding: 6px 16px;
    color: var(--bg-primary);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
  }

  .spawn-btn:hover {
    background: var(--accent-hover);
  }

  .toolbar {
    background: var(--bg-secondary);
    padding: 8px var(--space-md);
    display: flex;
    gap: var(--space-sm);
    border-bottom: 1px solid var(--border);
    align-items: center;
  }

  .filter-label {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin-right: var(--space-xs);
  }

  .filter-chip {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 6px 14px;
    font-size: var(--text-sm);
    color: var(--text-muted);
    cursor: pointer;
  }

  .filter-chip:hover {
    border-color: var(--text-secondary);
    color: var(--text-secondary);
  }

  .filter-chip.active {
    background: var(--bg-action);
    border-color: var(--accent);
    color: var(--accent);
  }

  .toolbar-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 6px 14px;
    font-size: var(--text-sm);
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
