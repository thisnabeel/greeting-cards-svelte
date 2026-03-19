<script>
  // @ts-nocheck
  import { createEventDispatcher } from 'svelte';

  export let title = 'Layer Controls';
  export let layers = [];
  export let selectedLayer = null;
  export let selectedLayerId = null;
  export let deleteConfirmForId = null;
  /** When true, vertical center uses the fold line so the layer centers in its top/bottom half. */
  export let verticalCenterUsesFold = true;
  /** Waiting for user to click a square layer to align the selected layer's center to it. */
  export let centerLinkActive = false;
  /** No other square layers to use as a reference. */
  export let centerLinkDisabled = false;

  const dispatch = createEventDispatcher();

  const selectTab = (id) => dispatch('selecttab', { id });
  const deleteSelected = () => dispatch('deleteselected');
  const updateLayer = (id, patch) => dispatch('updatelayer', { id, patch });
  const centerLayer = (axis) =>
    dispatch('centerlayer', { axis, foldAwareVertical: verticalCenterUsesFold });
</script>

{#if selectedLayer}
  <section class="layer-controls-card">
    <p class="control-group-title">{title}</p>
    <div class="layer-tabs" role="tablist" aria-label={title}>
      {#each layers as layer, i (layer.id)}
        <button
          type="button"
          class="layer-tab"
          class:active={selectedLayerId === layer.id}
          on:click={() => selectTab(layer.id)}
        >
          {layer.type === 'text' ? `Text ${i + 1}` : `Square ${i + 1}`}
        </button>
      {/each}
      {#if selectedLayer?.type === 'text'}
        <button
          type="button"
          class="layer-mini-btn"
          on:click={() =>
            updateLayer(selectedLayer.id, { rotation: (selectedLayer.rotation ?? 0) - 15 })}
        >
          Rotate -15deg
        </button>
        <button
          type="button"
          class="layer-mini-btn"
          on:click={() =>
            updateLayer(selectedLayer.id, { rotation: (selectedLayer.rotation ?? 0) + 15 })}
        >
          Rotate +15deg
        </button>
      {/if}
      {#if deleteConfirmForId === selectedLayerId}
        <button type="button" class="layer-delete-btn" on:click={deleteSelected}>Delete layer</button>
      {/if}
    </div>

    <div class="center-actions" role="group" aria-label="Align layer in page">
      <button type="button" class="layer-mini-btn" on:click={() => centerLayer('x')}>
        Center horizontally
      </button>
      <button type="button" class="layer-mini-btn" on:click={() => centerLayer('y')}>
        {verticalCenterUsesFold
          ? 'Center vertically (this half)'
          : 'Center vertically'}
      </button>
      <button
        type="button"
        class="layer-mini-btn"
        class:active={centerLinkActive}
        disabled={centerLinkDisabled}
        on:click={() => dispatch('togglecenterlink')}
      >
        Center link
      </button>
    </div>
    {#if centerLinkActive}
      <p class="center-link-hint">Click another <strong>square</strong> layer to align centers. Esc to cancel.</p>
    {/if}

    <div class="layer-controls-grid">
      {#if selectedLayer.type === 'text'}
        <label class="full-width">
          <span>Text</span>
          <input
            type="text"
            value={selectedLayer.text || ''}
            on:input={(e) => updateLayer(selectedLayer.id, { text: e.currentTarget.value })}
          />
        </label>
        <div class="full-width duplicate-text-row">
          <button type="button" class="layer-mini-btn" on:click={() => dispatch('duplicatetextlayer')}>
            Duplicate text layer
          </button>
          <span class="duplicate-text-hint">Copies below with “ (2)”, “ (3)”, …</span>
        </div>
        <label>
          <span>Font size</span>
          <input
            type="range"
            min="12"
            max="120"
            step="1"
            value={selectedLayer.fontSize ?? 48}
            on:input={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          <span>Text color</span>
          <input
            type="color"
            value={selectedLayer.textColor || '#0f172a'}
            on:input={(e) => updateLayer(selectedLayer.id, { textColor: e.currentTarget.value })}
          />
        </label>
        <label>
          <span>Font family</span>
          <select
            value={selectedLayer.fontFamily || 'Georgia, "Times New Roman", serif'}
            on:change={(e) => updateLayer(selectedLayer.id, { fontFamily: e.currentTarget.value })}
          >
            <option value='Georgia, "Times New Roman", serif'>Serif</option>
            <option value='Arial, Helvetica, sans-serif'>Sans</option>
            <option value='"Courier New", Courier, monospace'>Monospace</option>
          </select>
        </label>
        <label>
          <span>Rotation</span>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={selectedLayer.rotation ?? 0}
            on:input={(e) => updateLayer(selectedLayer.id, { rotation: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          <span>Layer opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedLayer.opacity ?? 0.45}
            on:input={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          <span>Text stroke</span>
          <input
            type="checkbox"
            checked={!!selectedLayer.strokeEnabled}
            on:change={(e) => updateLayer(selectedLayer.id, { strokeEnabled: e.currentTarget.checked })}
          />
        </label>
        {#if selectedLayer.strokeEnabled}
          <label>
            <span>Stroke color</span>
            <input
              type="color"
              value={selectedLayer.strokeColor || '#ffffff'}
              on:input={(e) => updateLayer(selectedLayer.id, { strokeColor: e.currentTarget.value })}
            />
          </label>
          <label>
            <span>Stroke width</span>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={selectedLayer.strokeWidth ?? 2}
              on:input={(e) => updateLayer(selectedLayer.id, { strokeWidth: Number(e.currentTarget.value) })}
            />
          </label>
        {/if}
        <label class="full-width">
          <span>Backing rectangle</span>
          <input
            type="checkbox"
            checked={!!selectedLayer.backgroundEnabled}
            on:change={(e) =>
              updateLayer(selectedLayer.id, { backgroundEnabled: e.currentTarget.checked })}
          />
        </label>
        {#if selectedLayer.backgroundEnabled}
          <label>
            <span>Backing color</span>
            <input
              type="color"
              value={selectedLayer.backgroundColor || '#f8fafc'}
              on:input={(e) => updateLayer(selectedLayer.id, { backgroundColor: e.currentTarget.value })}
            />
          </label>
          <label>
            <span>Backing opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedLayer.backgroundOpacity ?? 0.75}
              on:input={(e) =>
                updateLayer(selectedLayer.id, { backgroundOpacity: Number(e.currentTarget.value) })}
            />
          </label>
          <label>
            <span>Backing border color</span>
            <input
              type="color"
              value={selectedLayer.backgroundStrokeColor || '#2563eb'}
              on:input={(e) =>
                updateLayer(selectedLayer.id, { backgroundStrokeColor: e.currentTarget.value })}
            />
          </label>
          <label>
            <span>Backing border width</span>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={selectedLayer.backgroundStrokeWidth ?? 2}
              on:input={(e) =>
                updateLayer(selectedLayer.id, { backgroundStrokeWidth: Number(e.currentTarget.value) })}
            />
          </label>
          <label>
            <span>Backing radius</span>
            <input
              type="range"
              min="0"
              max="48"
              step="1"
              value={selectedLayer.backgroundRadius ?? 10}
              on:input={(e) =>
                updateLayer(selectedLayer.id, { backgroundRadius: Number(e.currentTarget.value) })}
            />
          </label>
          <label>
            <span>Backing pad X</span>
            <input
              type="range"
              min="0"
              max="64"
              step="1"
              value={selectedLayer.backgroundPaddingX ?? 14}
              on:input={(e) =>
                updateLayer(selectedLayer.id, { backgroundPaddingX: Number(e.currentTarget.value) })}
            />
          </label>
          <label>
            <span>Backing pad Y</span>
            <input
              type="range"
              min="0"
              max="64"
              step="1"
              value={selectedLayer.backgroundPaddingY ?? 10}
              on:input={(e) =>
                updateLayer(selectedLayer.id, { backgroundPaddingY: Number(e.currentTarget.value) })}
            />
          </label>
        {/if}
      {:else}
        <p class="layer-hint full-width">
          Rotation is available on text layers. Select a <strong>Text</strong> tab.
        </p>
        <label>
          <span>Layer width</span>
          <input
            type="range"
            min="24"
            max="1600"
            step="1"
            value={selectedLayer.width}
            on:input={(e) => updateLayer(selectedLayer.id, { width: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          <span>Layer height</span>
          <input
            type="range"
            min="24"
            max="2200"
            step="1"
            value={selectedLayer.height}
            on:input={(e) => updateLayer(selectedLayer.id, { height: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          <span>Layer roundness</span>
          <input
            type="range"
            min="0"
            max="60"
            step="1"
            value={selectedLayer.radius}
            on:input={(e) => updateLayer(selectedLayer.id, { radius: Number(e.currentTarget.value) })}
          />
        </label>
        <label>
          <span>Layer opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedLayer.opacity ?? 0.45}
            on:input={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.currentTarget.value) })}
          />
        </label>
      {/if}
    </div>
  </section>
{/if}

<style>
  .layer-controls-card {
    grid-column: 1 / -1;
    border: 1px solid rgba(59, 130, 246, 0.4);
    background: rgba(30, 64, 175, 0.14);
    border-radius: 0.75rem;
    padding: 0.65rem 0.75rem;
  }
  .control-group-title {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #bfdbfe;
  }
  .layer-controls-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem 1rem;
  }
  .layer-controls-grid .full-width {
    grid-column: 1 / -1;
  }
  .layer-controls-grid input[type='text'],
  .layer-controls-grid select {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: rgba(2, 6, 23, 0.45);
    color: #e5e7eb;
    padding: 0.45rem 0.55rem;
  }
  .layer-controls-grid input[type='color'] {
    width: 100%;
    height: 2rem;
    border: 1px solid rgba(148, 163, 184, 0.4);
    border-radius: 0.5rem;
    background: rgba(2, 6, 23, 0.45);
    padding: 0.15rem;
  }
  .layer-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.55rem;
  }
  .center-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.55rem;
  }
  .layer-tab {
    border: 1px solid rgba(147, 197, 253, 0.35);
    border-radius: 999px;
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    background: rgba(15, 23, 42, 0.65);
    color: #cbd5e1;
  }
  .layer-tab.active {
    background: rgba(59, 130, 246, 0.25);
    color: #dbeafe;
  }
  .layer-delete-btn {
    border: 1px solid rgba(248, 113, 113, 0.5);
    border-radius: 999px;
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    background: rgba(127, 29, 29, 0.45);
    color: #fee2e2;
  }
  .layer-mini-btn {
    border: 1px solid rgba(147, 197, 253, 0.35);
    border-radius: 999px;
    padding: 0.25rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    background: rgba(30, 41, 59, 0.75);
    color: #dbeafe;
  }
  .layer-mini-btn.active {
    background: rgba(59, 130, 246, 0.45);
    border-color: rgba(147, 197, 253, 0.75);
    color: #fff;
  }
  .layer-mini-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .center-link-hint {
    margin: 0 0 0.5rem;
    font-size: 0.78rem;
    color: #fde68a;
    line-height: 1.35;
  }
  .duplicate-text-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    margin-bottom: 0.15rem;
  }
  .duplicate-text-hint {
    font-size: 0.72rem;
    color: #93c5fd;
    line-height: 1.3;
  }
  .layer-hint {
    margin: 0;
    font-size: 0.78rem;
    color: #93c5fd;
  }
</style>

