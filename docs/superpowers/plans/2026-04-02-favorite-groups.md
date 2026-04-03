# Favorite Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD for favorite groups with tagging model (favorites in multiple groups), displayed as collapsible sections in the Dashboard favorites view.

**Architecture:** Groups store favorite IDs (not inline configs) to avoid duplication and support multi-group membership. ConfigService handles persistence with migration from old schema. Dashboard replaces FavoritesPanel as the group management UI.

**Tech Stack:** Svelte 5 ($props/$state), Electron IPC, JSON file persistence

**Note:** No test framework is configured. Each task includes manual verification steps.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/shared/types.ts` | Modify | Update `FavoriteGroup` interface |
| `src/main/services/config.ts` | Modify | Migration logic, dangling ID cleanup |
| `src/renderer/components/Dashboard.svelte` | Modify | Grouped favorites view with collapsible sections |
| `src/renderer/components/FavoriteCard.svelte` | Modify | Add "Add to Group" and conditional "Remove" |
| `src/renderer/components/GroupPicker.svelte` | Create | Dropdown for assigning favorites to groups |
| `src/renderer/App.svelte` | Modify | Group CRUD handlers, remove FavoritesPanel |
| `src/renderer/components/Toolbar.svelte` | Modify | Remove FavoritesPanel toggle if present |
| `src/renderer/components/FavoritesPanel.svelte` | Delete | Replaced by Dashboard grouped view |

---

### Task 1: Update FavoriteGroup Type

**Files:**
- Modify: `src/shared/types.ts:48-55`

- [ ] **Step 1: Update the FavoriteGroup interface**

Replace the current `FavoriteGroup` interface with the ID-based version:

```typescript
export interface FavoriteGroup {
  id: string
  name: string
  favoriteIds: string[]
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Type errors in files that reference `FavoriteGroup.units` — this is expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: update FavoriteGroup to use ID-based references"
```

---

### Task 2: Add Migration and Cleanup to ConfigService

**Files:**
- Modify: `src/main/services/config.ts:44-49`

- [ ] **Step 1: Update getFavorites() with migration and cleanup**

Replace the `getFavorites` method and add a migration helper. The migration converts old `{ name, units }` groups to `{ id, name, favoriteIds }` by matching unit configs against existing favorite records.

```typescript
getFavorites(): FavoriteGroup[] {
  const raw = readJson<any[]>('favorites.json', [])
  const favs = this.getFavoriteRecords()
  let migrated = false

  const groups: FavoriteGroup[] = raw.map((g: any) => {
    // Already new format
    if (Array.isArray(g.favoriteIds)) {
      return { id: g.id, name: g.name, favoriteIds: g.favoriteIds }
    }
    // Old format: convert units[] to favoriteIds[]
    migrated = true
    const ids = (g.units || [])
      .map((u: any) => {
        const match = favs.find(
          f => f.name === u.name && f.shell === u.shell && f.cwd === u.cwd
        )
        return match?.id
      })
      .filter(Boolean) as string[]
    return { id: crypto.randomUUID(), name: g.name, favoriteIds: ids }
  })

  // Clean dangling references
  const validIds = new Set(favs.map(f => f.id))
  let cleaned = false
  for (const group of groups) {
    const before = group.favoriteIds.length
    group.favoriteIds = group.favoriteIds.filter(id => validIds.has(id))
    if (group.favoriteIds.length !== before) cleaned = true
  }

  if (migrated || cleaned) {
    this.saveFavorites(groups)
  }

  return groups
}
```

- [ ] **Step 2: Update exportAll to include favorite records**

The `exportAll` method should also export `favoriteRecords` so import/export round-trips correctly:

```typescript
exportAll(): string {
  return JSON.stringify({
    config: this.load(),
    favorites: this.getFavorites(),
    favoriteRecords: this.getFavoriteRecords(),
    layouts: this.getLayouts()
  }, null, 2)
}

importAll(json: string): void {
  const data = JSON.parse(json)
  if (data.config) this.save(data.config)
  if (data.favorites) this.saveFavorites(data.favorites)
  if (data.favoriteRecords) this.saveFavoriteRecords(data.favoriteRecords)
  if (data.layouts) this.saveLayouts(data.layouts)
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Compiles (ConfigService methods now match the updated type).

- [ ] **Step 4: Commit**

```bash
git add src/main/services/config.ts
git commit -m "feat: add FavoriteGroup migration and dangling ID cleanup"
```

---

### Task 3: Create GroupPicker Component

**Files:**
- Create: `src/renderer/components/GroupPicker.svelte`

This is a dropdown/popover that shows all groups with checkboxes, letting the user toggle which groups a favorite belongs to.

- [ ] **Step 1: Create the GroupPicker component**

```svelte
<script lang="ts">
  import type { FavoriteGroup } from '../../shared/types'

  let { groups, favoriteId, onToggle, onClose }: {
    groups: FavoriteGroup[]
    favoriteId: string
    onToggle: (groupId: string, favoriteId: string) => void
    onClose: () => void
  } = $props()

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }
</script>

<div class="picker-overlay" onclick={onClose} onkeydown={handleKeydown} role="presentation">
  <div class="picker" onclick={(e) => e.stopPropagation()} role="listbox" tabindex="-1">
    {#if groups.length === 0}
      <div class="picker-empty">No groups yet</div>
    {:else}
      {#each groups as group (group.id)}
        <label class="picker-item">
          <input
            type="checkbox"
            checked={group.favoriteIds.includes(favoriteId)}
            onchange={() => onToggle(group.id, favoriteId)}
          />
          <span>{group.name}</span>
        </label>
      {/each}
    {/if}
  </div>
</div>

<style>
  .picker-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
  }

  .picker {
    position: absolute;
    background: var(--bg-secondary);
    border: 1px solid var(--border-focus);
    border-radius: 6px;
    padding: 6px 0;
    min-width: 180px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }

  .picker-empty {
    padding: 10px 14px;
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .picker-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--text-primary);
  }

  .picker-item:hover {
    background: var(--bg-action);
  }

  .picker-item input[type="checkbox"] {
    accent-color: var(--accent);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/GroupPicker.svelte
git commit -m "feat: add GroupPicker dropdown component"
```

---

### Task 4: Update FavoriteCard with Group Actions

**Files:**
- Modify: `src/renderer/components/FavoriteCard.svelte`

- [ ] **Step 1: Add group-related props and state**

Update the script section to add new props for group actions and state for the picker:

```svelte
<script lang="ts">
  import type { Favorite, FavoriteGroup } from '../../shared/types'
  import GroupPicker from './GroupPicker.svelte'

  let { favorite, runningCount, groups, groupId, onSpawn, onDelete, onRename, onToggleGroup, onRemoveFromGroup }: {
    favorite: Favorite
    runningCount: number
    groups: FavoriteGroup[]
    groupId?: string
    onSpawn: () => void
    onDelete: () => void
    onRename: (id: string, name: string) => void
    onToggleGroup: (groupId: string, favoriteId: string) => void
    onRemoveFromGroup?: (groupId: string, favoriteId: string) => void
  } = $props()

  let editing = $state(false)
  let editName = $state('')
  let showGroupPicker = $state(false)
  let pickerAnchor = $state<{ x: number; y: number } | null>(null)

  function startEditing() {
    editName = favorite.name
    editing = true
  }

  function commitEdit() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== favorite.name) {
      onRename(favorite.id, trimmed)
    }
    editing = false
  }

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      editing = false
    }
  }

  function focus(node: HTMLElement) {
    node.focus()
    if (node instanceof HTMLInputElement) node.select()
  }

  function openGroupPicker(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    pickerAnchor = { x: rect.left, y: rect.bottom + 4 }
    showGroupPicker = true
  }
</script>
```

- [ ] **Step 2: Update the template**

Replace the entire template (everything between `</script>` and `<style>`):

```svelte
<div class="fav-card">
  <div class="card-header">
    <div class="card-info">
      {#if editing}
        <input
          class="card-name-input"
          type="text"
          bind:value={editName}
          onblur={commitEdit}
          onkeydown={handleEditKeydown}
          use:focus
        />
      {:else}
        <span class="card-name" role="button" tabindex="0" onclick={startEditing} onkeydown={(e) => e.key === 'Enter' && startEditing()} title="Click to rename">{favorite.name}</span>
      {/if}
      <span class="card-meta">{favorite.shell} &middot; {favorite.cwd}</span>
    </div>
    <span class="card-badge">{favorite.shell}</span>
  </div>

  {#if runningCount > 0}
    <div class="running-indicator">{runningCount} running</div>
  {/if}

  <div class="card-actions">
    <button class="action-btn spawn" onclick={onSpawn}>Spawn</button>
    <button class="action-btn" onclick={openGroupPicker}>Add to Group</button>
    {#if groupId && onRemoveFromGroup}
      <button class="action-btn danger" onclick={() => onRemoveFromGroup(groupId, favorite.id)}>Remove</button>
    {/if}
    {#if !groupId}
      <div class="spacer"></div>
      <button class="action-btn danger" onclick={onDelete}>Delete</button>
    {/if}
  </div>
</div>

{#if showGroupPicker && pickerAnchor}
  <GroupPicker
    {groups}
    favoriteId={favorite.id}
    onToggle={onToggleGroup}
    onClose={() => showGroupPicker = false}
  />
{/if}
```

- [ ] **Step 3: Update the styles**

Replace the entire `<style>` block with styles that match the existing card design:

```svelte
<style>
  .fav-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.15s;
  }

  .fav-card:hover {
    border-color: var(--border-focus);
  }

  .card-header {
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .card-name {
    font-weight: 600;
    font-size: var(--text-lg);
    cursor: text;
  }

  .card-name:hover {
    color: var(--accent);
  }

  .card-name-input {
    font-weight: 600;
    font-size: var(--text-lg);
    background: var(--bg-primary);
    border: 1px solid var(--border-focus);
    border-radius: 4px;
    padding: 2px 6px;
    color: var(--text-primary);
    outline: none;
    width: 100%;
  }

  .card-meta {
    font-size: var(--text-sm);
    color: var(--text-muted);
  }

  .card-badge {
    font-size: var(--text-xs);
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 10px;
    background: var(--bg-action);
    color: var(--text-muted);
  }

  .running-indicator {
    padding: 2px 18px 8px;
    font-size: var(--text-sm);
    color: var(--success);
    font-weight: 500;
  }

  .card-actions {
    padding: 8px 18px;
    background: var(--bg-secondary);
    display: flex;
    gap: 8px;
    border-top: 1px solid var(--border);
  }

  .action-btn {
    background: var(--bg-action);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 12px;
    color: var(--info);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
  }

  .action-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--info);
  }

  .action-btn.spawn {
    color: var(--success);
  }

  .action-btn.spawn:hover {
    border-color: var(--success);
  }

  .action-btn.danger {
    background: #2a1a1a;
    border-color: #4a2a2a;
    color: var(--danger);
  }

  .action-btn.danger:hover {
    background: #3a2020;
    border-color: var(--danger);
  }

  .spacer {
    flex: 1;
  }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/FavoriteCard.svelte
git commit -m "feat: add group actions to FavoriteCard"
```

---

### Task 5: Update Dashboard with Grouped Favorites View

**Files:**
- Modify: `src/renderer/components/Dashboard.svelte`

- [ ] **Step 1: Update the script section**

Replace the entire `<script>` block. The Dashboard now receives groups and group-management callbacks:

```svelte
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
```

- [ ] **Step 2: Update the template**

Replace everything between `</script>` and `<style>`:

```svelte
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
            <p class="collapsed-hint">Collapsed &mdash; click arrow to expand</p>
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
```

- [ ] **Step 3: Update the styles**

Replace the entire `<style>` block — keep existing styles and add group-specific ones:

```svelte
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

  /* Favorites header */
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

  /* Group sections */
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
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/Dashboard.svelte
git commit -m "feat: add grouped favorites view to Dashboard"
```

---

### Task 6: Wire Group CRUD Handlers in App.svelte

**Files:**
- Modify: `src/renderer/App.svelte`

- [ ] **Step 1: Add group state and handlers**

In the `<script>` section, after the existing `favs` state declaration (line 19-20), add:

```typescript
let grps = $state<FavoriteGroup[]>([])
favoriteGroups.subscribe(v => grps = v)
```

Add the import for `favoriteGroups` and `refreshFavorites` — update the existing import from `stores/config`:

```typescript
import { favoriteRecords, favoriteGroups, refreshFavoriteRecords, refreshFavorites } from './stores/config'
```

Add the import for `FavoriteGroup` to the types import:

```typescript
import type { Favorite, FavoriteGroup, ShellType, Unit } from '../shared/types'
```

Update the `$effect` to also refresh groups:

```typescript
$effect(() => {
  refreshUnits()
  refreshFavoriteRecords()
  refreshFavorites()
  const cleanup = setupUnitListeners()
  return cleanup
})
```

Add group CRUD handler functions after the existing handlers:

```typescript
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
```

- [ ] **Step 2: Update the Dashboard component usage in the template**

Replace the existing `<Dashboard ... />` element with:

```svelte
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
/>
```

- [ ] **Step 3: Remove FavoritesPanel references**

Remove the `FavoritesPanel` import at the top of the script:
```typescript
// DELETE: import FavoritesPanel from './components/FavoritesPanel.svelte'
```

Remove the `showFavorites` state variable:
```typescript
// DELETE: let showFavorites = $state(false)
```

Remove the FavoritesPanel block from the template:
```svelte
<!-- DELETE this entire block: -->
{#if showFavorites}
  <FavoritesPanel onClose={() => showFavorites = false} />
{/if}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.svelte
git commit -m "feat: wire group CRUD handlers in App.svelte, remove FavoritesPanel"
```

---

### Task 7: Clean Up Toolbar and Delete FavoritesPanel

**Files:**
- Modify: `src/renderer/components/Toolbar.svelte` (if it has a FavoritesPanel toggle)
- Delete: `src/renderer/components/FavoritesPanel.svelte`

- [ ] **Step 1: Check Toolbar for FavoritesPanel references**

The current `Toolbar.svelte` does not have a FavoritesPanel toggle button (confirmed by reading the file — it only has Layouts and Config buttons). No changes needed to `Toolbar.svelte`.

- [ ] **Step 2: Delete FavoritesPanel**

```bash
git rm src/renderer/components/FavoritesPanel.svelte
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove FavoritesPanel (replaced by Dashboard grouped view)"
```

---

### Task 8: End-to-End Verification

- [ ] **Step 1: Start the app**

Run: `npm run dev`

- [ ] **Step 2: Test group creation**

1. Switch to the "Favorites" filter in the toolbar
2. Click "+ New Group", type "Web Dev", press Enter
3. Verify the "Web Dev" group appears as an empty collapsible section

- [ ] **Step 3: Test adding favorites to groups**

1. Switch to "All" filter, spawn a terminal, star it (toggle favorite)
2. Switch to "Favorites" filter — the favorite should appear under "Ungrouped"
3. Click "Add to Group" on the card, check "Web Dev"
4. Verify the card now appears in the "Web Dev" group section

- [ ] **Step 4: Test multi-group membership**

1. Create a second group "Monitoring"
2. Click "Add to Group" on the same favorite, also check "Monitoring"
3. Verify the favorite appears in both groups

- [ ] **Step 5: Test remove from group**

1. In a group section, click "Remove" on a favorite card
2. Verify it's removed from that group but still exists (appears in "Ungrouped" if not in any other group)

- [ ] **Step 6: Test group rename and delete**

1. Click "..." on a group → "Rename", change name, press Enter
2. Verify name updates
3. Click "..." on a group → "Delete"
4. Verify group is gone, favorites still exist

- [ ] **Step 7: Test batch launch**

1. Add 2+ favorites to a group
2. Click "Launch All" on the group header
3. Verify all terminals spawn

- [ ] **Step 8: Test persistence**

1. Restart the app (`Ctrl+C`, `npm run dev`)
2. Verify all groups, memberships, and favorites survive restart

- [ ] **Step 9: Commit all remaining changes**

If any fixes were needed during verification:
```bash
git add -A
git commit -m "fix: adjustments from end-to-end verification"
```
