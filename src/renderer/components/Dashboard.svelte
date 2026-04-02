<script lang="ts">
  import UnitCard from './UnitCard.svelte'
  import { filteredUnits } from '../stores/units'

  let { onInject, onFocus, onKill, onAnalyze, onToggleFavorite }: {
    onInject: (pid: number) => void
    onFocus: (pid: number) => void
    onKill: (pid: number) => void
    onAnalyze: (pid: number) => void
    onToggleFavorite: (pid: number) => void
  } = $props()

  let unitList = $state<any[]>([])
  filteredUnits.subscribe(v => unitList = v)
</script>

<div class="dashboard">
  {#if unitList.length === 0}
    <div class="empty-state">
      <p class="empty-icon">🍽</p>
      <p class="empty-title">No terminals yet</p>
      <p class="empty-hint">Click <strong>+ Spawn</strong> to launch a terminal</p>
    </div>
  {:else}
    <div class="card-grid">
      {#each unitList as unit (unit.pid)}
        <UnitCard
          {unit}
          {onInject}
          {onFocus}
          {onKill}
          {onAnalyze}
          {onToggleFavorite}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .dashboard {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .empty-hint {
    font-size: 13px;
  }
</style>
