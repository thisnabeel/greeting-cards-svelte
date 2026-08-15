<script>
  // @ts-nocheck
  import { createEventDispatcher } from 'svelte';
  import { COLOR_PALETTES, DEFAULT_COLOR_PALETTE_ID } from '$lib/cardStudio/colorPalettes.js';

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
  /** Hide fold-aware center-link UI (TikTok studio). */
  export let showCenterLink = true;
  /** Optional font options for text layers: `{ family, cssFamily }[]`.
   * When empty, falls back to system serif/sans/mono stacks.
   */
  export let fontOptions = [];
  /** Show TikTok-style “respect canvas edge” wrap toggle. */
  export let showRespectBounds = false;
  /** When false, hide the flat layer tab strip (studio uses LayersPanel instead). */
  export let showLayerTabs = true;
  /** Studio rich-text: show box padding / line-height instead of relying only on textarea. */
  export let showTextBoxControls = false;

  let activePaletteId = DEFAULT_COLOR_PALETTE_ID;
  $: activePalette = COLOR_PALETTES.find((p) => p.id === activePaletteId) || COLOR_PALETTES[0];
  $: currentTextColor = (
    selectedLayer?.textColor ||
    selectedLayer?.runs?.[0]?.color ||
    '#ffffff'
  ).toLowerCase();

  const dispatch = createEventDispatcher();

  const selectTab = (id) => dispatch('selecttab', { id });
  const deleteSelected = () => dispatch('deleteselected');
  const updateLayer = (id, patch) => dispatch('updatelayer', { id, patch });
  const centerLayer = (axis) =>
    dispatch('centerlayer', { axis, foldAwareVertical: verticalCenterUsesFold });

  const layerTabLabel = (layer, i) => {
    if (layer.type === 'text') return `Text ${i + 1}`;
    if (layer.type === 'image') return `Image ${i + 1}`;
    return `Square ${i + 1}`;
  };

  const canRotate = (layer) => layer?.type === 'text' || layer?.type === 'image';
</script>

