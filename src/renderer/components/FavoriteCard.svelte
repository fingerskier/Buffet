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
