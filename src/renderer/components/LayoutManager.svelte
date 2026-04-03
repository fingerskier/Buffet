<script lang="ts">
  import { layouts, refreshLayouts } from '../stores/layouts'
  import { refreshUnits } from '../stores/units'

  let { onClose }: { onClose: () => void } = $props()

  let newLayoutName = $state('')
  let layoutList = $state<any[]>([])

  layouts.subscribe(v => layoutList = v)

  const api = (window as any).api

  async function saveLayout() {
    if (!newLayoutName.trim()) return
    await api.window.saveLayout(newLayoutName)
    newLayoutName = ''
    await refreshLayouts()
  }

  async function restoreLayout(name: string) {
    await api.window.restoreLayout(name)
    await refreshUnits()
  }

  async function deleteLayout(name: string) {
    await api.window.deleteLayout(name)
    await refreshLayouts()
  }

  let panelEl: HTMLDivElement

  $effect(() => {
    refreshLayouts()
    panelEl?.querySelector<HTMLElement>('input, textarea, select')?.focus()
  })
</script>

<div class="overlay" onclick={onClose} role="presentation">
  <div class="panel" bind:this={panelEl} onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" tabindex="-1">
    <h3>Layouts</h3>

    <div class="save-row">
      <input
        type="text"
        bind:value={newLayoutName}
        placeholder="Layout name..."
        onkeydown={(e) => e.key === 'Enter' && saveLayout()}
      />
      <button class="save-btn" onclick={saveLayout}>Save Current</button>
    </div>

    {#if layoutList.length === 0}
      <p class="empty">No saved layouts yet</p>
    {:else}
      <div class="layout-list">
        {#each layoutList as layout}
          <div class="layout-item">
            <div class="layout-info">
              <span class="layout-name">{layout.name}</span>
              <span class="layout-meta">{layout.positions.length} windows</span>
            </div>
            <div class="layout-actions">
              <button class="restore-btn" onclick={() => restoreLayout(layout.name)}>Restore</button>
              <button class="delete-btn" onclick={() => deleteLayout(layout.name)}>✕</button>
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
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: flex-end;
    z-index: 100;
  }

  .panel {
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    width: 380px;
    height: 100vh;
    padding: var(--space-lg);
    overflow-y: auto;
  }

  h3 {
    margin-bottom: var(--space-md);
    font-size: var(--text-xl);
    color: var(--text-primary);
  }

  .save-row {
    display: flex;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .save-row input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .save-row input:focus {
    border-color: var(--border-focus);
  }

  .save-btn {
    background: var(--info);
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    color: var(--bg-primary);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .save-btn:hover {
    opacity: 0.9;
  }

  .empty {
    color: var(--text-muted);
    font-size: var(--text-base);
    text-align: center;
    padding: var(--space-lg);
  }

  .layout-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .layout-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
  }

  .layout-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .layout-name {
    font-size: var(--text-base);
    font-weight: 600;
  }

  .layout-meta {
    font-size: var(--text-sm);
    color: var(--text-muted);
  }

  .layout-actions {
    display: flex;
    gap: 6px;
  }

  .restore-btn {
    background: var(--bg-action);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 12px;
    color: var(--info);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .restore-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--info);
  }

  .delete-btn {
    background: transparent;
    border: 1px solid #4a2a2a;
    border-radius: 4px;
    padding: 6px 10px;
    color: var(--danger);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .delete-btn:hover {
    background: #3a2020;
  }
</style>
