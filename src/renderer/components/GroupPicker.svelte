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
  <div class="picker" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="listbox" tabindex="-1">
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
