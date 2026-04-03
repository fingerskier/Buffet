<script lang="ts">
  import { appConfig, refreshConfig, favoriteGroups, refreshFavorites } from '../stores/config'
  import type { AppConfig, ShellType } from '../../shared/types'

  let { onClose }: { onClose: () => void } = $props()

  let config = $state<AppConfig>({
    defaultShell: 'zsh',
    pollingIntervalMs: 15000,
    theme: 'dark'
  })

  const api = (window as any).api

  appConfig.subscribe(v => config = { ...v })

  async function saveConfig() {
    await api.config.save(JSON.parse(JSON.stringify(config)))
    await refreshConfig()
  }

  async function handleExport() {
    await api.config.exportAll()
  }

  async function handleImport() {
    const result = await api.config.importAll()
    if (result) {
      await refreshConfig()
      await refreshFavorites()
    }
  }

  const pollingOptions = [
    { label: '5 seconds', value: 5000 },
    { label: '15 seconds', value: 15000 },
    { label: '30 seconds', value: 30000 },
    { label: '60 seconds', value: 60000 }
  ]

  let panelEl: HTMLDivElement

  $effect(() => {
    refreshConfig()
    panelEl?.querySelector<HTMLElement>('input, textarea, select')?.focus()
  })
</script>

<div class="overlay" onclick={onClose} role="presentation">
  <div class="panel" bind:this={panelEl} onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" tabindex="-1">
    <h3>Configuration</h3>

    <label class="field">
      <span>Default Shell</span>
      <select bind:value={config.defaultShell} onchange={saveConfig}>
        <option value="zsh">Zsh</option>
        <option value="bash">Bash</option>
        <option value="cmd">CMD</option>
        <option value="pwsh">PowerShell</option>
        <option value="wsl">WSL</option>
      </select>
    </label>

    <label class="field">
      <span>AI Polling Interval</span>
      <select bind:value={config.pollingIntervalMs} onchange={saveConfig}>
        {#each pollingOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </label>

    <div class="section">
      <h4>Data</h4>
      <div class="data-actions">
        <button class="export-btn" onclick={handleExport}>Export Config</button>
        <button class="import-btn" onclick={handleImport}>Import Config</button>
      </div>
    </div>
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

  h4 {
    margin-bottom: var(--space-sm);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .field {
    display: block;
    margin-bottom: 20px;
  }

  .field span {
    display: block;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  select {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    color: var(--text-primary);
    font-size: var(--text-base);
    outline: none;
  }

  select:focus {
    border-color: var(--border-focus);
  }

  .section {
    margin-top: var(--space-lg);
    padding-top: var(--space-md);
    border-top: 1px solid var(--border);
  }

  .data-actions {
    display: flex;
    gap: var(--space-sm);
  }

  .export-btn, .import-btn {
    flex: 1;
    background: var(--bg-action);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px;
    color: var(--info);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
  }

  .export-btn:hover, .import-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--info);
  }
</style>
