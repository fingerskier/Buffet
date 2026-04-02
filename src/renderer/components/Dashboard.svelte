<script lang="ts">
  import UnitCard from './UnitCard.svelte'
  import FavoriteCard from './FavoriteCard.svelte'
  import { filteredUnits, statusFilter } from '../stores/units'
  import type { Favorite, FavoriteGroup, Unit } from '../../shared/types'

  let {
    onInject, onFocus, onKill, onAnalyze, onToggleFavorite, onRenameUnit,
    onRenameFavorite, onSpawnFavorite, onDeleteFavorite,
    favorites, groups,
    onCreateGroup, onRenameGroup, onDeleteGroup,
    onToggleGroupMembership, onRemoveFromGroup, onLaunchGroup
  }: {
    onInject: (pid: number) => void
    onFocus: (pid: number) => void
    onKill: (pid: number) => void
    onAnalyze: (pid: number) => void
    onToggleFavorite: (pid: number) => void
    onRenameUnit: (pid: number, name: string) => void
    onRenameFavorite: (id: string, name: string) => void
    onSpawnFavorite: (fav: Favorite) => void
    onDeleteFavorite: (id: string) => void
    favorites: Favorite[]
    groups: FavoriteGroup[]
    onCreateGroup: (name: string) => void
    onRenameGroup: (id: string, name: string) => void
    onDeleteGroup: (id: string) => void
    onToggleGroupMembership: (groupId: string, favoriteId: string) => void
    onRemoveFromGroup: (groupId: string, favoriteId: string) => void
    onLaunchGroup: (groupId: string) => void
  } = $props()

  let unitList = $state<Unit[]>([])
  let activeFilter = $state('all')
  filteredUnits.subscribe(v => unitList = v)
  statusFilter.subscribe(v => activeFilter = v)

  let collapsedGroups = $state<Set<string>>(new Set())
  let creatingGroup = $state(false)
  let newGroupName = $state('')
  let editingGroupId = $state<string | null>(null)
  let editGroupName = $state('')
  let menuGroupId = $state<string | null>(null)

  function isFavorite(unit: Unit): boolean {
    return favorites.some(f => f.name === unit.name && f.shell === unit.shell && f.cwd === unit.cwd)
  }

  function toggleCollapse(groupId: string) {
    const next = new Set(collapsedGroups)
    if (next.has(groupId)) next.delete(groupId)
    else next.add(groupId)
    collapsedGroups = next
  }

  function submitNewGroup() {
    const trimmed = newGroupName.trim()
    if (trimmed) {
      onCreateGroup(trimmed)
      newGroupName = ''
    }
    creatingGroup = false
  }

  function startGroupRename(groupId: string, currentName: string) {
    editingGroupId = groupId
    editGroupName = currentName
    menuGroupId = null
  }

  function commitGroupRename() {
    if (editingGroupId && editGroupName.trim()) {
      onRenameGroup(editingGroupId, editGroupName.trim())
    }
    editingGroupId = null
  }

  function ungroupedFavorites(): Favorite[] {
    const groupedIds = new Set(groups.flatMap(g => g.favoriteIds))
    return favorites.filter(f => !groupedIds.has(f.id))
  }

  function favoritesForGroup(group: FavoriteGroup): Favorite[] {
    return group.favoriteIds
      .map(id => favorites.find(f => f.id === id))
      .filter(Boolean) as Favorite[]
  }

  function runningCount(fav: Favorite): number {
    return unitList.filter(u => u.name === fav.name && u.shell === fav.shell && u.cwd === fav.cwd).length
  }

  function focusInput(node: HTMLElement) {
    node.focus()
    if (node instanceof HTMLInputElement) node.select()
  }
</script>

