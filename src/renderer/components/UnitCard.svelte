<script lang="ts">
  import type { Unit } from '../../shared/types'

  let { unit, onInject, onFocus, onKill, onAnalyze, onToggleFavorite }: {
    unit: Unit
    onInject: (pid: number) => void
    onFocus: (pid: number) => void
    onKill: (pid: number) => void
    onAnalyze: (pid: number) => void
    onToggleFavorite: (pid: number) => void
  } = $props()

  const stateColors: Record<string, string> = {
    working: 'var(--success)',
    waiting: 'var(--warning)',
    idle: 'var(--idle)',
    error: 'var(--danger)'
  }

  const stateLabels: Record<string, string> = {
    working: 'Working',
    waiting: 'Waiting',
    idle: 'Idle',
    error: 'Error'
  }
</script>

<div class="unit-card" class:has-error={unit.status.state === 'error'}>
  <div class="card-header">
    <div class="card-info">
      <span class="card-name">{unit.name}</span>
      <span class="card-meta">{unit.shell} · PID {unit.pid}</span>
    </div>
    <div class="card-badges">
      <button class="star-btn" class:active={unit.isFavorite} onclick={() => onToggleFavorite(unit.pid)}>
        {unit.isFavorite ? '⭐' : '☆'}
      </button>
      <span class="status-badge" style="background: {stateColors[unit.status.state]}; color: {unit.status.state === 'waiting' ? '#1a1a2e' : 'white'}">
        {stateLabels[unit.status.state]}
      </span>
    </div>
  </div>

  <div class="card-body">
    {#if unit.status.lastCommand}
      <div class="last-command">Last: <span class="command-text">{unit.status.lastCommand}</span></div>
    {/if}

    {#if unit.status.state === 'waiting'}
      <div class="status-alert warning">⚠ Waiting for input</div>
    {:else if unit.status.state === 'error'}
      <div class="status-alert error">✗ Has errors detected</div>
    {/if}

    <div class="resource-stats">
      <span>CPU: <span style="color: {unit.status.cpu > 5 ? 'var(--success)' : 'var(--idle)'}">{unit.status.cpu.toFixed(0)}%</span></span>
      <span>MEM: <span style="color: {unit.status.memory > 100 ? 'var(--warning)' : 'var(--idle)'}">{unit.status.memory}MB</span></span>
    </div>
  </div>

  <div class="card-actions">
    <button class="action-btn" onclick={() => onFocus(unit.pid)}>Focus</button>
    <button class="action-btn" onclick={() => onInject(unit.pid)}>Inject</button>
    <button class="action-btn" onclick={() => onAnalyze(unit.pid)}>Analyze</button>
    <div class="spacer"></div>
    <button class="action-btn danger" onclick={() => onKill(unit.pid)}>Kill</button>
  </div>
</div>

<style>
  .unit-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .unit-card.has-error {
    border-color: var(--danger);
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
  }

  .card-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .card-badges {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .star-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 2px 4px;
    opacity: 0.4;
    transition: opacity 0.15s, transform 0.15s;
  }

  .star-btn:hover {
    opacity: 0.8;
    transform: scale(1.2);
  }

  .star-btn.active {
    opacity: 1;
  }

  .star-btn.active:hover {
    transform: scale(1.2);
  }

  .status-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
  }

  .card-body {
    padding: 0 14px 8px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .last-command {
    margin-bottom: 4px;
  }

  .command-text {
    color: var(--info);
  }

  .status-alert {
    margin-top: 4px;
  }

  .status-alert.warning {
    color: var(--warning);
  }

  .status-alert.error {
    color: var(--danger);
  }

  .resource-stats {
    margin-top: 4px;
    display: flex;
    gap: 12px;
  }

  .card-actions {
    padding: 6px 14px;
    background: #162035;
    display: flex;
    gap: 6px;
    border-top: 1px solid var(--border);
  }

  .unit-card.has-error .card-actions {
    border-top-color: var(--danger);
  }

  .action-btn {
    background: var(--bg-action);
    border: 1px solid #1a4080;
    border-radius: 4px;
    padding: 2px 8px;
    color: var(--info);
    font-size: 10px;
    cursor: pointer;
  }

  .action-btn:hover {
    background: #1a4080;
  }

  .action-btn.danger {
    background: #3d1a28;
    border-color: #5a2040;
    color: var(--danger);
  }

  .action-btn.danger:hover {
    background: #5a2040;
  }

  .spacer {
    flex: 1;
  }
</style>
