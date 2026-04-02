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

  function handleSubmit() {
    onSpawn(shell, name || undefined as any, cwd || undefined as any)
    onClose()
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

    <label class="field">
      <span>Working Directory (optional)</span>
      <input type="text" bind:value={cwd} placeholder="e.g., ~/projects/myapp" />
    </label>

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
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    width: 400px;
    max-width: 90vw;
  }

  h3 {
    margin-bottom: 16px;
    color: var(--text-primary);
  }

  .field {
    display: block;
    margin-bottom: 12px;
  }

  .field span {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .field input {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
  }

  .field input:focus {
    border-color: var(--info);
  }

  .shell-options {
    display: flex;
    gap: 8px;
  }

  .shell-btn {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
  }

  .shell-btn.active {
    border-color: var(--info);
    color: var(--info);
    background: var(--bg-action);
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 16px;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .spawn-btn {
    background: var(--accent);
    border: none;
    border-radius: 6px;
    padding: 6px 16px;
    color: white;
    cursor: pointer;
  }
</style>
