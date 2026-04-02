<script lang="ts">
  import UnitCard from './UnitCard.svelte'
  import FavoriteCard from './FavoriteCard.svelte'
  import { filteredUnits, statusFilter } from '../stores/units'
  import type { Favorite, Unit } from '../../shared/types'

  let { onInject, onFocus, onKill, onAnalyze, onToggleFavorite, onSpawnFavorite, onDeleteFavorite, favorites }: {
    onInject: (pid: number) => void
    onFocus: (pid: number) => void
    onKill: (pid: number) => void
    onAnalyze: (pid: number) => void
    onToggleFavorite: (pid: number) => void
    onSpawnFavorite: (fav: Favorite) => void
    onDeleteFavorite: (id: string) => void
    favorites: Favorite[]
  } = $props()

  let unitList = $state<Unit[]>([])
  let activeFilter = $state('all')
  filteredUnits.subscribe(v => unitList = v)
  statusFilter.subscribe(v => activeFilter = v)

  function isFavorite(unit: Unit): boolean {
    return favorites.some(f => f.name === unit.name && f.shell === unit.shell && f.cwd === unit.cwd)
  }

  function runningCount(fav: Favorite): number {
    return unitList.some(() => false) ? 0 : // force reactivity on unitList
      unitList.filter(u => u.name === fav.name && u.shell === fav.shell && u.cwd === fav.cwd).length
  }
</script>

<div class="dashboard">
  {#if activeFilter === 'favorites'}
    {#if favorites.length === 0}
      <div class="empty-state">
        <p class="empty-icon">★</p>
        <p class="empty-title">No favorites yet</p>
        <p class="empty-hint">Star a unit with ☆ to save it as a favorite</p>
      </div>
    {:else}
      <div class="card-grid">
        {#each favorites as fav (fav.id)}
          <FavoriteCard
            favorite={fav}
            runningCount={unitList.filter(u => u.name === fav.name && u.shell === fav.shell && u.cwd === fav.cwd).length}
            onSpawn={() => onSpawnFavorite(fav)}
            onDelete={() => onDeleteFavorite(fav.id)}
          />
        {/each}
      </div>
    {/if}
  {:else if unitList.length === 0}
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
          isFavorite={isFavorite(unit)}
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