{#if selectedLayer}
  <section class="layer-controls-card">
    <p class="control-group-title">{title}</p>
    {#if showLayerTabs}
    <div class="layer-tabs" role="tablist" aria-label={title}>
      {#each layers as layer, i (layer.id)}
        <button
          type="button"
          class="layer-tab"
          class:active={selectedLayerId === layer.id}
          on:click={() => selectTab(layer.id)}
        >
          {layerTabLabel(layer, i)}
        </button>
      {/each}
      {#if canRotate(selectedLayer)}
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
    {:else}
    <div class="layer-tabs" role="group">
      {#if canRotate(selectedLayer)}
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
        <button type="button" class="layer-delete-btn" on:click={deleteSelected}>Confirm delete</button>
      {:else}
        <button type="button" class="layer-mini-btn" on:click={() => selectTab(selectedLayerId)}>
          Delete layer
        </button>
      {/if}
    </div>
    {/if}
    <div class="center-actions" role="group" aria-label="Align layer in page">
      <button type="button" class="layer-mini-btn" on:click={() => centerLayer('x')}>
        Center horizontally
      </button>
      <button type="button" class="layer-mini-btn" on:click={() => centerLayer('y')}>
        {verticalCenterUsesFold
          ? 'Center vertically (this half)'
          : 'Center vertically'}
      </button>
      {#if showCenterLink}
        <button
          type="button"
          class="layer-mini-btn"
          class:active={centerLinkActive}
          disabled={centerLinkDisabled}
          on:click={() => dispatch('togglecenterlink')}
        >
          Center link
        </button>
      {/if}
    </div>
    {#if showCenterLink && centerLinkActive}
      <p class="center-link-hint">Click another <strong>square</strong> layer to align centers. Esc to cancel.</p>
    {/if}

    <div class="layer-controls-grid">
      {#if selectedLayer.type === 'text'}
        {#if showTextBoxControls}
          <p class="full-width layer-hint">Double-click text on the canvas to type. Drag the corner handle to widen the text box. Styles below apply to the whole layer (or the current selection while editing).</p>
          <label>
            <span>Text box width</span>
            <input
              type="range"
              min="40"
              max="1600"
              step="1"
              value={selectedLayer.width}
              on:input={(e) => updateLayer(selectedLayer.id, { width: Number(e.currentTarget.value) })}
            />
          </label>
          <label>
            <span>Font size</span>
            <input
              type="range"
              min="12"
              max="160"
              step="1"
              value={selectedLayer.fontSize ?? selectedLayer.runs?.[0]?.fontSize ?? 42}
              on:input={(e) =>
                dispatch('richstyle', {
                  id: selectedLayer.id,
                  patch: { fontSize: Number(e.currentTarget.value) }
                })}
            />
          </label>
          <label>
            <span>Tracking</span>
            <input
              type="range"
              min="-5"
              max="40"
              step="0.5"
              value={selectedLayer.runs?.[0]?.letterSpacing ?? 0}
              on:input={(e) =>
                dispatch('richstyle', {
                  id: selectedLayer.id,
                  patch: { letterSpacing: Number(e.currentTarget.value) }
                })}
            />
          </label>
          <div class="full-width color-palette-field">
            <span class="field-label">Text color</span>
            <div class="palette-switcher" role="tablist" aria-label="Color palettes">
              {#each COLOR_PALETTES as pal (pal.id)}
                <button
                  type="button"
                  class="palette-chip"
                  class:active={activePaletteId === pal.id}
                  role="tab"
                  aria-selected={activePaletteId === pal.id}
                  title={pal.name}
                  on:click={() => (activePaletteId = pal.id)}
                >
                  <span class="palette-dots" aria-hidden="true">
                    {#each pal.colors.slice(0, 4) as c}
                      <i style="background:{c.hex}"></i>
                    {/each}
                  </span>
                  {pal.name}
                </button>
              {/each}
            </div>
            <div class="swatch-row" role="listbox" aria-label="{activePalette.name} colors">
              {#each activePalette.colors as c (c.hex)}
                <button
                  type="button"
                  class="swatch"
                  class:active={currentTextColor === c.hex.toLowerCase()}
                  role="option"
                  aria-selected={currentTextColor === c.hex.toLowerCase()}
                  title={c.name}
                  style="background:{c.hex}"
                  on:click={() =>
                    dispatch('richstyle', {
                      id: selectedLayer.id,
                      patch: { color: c.hex }
                    })}
                ></button>
              {/each}
            </div>
            <label class="custom-color-row">
              <span>Custom</span>
              <input
                type="color"
                value={selectedLayer.textColor || selectedLayer.runs?.[0]?.color || '#ffffff'}
                on:input={(e) =>
                  dispatch('richstyle', {
                    id: selectedLayer.id,
                    patch: { color: e.currentTarget.value }
                  })}
              />
            </label>
          </div>
          <div class="full-width font-family-field">
            <span class="field-label">Font family</span>
            {#if fontOptions.length}
              <div class="font-picker" role="listbox" aria-label="Font family">
                {#each fontOptions as font (font.id || font.cssFamily)}
                  <button
                    type="button"
                    class="font-option"
                    class:active={(selectedLayer.fontFamily ||
                      selectedLayer.runs?.[0]?.fontFamily ||
                      fontOptions[0]?.cssFamily) === font.cssFamily}
                    role="option"
                    aria-selected={(selectedLayer.fontFamily ||
                      selectedLayer.runs?.[0]?.fontFamily ||
                      fontOptions[0]?.cssFamily) === font.cssFamily}
                    style="font-family: {font.cssFamily};"
                    on:click={() =>
                      dispatch('richstyle', {
                        id: selectedLayer.id,
                        patch: { fontFamily: font.cssFamily }
                      })}
                  >
                    {font.family}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          <label>
            <span>Line height</span>
            <input
              type="range"
              min="0.8"
              max="2.4"
              step="0.05"
              value={selectedLayer.lineHeight ?? 1.15}
              on:input={(e) =>
                updateLayer(selectedLayer.id, { lineHeight: Number(e.currentTarget.value) })}
            />
          </label>
          <label>
            <span>Box padding</span>
            <input
              type="range"
              min="0"
              max="64"
              step="1"
              value={selectedLayer.padding ?? 12}
              on:input={(e) => updateLayer(selectedLayer.id, { padding: Number(e.currentTarget.value) })}
            />
          </label>
        {:else}
        <label class="full-width">
          <span>Text</span>
          <textarea
            rows="3"
            value={selectedLayer.text || ''}
            on:input={(e) => updateLayer(selectedLayer.id, { text: e.currentTarget.value })}
          ></textarea>
        </label>
        {/if}        <div class="full-width duplicate-text-row">
          <button type="button" class="layer-mini-btn" on:click={() => dispatch('duplicatetextlayer')}>
            Duplicate text layer
          </button>
          <span class="duplicate-text-hint">Copies below with “ (2)”, “ (3)”, …</span>
        </div>
        {#if !showTextBoxControls}
        <label>
          <span>Font size</span>
          <input
            type="range"
            min="12"
            max="160"
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
        <div class="full-width font-family-field">
          <span class="field-label">Font family</span>
          {#if fontOptions.length}
            <div class="font-picker" role="listbox" aria-label="Font family">
              {#each fontOptions as font (font.id || font.cssFamily)}
                <button
                  type="button"
                  class="font-option"
                  class:active={(selectedLayer.fontFamily || fontOptions[0]?.cssFamily) ===
                    font.cssFamily}
                  role="option"
                  aria-selected={(selectedLayer.fontFamily || fontOptions[0]?.cssFamily) ===
                    font.cssFamily}
                  style="font-family: {font.cssFamily};"
                  on:click={() => updateLayer(selectedLayer.id, { fontFamily: font.cssFamily })}
                >
                  {font.family}
                </button>
              {/each}
            </div>
          {:else}
            <select
              value={selectedLayer.fontFamily || 'Georgia, "Times New Roman", serif'}
              on:change={(e) => updateLayer(selectedLayer.id, { fontFamily: e.currentTarget.value })}
            >
              <option value='Georgia, "Times New Roman", serif'>Serif</option>
              <option value='Arial, Helvetica, sans-serif'>Sans</option>
              <option value='"Courier New", Courier, monospace'>Monospace</option>
            </select>
          {/if}
        </div>
        {/if}
        <label>
          <span>Rotation</span>          <input
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
        {#if showRespectBounds}
          <label class="full-width">
            <span>Respect canvas edge (wrap / word-break)</span>
            <input
              type="checkbox"
              checked={selectedLayer.respectBounds !== false}
              on:change={(e) =>
                updateLayer(selectedLayer.id, { respectBounds: e.currentTarget.checked })}
            />
          </label>
        {/if}
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
      {:else if selectedLayer.type === 'image'}
        <label class="full-width">
          <span>Replace image</span>
          <input
            type="file"
            accept="image/*"
            on:change={(e) => {
              const file = e.currentTarget.files?.[0];
              if (!file) return;
              dispatch('replaceimagelayer', { id: selectedLayer.id, file });
              e.currentTarget.value = '';
            }}
          />
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
            value={selectedLayer.radius ?? 0}
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
            value={selectedLayer.opacity ?? 1}
            on:input={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.currentTarget.value) })}
          />
        </label>
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
  .layer-controls-grid select,
  .layer-controls-grid textarea {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: rgba(2, 6, 23, 0.45);
    color: #e5e7eb;
    padding: 0.45rem 0.55rem;
  }
  .layer-controls-grid textarea {
    min-height: 4.5rem;
    resize: vertical;
    font: inherit;
    line-height: 1.35;
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
  .font-family-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .field-label {
    font-size: 0.75rem;
    font-weight: 600;
  }
  .font-picker {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    max-height: 220px;
    overflow-y: auto;
    padding: 0.3rem;
    border-radius: 0.55rem;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: rgba(2, 6, 23, 0.35);
  }
  .font-option {
    display: block;
    width: 100%;
    text-align: left;
    border: 1px solid transparent;
    border-radius: 0.45rem;
    padding: 0.45rem 0.6rem;
    font-size: 1.05rem;
    line-height: 1.2;
    cursor: pointer;
    background: transparent;
    color: inherit;
  }
  .font-option:hover {
    background: rgba(59, 130, 246, 0.12);
  }
  .font-option.active {
    border-color: rgba(96, 165, 250, 0.7);
    background: rgba(59, 130, 246, 0.2);
  }
  .color-palette-field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .palette-switcher {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .palette-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 999px;
    padding: 0.25rem 0.55rem 0.25rem 0.35rem;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.85);
    color: #0f172a;
  }
  .palette-chip.active {
    border-color: #2563eb;
    background: #dbeafe;
    color: #1e3a8a;
  }
  .palette-dots {
    display: inline-flex;
    gap: 2px;
  }
  .palette-dots i {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: 1px solid rgba(15, 23, 42, 0.15);
  }
  .swatch-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0.35rem 0;
  }
  .swatch {
    width: 1.55rem;
    height: 1.55rem;
    border-radius: 999px;
    border: 2px solid rgba(15, 23, 42, 0.12);
    padding: 0;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
  }
  .swatch:hover {
    transform: scale(1.08);
  }
  .swatch.active {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.35);
  }
  .custom-color-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #64748b;
  }
  .custom-color-row input[type='color'] {
    width: 2rem;
    height: 1.5rem;
    padding: 0;
    border: 1px solid #cbd5e1;
    border-radius: 0.35rem;
    background: transparent;
    cursor: pointer;
  }
</style>

