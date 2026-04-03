<script lang="ts">
  import type { Unit } from '../../shared/types'

  let { unit, isFavorite, onInject, onFocus, onKill, onAnalyze, onToggleFavorite, onRename }: {
    unit: Unit
    isFavorite: boolean
    onInject: (pid: number) => void
    onFocus: (pid: number) => void
    onKill: (pid: number) => void
    onAnalyze: (pid: number) => void
    onToggleFavorite: (pid: number) => void
    onRename: (pid: number, name: string) => void
  } = $props()

  let editing = $state(false)
  let editName = $state('')

  function startEditing() {
    editName = unit.name
    editing = true
  }

  function commitEdit() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== unit.name) {
      onRename(unit.pid, trimmed)
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

<div class="unit-card" class:is-working={unit.status.state === 'working'} class:is-waiting={unit.status.state === 'waiting'} class:is-idle={unit.status.state === 'idle'} class:has-error={unit.status.state === 'error'}>
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
        <span class="card-name" role="button" tabindex="0" onclick={startEditing} onkeydown={(e) => e.key === 'Enter' && startEditing()} title="Click to rename">{unit.name}</span>
      {/if}
      <span class="card-meta">{unit.shell} · PID {unit.pid}</span>
    </div>
    <div class="card-badges">
      <button class="star-btn" class:active={isFavorite} onclick={() => onToggleFavorite(unit.pid)}>
        {isFavorite ? '★' : '☆'}
      </button>
      <span class="status-badge" style="background: {stateColors[unit.status.state]}; color: {unit.status.state === 'waiting' ? 'var(--bg-primary)' : 'white'}">
        {stateLabels[unit.status.state]}
      </span>
    </div>
  </div>

  <div class="card-body">
    {#if unit.status.lastCommand}
      <div class="last-command">Last: <span class="command-text" title={unit.status.lastCommand}>{unit.status.lastCommand}</span></div>
    {/if}

    {#if unit.status.state === 'waiting'}
      <div class="status-alert warning">Waiting for input</div>
    {:else if unit.status.state === 'error'}
      <div class="status-alert error">Has errors detected</div>
    {/if}

    <div class="resource-stats">
      <span>CPU: <span class="stat-value" style="color: {unit.status.cpu > 5 ? 'var(--success)' : 'var(--idle)'}">{unit.status.cpu.toFixed(0)}%</span></span>
      <span class="stat-sep">|</span>
      <span>MEM: <span class="stat-value" style="color: {unit.status.memory > 100 ? 'var(--warning)' : 'var(--idle)'}">{unit.status.memory}MB</span></span>
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
    transition: border-color 0.15s;
  }

  .unit-card:hover {
    border-color: var(--border-focus);
  }

  .unit-card.is-working {
    border-color: var(--success);
    border-width: 2px;
  }

  .unit-card.is-waiting {
    border-color: var(--warning);
    border-style: dashed;
  }

  .unit-card.is-idle {
    border-color: var(--border);
  }

  .unit-card.has-error {
    border-color: var(--danger);
    border-width: 2px;
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

  .card-badges {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .star-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 20px;
    padding: 2px 4px;
    color: var(--text-muted);
    opacity: 0.7;
    transition: opacity 0.15s, transform 0.15s, color 0.15s;
  }

  .star-btn:hover {
    opacity: 1;
    color: var(--warning);
    transform: scale(1.2);
  }

  .star-btn.active {
    opacity: 1;
    color: var(--warning);
  }

  .star-btn.active:hover {
    transform: scale(1.2);
  }

  .status-badge {
    font-size: var(--text-xs);
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 10px;
  }

  .card-body {
    padding: 4px 18px 12px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .last-command {
    margin-bottom: 4px;
  }

  .command-text {
    color: var(--info);
    display: inline-block;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }

  .status-alert {
    margin-top: 4px;
    font-weight: 500;
  }

  .status-alert.warning {
    color: var(--warning);
  }

  .status-alert.error {
    color: var(--danger);
  }

  .resource-stats {
    margin-top: 6px;
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .stat-value {
    font-weight: 500;
  }

  .stat-sep {
    color: var(--border);
  }

  .card-actions {
    padding: 8px 18px;
    background: var(--bg-secondary);
    display: flex;
    gap: 8px;
    border-top: 1px solid var(--border);
  }

  .unit-card.has-error .card-actions {
    border-top-color: var(--danger);
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
