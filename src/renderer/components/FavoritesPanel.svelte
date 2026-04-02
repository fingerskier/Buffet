<script lang="ts">
  import { favoriteGroups, refreshFavorites } from '../stores/config'
  import { units } from '../stores/units'
  import type { FavoriteGroup, ShellType } from '../../shared/types'

  let { onClose }: { onClose: () => void } = $props()

  let groups = $state<FavoriteGroup[]>([])
  let newGroupName = $state('')

  const api = (window as any).api

  favoriteGroups.subscribe(v => groups = v)

  async function createGroup() {
    if (!newGroupName.trim()) return
    let currentUnits: any[] = []
    units.subscribe(v => currentUnits = v)()

    const favoriteUnits = currentUnits.filter(u => u.isFavorite)
    const group: FavoriteGroup = {
      name: newGroupName,
      units: favoriteUnits.map(u => ({
        name: u.name,
        shell: u.shell,
        cwd: u.cwd
      }))
    }

    groups = [...groups, group]
    await api.config.saveFavorites(groups)
    newGroupName = ''
    await refreshFavorites()
  }

  async function launchGroup(group: FavoriteGroup) {
    for (const u of group.units) {
      await api.terminal.spawn(u.shell, u.name, u.cwd)
    }
  }

  async function deleteGroup(name: string) {
    groups = groups.filter(g => g.name !== name)
    await api.config.saveFavorites(groups)
    await refreshFavorites()
  }

  $effect(() => {
    refreshFavorites()
  })
</script>

<div class="overlay" onclick={onClose} role="presentation">
  <div class="panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" tabindex="-1">
    <h3>⭐ Favorite Groups</h3>

    <div class="create-row">
      <input
        type="text"
        bind:value={newGroupName}
        placeholder="Group name..."
        onkeydown={(e) => e.key === 'Enter' && createGroup()}
      />
      <button class="create-btn" onclick={createGroup}>Create from ⭐</button>
    </div>
    <p class="hint">Creates a group from currently starred units</p>

    {#if groups.length === 0}
      <p class="empty">No favorite groups yet</p>
    {:else}
      <div class="group-list">
        {#each groups as group}
          <div class="group-item">
            <div class="group-info">
              <span class="group-name">{group.name}</span>
              <span class="group-meta">{group.units.length} units: {group.units.map(u => u.name).join(', ')}</span>
            </div>
            <div class="group-actions">
              <button class="launch-btn" onclick={() => launchGroup(group)}>Launch All</button>
              <button class="delete-btn" onclick={() => deleteGroup(group.name)}>✕</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: flex-end;
    z-index: 100;
  }

  .panel {
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    width: 360px;
    height: 100vh;
    padding: 20px;
    overflow-y: auto;
  }

  h3 {
    margin-bottom: 16px;
  }

  .create-row {
    display: flex;
    gap: 8px;
  }

  .create-row input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 10px;
    color: var(--text-primary);
    font-size: 12px;
    outline: none;
  }

  .create-btn {
    background: var(--warning);
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    color: #1a1a2e;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .hint {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
    margin-bottom: 16px;
  }

  .empty {
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
    padding: 20px;
  }

  .group-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .group-item {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
  }

  .group-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
  }

  .group-name {
    font-size: 13px;
    font-weight: 600;
  }

  .group-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .group-actions {
    display: flex;
    gap: 6px;
  }

  .launch-btn {
    background: var(--success);
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    color: white;
    font-size: 11px;
    cursor: pointer;
  }

  .delete-btn {
    background: transparent;
    border: 1px solid #5a2040;
    border-radius: 4px;
    padding: 4px 8px;
    color: var(--danger);
    font-size: 11px;
    cursor: pointer;
  }
</style>