<div class="dashboard">
  <img src="/favicon.svg" alt="" class="bg-logo" />
  {#if activeFilter === 'favorites'}
    {#if favorites.length === 0 && groups.length === 0}
      <div class="empty-state">
        <img src="/favicon.svg" alt="Buffet" class="empty-logo" />
        <p class="empty-title">No favorites yet</p>
        <p class="empty-hint">Star a unit with &#9734; to save it as a favorite</p>
      </div>
    {:else}
      <!-- Header with + New Group -->
      <div class="fav-header">
        <span class="fav-header-label">Favorites</span>
        {#if creatingGroup}
          <input
            class="new-group-input"
            type="text"
            placeholder="Group name..."
            bind:value={newGroupName}
            onkeydown={(e) => { if (e.key === 'Enter') submitNewGroup(); if (e.key === 'Escape') creatingGroup = false; }}
            onblur={submitNewGroup}
            use:focusInput
          />
        {:else}
          <button class="new-group-btn" onclick={() => creatingGroup = true}>+ New Group</button>
        {/if}
      </div>

      <!-- Ungrouped favorites -->
      {#if ungroupedFavorites().length > 0}
        <div class="group-section">
          <div class="group-header">
            <span class="group-label">Ungrouped</span>
            <span class="group-count">{ungroupedFavorites().length} favorites</span>
          </div>
          <div class="card-grid">
            {#each ungroupedFavorites() as fav (fav.id)}
              <FavoriteCard
                favorite={fav}
                runningCount={runningCount(fav)}
                {groups}
                onSpawn={() => onSpawnFavorite(fav)}
                onDelete={() => onDeleteFavorite(fav.id)}
                onRename={onRenameFavorite}
                onToggleGroup={onToggleGroupMembership}
              />
            {/each}
          </div>
        </div>
      {/if}

      <!-- Named groups -->
      {#each groups as group (group.id)}
        <div class="group-section">
          <div class="group-header">
            <button class="collapse-btn" onclick={() => toggleCollapse(group.id)}>
              {collapsedGroups.has(group.id) ? '\u25B6' : '\u25BC'}
            </button>
            {#if editingGroupId === group.id}
              <input
                class="group-name-input"
                type="text"
                bind:value={editGroupName}
                onkeydown={(e) => { if (e.key === 'Enter') commitGroupRename(); if (e.key === 'Escape') editingGroupId = null; }}
                onblur={commitGroupRename}
                use:focusInput
              />
            {:else}
              <span class="group-name">{group.name}</span>
            {/if}
            <span class="group-count">{favoritesForGroup(group).length} favorites</span>
            <div class="spacer"></div>
            <button class="launch-btn" onclick={() => onLaunchGroup(group.id)}>Launch All</button>
            <div class="menu-anchor">
              <button class="menu-btn" onclick={() => menuGroupId = menuGroupId === group.id ? null : group.id}>&hellip;</button>
              {#if menuGroupId === group.id}
                <div class="menu-dropdown">
                  <button class="menu-item" onclick={() => startGroupRename(group.id, group.name)}>Rename</button>
                  <button class="menu-item danger" onclick={() => { onDeleteGroup(group.id); menuGroupId = null; }}>Delete</button>
                </div>
              {/if}
            </div>
          </div>
          {#if !collapsedGroups.has(group.id)}
            {#if favoritesForGroup(group).length === 0}
              <p class="group-empty">No favorites in this group. Use "Add to Group" on a favorite card.</p>
            {:else}
              <div class="card-grid">
                {#each favoritesForGroup(group) as fav (fav.id)}
                  <FavoriteCard
                    favorite={fav}
                    runningCount={runningCount(fav)}
                    {groups}
                    groupId={group.id}
                    onSpawn={() => onSpawnFavorite(fav)}
                    onDelete={() => onDeleteFavorite(fav.id)}
                    onRename={onRenameFavorite}
                    onToggleGroup={onToggleGroupMembership}
                    {onRemoveFromGroup}
                  />
                {/each}
              </div>
            {/if}
          {:else}
            <p class="collapsed-hint">Collapsed — click arrow to expand</p>
          {/if}
        </div>
      {/each}
    {/if}
  {:else if unitList.length === 0}
    <div class="empty-state">
      <img src="/favicon.svg" alt="Buffet" class="empty-logo" />
      <p class="empty-title">No terminals yet</p>
      <p class="empty-hint">Click <strong>+ Spawn</strong> to launch a terminal</p>
    </div>
  {:else}
    <div class="card-grid">
      {#each unitList as unit (unit.pid)}
        <UnitCard
          {unit}
          isFavorite={isFavorite(unit)}
          {onInject}
          {onFocus}
          {onKill}
          {onAnalyze}
          {onToggleFavorite}
          onRename={onRenameUnit}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .dashboard {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
    position: relative;
  }

  .bg-logo {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 360px;
    height: 360px;
    opacity: 0.04;
    pointer-events: none;
    user-select: none;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-md);
    position: relative;
    z-index: 1;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    position: relative;
    z-index: 1;
  }

  .empty-logo {
    width: 200px;
    height: 200px;
    margin-bottom: var(--space-lg);
    opacity: 0.3;
  }

  .empty-title {
    font-size: var(--text-2xl);
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--space-xs);
  }

  .empty-hint {
    font-size: var(--text-base);
  }

  .fav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    padding: 10px 14px;
    background: var(--bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--border);
    position: relative;
    z-index: 1;
  }

  .fav-header-label {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .new-group-btn {
    background: var(--bg-action);
    border: 1px solid var(--border);
    color: var(--info);
    padding: 5px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: var(--text-sm);
  }

  .new-group-btn:hover {
    border-color: var(--info);
  }

  .new-group-input {
    background: var(--bg-primary);
    border: 1px solid var(--border-focus);
    border-radius: 4px;
    padding: 5px 10px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
    width: 200px;
  }

  .group-section {
    margin-bottom: var(--space-lg);
    position: relative;
    z-index: 1;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
  }

  .group-label {
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .group-name {
    font-weight: 600;
    color: var(--text-secondary);
  }

  .group-name-input {
    font-weight: 600;
    background: var(--bg-primary);
    border: 1px solid var(--border-focus);
    border-radius: 4px;
    padding: 2px 6px;
    color: var(--text-primary);
    outline: none;
  }

  .group-count {
    color: var(--text-muted);
    font-size: var(--text-xs);
  }

  .group-empty {
    color: var(--text-muted);
    font-size: var(--text-sm);
    font-style: italic;
    padding: 8px 0;
  }

  .collapsed-hint {
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-style: italic;
    padding: 8px 0;
  }

  .collapse-btn {
    background: none;
    border: none;
    color: var(--info);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
  }

  .launch-btn {
    background: #1a2a1a;
    border: 1px solid #2a3a2a;
    color: var(--success);
    padding: 3px 10px;
    border-radius: 3px;
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .launch-btn:hover {
    border-color: var(--success);
  }

  .menu-anchor {
    position: relative;
  }

  .menu-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
  }

  .menu-btn:hover {
    color: var(--text-primary);
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--bg-secondary);
    border: 1px solid var(--border-focus);
    border-radius: 6px;
    padding: 4px 0;
    min-width: 120px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    z-index: 50;
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 8px 14px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: var(--text-sm);
    cursor: pointer;
    text-align: left;
  }

  .menu-item:hover {
    background: var(--bg-action);
  }

  .menu-item.danger {
    color: var(--danger);
  }

  .spacer {
    flex: 1;
  }
</style>
