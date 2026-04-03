<script lang="ts">
  import type { ShellType } from '../../shared/types'

  let { onSpawn, onClose }: {
    onSpawn: (shell: ShellType, name: string, cwd: string) => void
    onClose: () => void
  } = $props()

  let shell = $state<ShellType>('zsh')
  let name = $state('')
  let cwd = $state('')
  let shells = $state<{ value: ShellType; label: string }[]>([
    { value: 'zsh', label: 'Zsh' },
    { value: 'bash', label: 'Bash' }
  ])

  $effect(() => {
    (window as any).api.ping().then((res: any) => {
      if (res.platform === 'win32') {
        shells = [
          { value: 'cmd', label: 'CMD' },
          { value: 'pwsh', label: 'PowerShell' },
          { value: 'wsl', label: 'WSL' }
        ]
        shell = 'cmd'
      }
    })
  })

  let dialogEl: HTMLDivElement
  const api = (window as any).api

  function handleSubmit() {
    onSpawn(shell, name || undefined as any, cwd || undefined as any)
    onClose()
  }

  async function pickDirectory() {
    const dir = await api.dialog.openDirectory()
    if (dir) cwd = dir
  }

  $effect(() => {
    dialogEl?.querySelector<HTMLElement>('input, textarea, select')?.focus()
  })
</script>

<div class="overlay" onclick={onClose} role="presentation">
  <div class="dialog" bind:this={dialogEl} onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" tabindex="-1">
    <h3>Spawn Terminal</h3>

    <label class="field">
      <span>Shell</span>
      <div class="shell-options">
        {#each shells as s}
          <button
            class="shell-btn"
            class:active={shell === s.value}
            onclick={() => shell = s.value}
          >
            {s.label}
          </button>
        {/each}
      </div>
    </label>

    <label class="field">
      <span>Name (optional)</span>
      <input type="text" bind:value={name} placeholder="e.g., api-server" />
    </label>

    <div class="field">
      <span>Working Directory (optional)</span>
      <div class="dir-picker">
        <input type="text" bind:value={cwd} placeholder="e.g., ~/projects/myapp" />
        <button class="browse-btn" onclick={pickDirectory}>Browse</button>
      </div>
    </div>

    <div class="actions">
      <button class="cancel-btn" onclick={onClose}>Cancel</button>
      <button class="spawn-btn" onclick={handleSubmit}>Spawn</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: var(--space-lg);
    width: 480px;
    max-width: 90vw;
  }

  h3 {
    margin-bottom: var(--space-md);
    color: var(--text-primary);
    font-size: var(--text-lg);
  }

  .field {
    display: block;
    margin-bottom: 14px;
  }

  .field span {
    display: block;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .field input {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
    color: var(--text-primary);
    font-size: var(--text-base);
    outline: none;
  }

  .field input:focus {
    border-color: var(--border-focus);
  }

  .dir-picker {
    display: flex;
    gap: var(--space-sm);
  }

  .dir-picker input {
    flex: 1;
  }

  .browse-btn {
    background: var(--bg-action);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 16px;
    color: var(--text-secondary);
    font-size: var(--text-base);
    cursor: pointer;
    white-space: nowrap;
  }

  .browse-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .shell-options {
    display: flex;
    gap: var(--space-sm);
  }

  .shell-btn {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 16px;
    color: var(--text-secondary);
    font-size: var(--text-base);
    cursor: pointer;
  }

  .shell-btn.active {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--bg-action);
  }

  .actions {
    display: flex;
    gap: var(--space-sm);
    justify-content: flex-end;
    margin-top: var(--space-lg);
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 20px;
    color: var(--text-secondary);
    font-size: var(--text-base);
    cursor: pointer;
  }

  .cancel-btn:hover {
    border-color: var(--text-secondary);
  }

  .spawn-btn {
    background: var(--accent);
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    color: var(--bg-primary);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
  }

  .spawn-btn:hover {
    background: var(--accent-hover);
  }
</style>
