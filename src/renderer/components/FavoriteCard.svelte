<script lang="ts">
  import type { Favorite } from '../../shared/types'

  let { favorite, runningCount, onSpawn, onDelete }: {
    favorite: Favorite
    runningCount: number
    onSpawn: () => void
    onDelete: () => void
  } = $props()
</script>

<div class="fav-card">
  <div class="card-header">
    <div class="card-info">
      <span class="card-name">★ {favorite.name}</span>
      <span class="card-meta">{favorite.shell} · {favorite.cwd || 'default dir'}</span>
    </div>
    {#if runningCount > 0}
      <span class="running-badge">{runningCount} running</span>
    {/if}
  </div>

  <div class="card-actions">
    <button class="spawn-btn" onclick={onSpawn}>Spawn</button>
    <div class="spacer"></div>
    <button class="delete-btn" onclick={onDelete}>✕</button>
  </div>
</div>

<style>
  .fav-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .card-header {
    padding: 12px 14px;
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
    font-size: 14px;
    color: var(--warning);
  }

  .card-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .running-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--success);
    color: white;
  }

  .card-actions {
    padding: 6px 14px;
    background: #162035;
    display: flex;
    gap: 6px;
    border-top: 1px solid var(--border);
    align-items: center;
  }

  .spawn-btn {
    background: var(--success);
    border: none;
    border-radius: 4px;
    padding: 2px 10px;
    color: white;
    font-size: 10px;
    cursor: pointer;
  }

  .spawn-btn:hover {
    opacity: 0.9;
  }

  .delete-btn {
    background: transparent;
    border: 1px solid #5a2040;
    border-radius: 4px;
    padding: 2px 8px;
    color: var(--danger);
    font-size: 10px;
    cursor: pointer;
  }

  .delete-btn:hover {
    background: #5a2040;
  }

  .spacer {
    flex: 1;
  }
</style>
