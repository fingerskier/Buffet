<script lang="ts">
  import type { Prompt } from '../../shared/types'
  import { prompts as promptsStore, refreshPrompts } from '../stores/config'

  let { onClose }: { onClose: () => void } = $props()

  let promptList = $state<Prompt[]>([])
  let newName = $state('')
  let newText = $state('')
  let editingId = $state<string | null>(null)
  let editName = $state('')
  let editText = $state('')

  promptsStore.subscribe(v => promptList = v)

  const api = (window as any).api

  function clonePrompts(): Prompt[] {
    return JSON.parse(JSON.stringify(promptList))
  }

  async function createPrompt() {
    if (!newName.trim() || !newText.trim()) return
    const current = clonePrompts()
    current.push({ id: crypto.randomUUID(), name: newName.trim(), text: newText })
    await api.config.savePrompts(current)
    newName = ''
    newText = ''
    await refreshPrompts()
  }

  function startEdit(prompt: Prompt) {
    editingId = prompt.id
    editName = prompt.name
    editText = prompt.text
  }

  async function commitEdit() {
    if (!editingId || !editName.trim() || !editText.trim()) {
      editingId = null
      return
    }
    const current = clonePrompts()
    const p = current.find(p => p.id === editingId)
    if (p) {
      p.name = editName.trim()
      p.text = editText
    }
    await api.config.savePrompts(current)
    editingId = null
    await refreshPrompts()
  }

  async function deletePrompt(id: string) {
    const current = clonePrompts()
    await api.config.savePrompts(current.filter(p => p.id !== id))
    if (editingId === id) editingId = null
    await refreshPrompts()
  }

  function focus(node: HTMLElement) {
    node.focus()
  }

  let panelEl: HTMLDivElement

  $effect(() => {
    refreshPrompts()
    panelEl?.querySelector<HTMLElement>('input')?.focus()
  })
</script>

<div class="overlay" onclick={onClose} role="presentation">
  <div class="panel" bind:this={panelEl} onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" tabindex="-1">
    <h3>Prompts</h3>

    <div class="create-form">
      <input
        type="text"
        bind:value={newName}
        placeholder="Prompt name..."
        onkeydown={(e) => e.key === 'Enter' && createPrompt()}
      />
      <textarea
        bind:value={newText}
        placeholder="Command or text to inject..."
        rows="2"
      ></textarea>
      <p class="create-hint">End with a newline to auto-execute</p>
      <button class="create-btn" onclick={createPrompt}>+ Add Prompt</button>
    </div>

    {#if promptList.length === 0}
      <p class="empty">No saved prompts yet</p>
    {:else}
      <div class="prompt-list">
        {#each promptList as prompt (prompt.id)}
          <div class="prompt-item">
            {#if editingId === prompt.id}
              <div class="edit-form">
                <input
                  class="edit-name"
                  type="text"
                  bind:value={editName}
                  onkeydown={(e) => e.key === 'Escape' && (editingId = null)}
                  use:focus
                />
                <textarea
                  class="edit-text"
                  bind:value={editText}
                  rows="3"
                ></textarea>
                <div class="edit-actions">
                  <button class="save-btn" onclick={commitEdit}>Save</button>
                  <button class="cancel-edit-btn" onclick={() => editingId = null}>Cancel</button>
                </div>
              </div>
            {:else}
              <div class="prompt-info">
                <span class="prompt-name">{prompt.name}</span>
                <span class="prompt-preview" title={prompt.text}>{prompt.text.slice(0, 80)}{prompt.text.length > 80 ? '...' : ''}</span>
                {#if prompt.text.endsWith('\n') || prompt.text.endsWith('\r\n')}
                  <span class="auto-exec-badge">auto-exec</span>
                {/if}
              </div>
              <div class="prompt-actions">
                <button class="edit-btn" onclick={() => startEdit(prompt)}>Edit</button>
                <button class="delete-btn" onclick={() => deletePrompt(prompt.id)}>&times;</button>
              </div>
            {/if}
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
    width: 420px;
    height: 100vh;
    padding: var(--space-lg);
    overflow-y: auto;
  }

  h3 {
    margin-bottom: var(--space-md);
    font-size: var(--text-xl);
    color: var(--text-primary);
  }

  .create-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .create-form input,
  .create-form textarea {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .create-form textarea {
    font-family: monospace;
    resize: vertical;
  }

  .create-form input:focus,
  .create-form textarea:focus {
    border-color: var(--border-focus);
  }

  .create-hint {
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin: -4px 0 0;
  }

  .create-btn {
    background: var(--accent);
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    color: var(--bg-primary);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
  }

  .create-btn:hover {
    background: var(--accent-hover);
  }

  .empty {
    color: var(--text-muted);
    font-size: var(--text-base);
    text-align: center;
    padding: var(--space-lg);
  }

  .prompt-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .prompt-item {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
  }

  .prompt-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
  }

  .prompt-name {
    font-size: var(--text-base);
    font-weight: 600;
  }

  .prompt-preview {
    font-size: var(--text-sm);
    color: var(--text-muted);
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .auto-exec-badge {
    font-size: var(--text-xs);
    color: var(--success);
    background: #1a2a1a;
    border: 1px solid #2a3a2a;
    border-radius: 10px;
    padding: 2px 8px;
    align-self: flex-start;
  }

  .prompt-actions {
    display: flex;
    gap: 6px;
  }

  .edit-btn {
    background: var(--bg-action);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 12px;
    color: var(--info);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .edit-btn:hover {
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

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .edit-name {
    background: var(--bg-primary);
    border: 1px solid var(--border-focus);
    border-radius: 4px;
    padding: 6px 10px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: 600;
    outline: none;
  }

  .edit-text {
    background: var(--bg-primary);
    border: 1px solid var(--border-focus);
    border-radius: 4px;
    padding: 6px 10px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-family: monospace;
    outline: none;
    resize: vertical;
  }

  .edit-actions {
    display: flex;
    gap: 6px;
  }

  .save-btn {
    background: var(--info);
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    color: var(--bg-primary);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .save-btn:hover {
    opacity: 0.9;
  }

  .cancel-edit-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 12px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .cancel-edit-btn:hover {
    border-color: var(--text-secondary);
  }
</style>
