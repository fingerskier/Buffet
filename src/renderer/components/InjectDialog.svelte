<script lang="ts">
  let { pid, unitName, onInject, onClose }: {
    pid: number
    unitName: string
    onInject: (pid: number, text: string) => void
    onClose: () => void
  } = $props()

  let command = $state('')

  function handleSubmit() {
    if (command.trim()) {
      onInject(pid, command)
      onClose()
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
</script>

<div class="overlay" onclick={onClose} role="presentation">
  <div class="dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" tabindex="-1">
    <h3>Inject into {unitName}</h3>
    <p class="hint">Send a command or text to PID {pid}</p>

    <textarea
      bind:value={command}
      placeholder="Type command here..."
      rows="3"
      onkeydown={handleKeydown}
    ></textarea>

    <div class="actions">
      <button class="cancel-btn" onclick={onClose}>Cancel</button>
      <button class="inject-btn" onclick={handleSubmit}>Send</button>
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
    width: 450px;
    max-width: 90vw;
  }

  h3 {
    margin-bottom: 4px;
    color: var(--text-primary);
  }

  .hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  textarea {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: 13px;
    font-family: monospace;
    outline: none;
    resize: vertical;
  }

  textarea:focus {
    border-color: var(--info);
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 16px;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .inject-btn {
    background: var(--info);
    border: none;
    border-radius: 6px;
    padding: 6px 16px;
    color: #1a1a2e;
    font-weight: 600;
    cursor: pointer;
  }
</style>
