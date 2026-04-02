<script lang="ts">
  import { layouts, refreshLayouts } from '../stores/layouts'

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
  }

  async function deleteLayout(name: string) {
    await api.window.deleteLayout(name)
    await refreshLayouts()
  }

  $effect(() => {
    refreshLayouts()
  })
</script>

<div class="overlay" onclick={onClose} role="presentation">
  <div class="panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" tabindex="-1">
    <h3>📐 Layouts</h3>

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
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: flex-end;
    z-index: 100;
  }

  .panel {
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    width: 320px;
    height: 100vh;
    padding: 20px;
    overflow-y: auto;
  }

  h3 {
    margin-bottom: 16px;
  }

  .save-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .save-row input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 10px;
    color: var(--text-primary);
    font-size: 12px;
    outline: none;
  }

  .save-btn {
    background: var(--info);
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    color: #1a1a2e;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .empty {
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
    padding: 20px;
  }

  .layout-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .layout-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
  }

  .layout-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .layout-name {
    font-size: 13px;
    font-weight: 600;
  }

  .layout-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .layout-actions {
    display: flex;
    gap: 6px;
  }

  .restore-btn {
    background: var(--bg-action);
    border: 1px solid #1a4080;
    border-radius: 4px;
    padding: 4px 10px;
    color: var(--info);
    font-size: 11px;
    cursor: pointer;
  }

  .delete-btn {
    background: transparent;
    border: 1px solid #5a2040;
    border-radius: 4px;
    padding: 4px 8px;
    color: var(--danger);
    font-size: 11px;
    cursor: pointer;
  }
</style>
