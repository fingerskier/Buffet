<script lang="ts">
  import type { Prompt } from '../../shared/types'

  let { pid, unitName, prompts, onInject, onSavePrompt, onDeletePrompt, onClose }: {
    pid: number
    unitName: string
    prompts: Prompt[]
    onInject: (pid: number, text: string) => void
    onSavePrompt: (name: string, text: string) => void
    onDeletePrompt: (id: string) => void
    onClose: () => void
  } = $props()

  let command = $state('')
  let savingPrompt = $state(false)
  let promptName = $state('')
  let editingPromptId = $state<string | null>(null)
  let editPromptName = $state('')

  function handleSubmit() {
    if (command.trim()) {
      onInject(pid, command)
      onClose()
    }
  }

  function selectPrompt(prompt: Prompt) {
    command = prompt.text
  }

  function startSavePrompt() {
    if (!command.trim()) return
    savingPrompt = true
    promptName = ''
  }

  function commitSavePrompt() {
    const trimmed = promptName.trim()
    if (trimmed && command.trim()) {
      onSavePrompt(trimmed, command.trim())
      savingPrompt = false
    }
  }

  function startEditPrompt(prompt: Prompt) {
    editingPromptId = prompt.id
    editPromptName = prompt.name
  }

  function commitEditPrompt() {
    if (editingPromptId && editPromptName.trim()) {
      // Save with updated name, keeping same text
      const existing = prompts.find(p => p.id === editingPromptId)
      if (existing) {
        onSavePrompt(editPromptName.trim(), existing.text)
        onDeletePrompt(editingPromptId)
      }
    }
    editingPromptId = null
  }

  let dialogEl: HTMLDivElement

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !savingPrompt) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function focus(node: HTMLElement) {
    node.focus()
    if (node instanceof HTMLInputElement) node.select()
  }

  $effect(() => {
    dialogEl?.querySelector<HTMLElement>('textarea')?.focus()
  })
</script>

<div class="overlay" onclick={onClose} role="presentation">
  <div class="dialog" bind:this={dialogEl} onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" tabindex="-1">
    <h3>Inject into {unitName}</h3>
    <p class="hint">Send a command or text to PID {pid}</p>

    {#if prompts.length > 0}
      <div class="prompt-list">
        <span class="prompt-label">Saved Prompts</span>
        {#each prompts as prompt (prompt.id)}
          <div class="prompt-item">
            {#if editingPromptId === prompt.id}
              <input
                class="prompt-edit-input"
                type="text"
                bind:value={editPromptName}
                onkeydown={(e) => { if (e.key === 'Enter') commitEditPrompt(); if (e.key === 'Escape') editingPromptId = null; }}
                onblur={commitEditPrompt}
                use:focus
              />
            {:else}
              <button class="prompt-btn" onclick={() => selectPrompt(prompt)} title={prompt.text}>
                {prompt.name}
              </button>
              <button class="prompt-action" onclick={() => startEditPrompt(prompt)} title="Rename">&#9998;</button>
            {/if}
            <button class="prompt-action danger" onclick={() => onDeletePrompt(prompt.id)} title="Delete">&times;</button>
          </div>
        {/each}
      </div>
    {/if}

    <textarea
      bind:value={command}
      placeholder="Type command here..."
      rows="3"
      onkeydown={handleKeydown}
    ></textarea>

    <div class="actions">
      {#if savingPrompt}
        <input
          class="save-name-input"
          type="text"
          placeholder="Prompt name..."
          bind:value={promptName}
          onkeydown={(e) => { if (e.key === 'Enter') commitSavePrompt(); if (e.key === 'Escape') savingPrompt = false; }}
          use:focus
        />
        <button class="save-confirm-btn" onclick={commitSavePrompt}>Save</button>
        <button class="cancel-btn" onclick={() => savingPrompt = false}>Cancel</button>
      {:else}
        <button class="save-prompt-btn" onclick={startSavePrompt} disabled={!command.trim()}>Save as Prompt</button>
        <div class="spacer"></div>
        <button class="cancel-btn" onclick={onClose}>Cancel</button>
        <button class="inject-btn" onclick={handleSubmit}>Send</button>
      {/if}
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
    width: 500px;
    max-width: 90vw;
  }

  h3 {
    margin-bottom: var(--space-xs);
    color: var(--text-primary);
    font-size: var(--text-lg);
  }

  .hint {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin-bottom: var(--space-md);
  }

  .prompt-list {
    margin-bottom: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .prompt-label {
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .prompt-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .prompt-btn {
    flex: 1;
    background: var(--bg-action);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 10px;
    color: var(--info);
    font-size: var(--text-sm);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .prompt-btn:hover {
    border-color: var(--info);
    background: var(--bg-elevated);
  }

  .prompt-edit-input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border-focus);
    border-radius: 4px;
    padding: 6px 10px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .prompt-action {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    border-radius: 3px;
  }

  .prompt-action:hover {
    color: var(--text-primary);
    background: var(--bg-action);
  }

  .prompt-action.danger:hover {
    color: var(--danger);
  }

  textarea {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
    color: var(--text-primary);
    font-size: var(--text-base);
    font-family: monospace;
    outline: none;
    resize: vertical;
  }

  textarea:focus {
    border-color: var(--border-focus);
  }

  .actions {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    margin-top: var(--space-md);
  }

  .spacer {
    flex: 1;
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

  .inject-btn {
    background: var(--info);
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    color: var(--bg-primary);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
  }

  .inject-btn:hover {
    opacity: 0.9;
  }

  .save-prompt-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 14px;
    color: var(--text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .save-prompt-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .save-prompt-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .save-name-input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border-focus);
    border-radius: 6px;
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .save-confirm-btn {
    background: var(--accent);
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    color: var(--bg-primary);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .save-confirm-btn:hover {
    opacity: 0.9;
  }
</style>
