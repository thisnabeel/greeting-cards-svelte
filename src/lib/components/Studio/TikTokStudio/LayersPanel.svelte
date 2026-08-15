<script>
	// @ts-nocheck
	import { createEventDispatcher } from 'svelte';
	import {
		flattenTreeRows,
		getChildren,
		getDescendantIds,
		getDepth,
		layerLabel,
		moveLayer
	} from '$lib/cardStudio/layerTree.js';

	export let layers = [];
	export let selectedLayerId = null;

	const dispatch = createEventDispatcher();
	const INDENT = 0.85; // rem per depth
	const BASE_PAD = 0.45;

	$: rows = flattenTreeRows(layers);

	let dragId = null;
	/** @type {{ targetId: string, mode: 'before'|'after'|'into', depth: number } | null} */
	let dropHint = null;

	const onSelect = (id) => dispatch('select', { id });

	const onDragStart = (e, id) => {
		dragId = id;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', id);
		// Transparent drag image feels cleaner with our own indicators
		try {
			const ghost = document.createElement('div');
			ghost.textContent = ' ';
			ghost.style.opacity = '0';
			document.body.appendChild(ghost);
			e.dataTransfer.setDragImage(ghost, 0, 0);
			setTimeout(() => ghost.remove(), 0);
		} catch {
			/* ignore */
		}
	};

	const onDragEnd = () => {
		dragId = null;
		dropHint = null;
	};

	/**
	 * Snap zones on each row:
	 * - top ~30%  → blue line above (sibling before)
	 * - bottom ~30% → blue line below (sibling after)
	 * - middle → nest under (indented preview)
	 */
	const resolveDrop = (targetId, _clientX, clientY, el) => {
		if (!dragId || dragId === targetId) return null;
		if (getDescendantIds(layers, dragId).includes(targetId)) return null;

		const target = layers.find((l) => l.id === targetId);
		if (!target) return null;

		const rect = el.getBoundingClientRect();
		const y = clientY - rect.top;
		const h = rect.height || 1;
		const depth = getDepth(layers, targetId);

		if (y < h * 0.3) {
			return { targetId, mode: 'before', depth };
		}
		if (y > h * 0.7) {
			return { targetId, mode: 'after', depth };
		}
		return { targetId, mode: 'into', depth: depth + 1 };
	};

	const onDragOver = (e, targetId) => {
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = 'move';
		dropHint = resolveDrop(targetId, e.clientX, e.clientY, e.currentTarget);
	};

	const onDrop = (e, targetId) => {
		e.preventDefault();
		e.stopPropagation();
		const hint = resolveDrop(targetId, e.clientX, e.clientY, e.currentTarget) || dropHint;
		dragId = dragId || e.dataTransfer.getData('text/plain');
		if (!hint || !dragId) {
			onDragEnd();
			return;
		}

		const target = layers.find((l) => l.id === hint.targetId);
		if (!target) {
			onDragEnd();
			return;
		}

		let parentId = null;
		let index = 0;

		if (hint.mode === 'into') {
			parentId = target.id;
			index = getChildren(layers, parentId).length;
		} else {
			parentId = target.parentId ?? null;
			const siblings = getChildren(layers, parentId).map((l) => l.id);
			const ti = siblings.indexOf(target.id);
			index = hint.mode === 'before' ? ti : ti + 1;
			const fromIdx = siblings.indexOf(dragId);
			if (fromIdx >= 0 && fromIdx < index) index -= 1;
		}

		const next = moveLayer(layers, dragId, { parentId, index });
		dispatch('reorder', { layers: next });
		onDragEnd();
	};

	const onDropRoot = (e) => {
		// Only when dropping on empty list chrome (not a row — rows stopPropagation)
		e.preventDefault();
		const id = dragId || e.dataTransfer.getData('text/plain');
		if (!id) return;
		const roots = getChildren(layers, null);
		const next = moveLayer(layers, id, { parentId: null, index: roots.length });
		dispatch('reorder', { layers: next });
		onDragEnd();
	};

	const addGroup = () => dispatch('addgroup');

	const padFor = (depth) => `${BASE_PAD + depth * INDENT}rem`;
</script>

<div class="layers-panel">
	<div class="panel-head">
		<span>Layers</span>
		<button type="button" class="ghost" on:click={addGroup}>+ Group</button>
	</div>

	<p class="hint">Drag: snap above / below to reorder, or nest under a layer.</p>

	<div
		class="list"
		role="list"
		on:dragover={(e) => e.preventDefault()}
		on:drop={onDropRoot}
	>
		{#each rows as { layer, depth } (layer.id)}
			<div class="row-wrap" class:dragging={dragId === layer.id}>
				{#if dropHint?.targetId === layer.id && dropHint.mode === 'before'}
					<div class="snap-line" style="margin-left: {padFor(dropHint.depth)}"></div>
				{/if}

				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class="row"
					class:active={layer.id === selectedLayerId}
					class:drop-into={dropHint?.targetId === layer.id && dropHint?.mode === 'into'}
					style="padding-left: {padFor(depth)}"
					role="listitem"
					draggable="true"
					on:dragstart={(e) => onDragStart(e, layer.id)}
					on:dragend={onDragEnd}
					on:dragover={(e) => onDragOver(e, layer.id)}
					on:drop={(e) => onDrop(e, layer.id)}
					on:click={() => onSelect(layer.id)}
					on:keydown={(e) => e.key === 'Enter' && onSelect(layer.id)}
					tabindex="0"
				>
					<span class="grip" title="Drag to reorder or nest">⋮⋮</span>
					<span class="kind"
						>{layer.type === 'group' ? '▢' : layer.type === 'image' ? '▣' : 'T'}</span
					>
					<span class="label">{layerLabel(layer)}</span>
					{#if dropHint?.targetId === layer.id && dropHint.mode === 'into'}
						<span class="nest-badge">nest</span>
					{/if}
				</div>

				{#if dropHint?.targetId === layer.id && dropHint.mode === 'into'}
					<div class="nest-preview" style="padding-left: {padFor(dropHint.depth)}">
						<span class="nest-bar"></span>
						<span class="nest-label">Nested under {layerLabel(layer)}</span>
					</div>
				{/if}

				{#if dropHint?.targetId === layer.id && dropHint.mode === 'after'}
					<div class="snap-line" style="margin-left: {padFor(dropHint.depth)}"></div>
				{/if}
			</div>
		{/each}
		{#if !rows.length}
			<p class="empty">No layers yet</p>
		{/if}
	</div>
</div>

<style>
	.layers-panel {
		border: 1px solid #cbd5e1;
		border-radius: 0.65rem;
		background: #f8fafc;
		overflow: hidden;
		margin-bottom: 0.85rem;
	}
	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.55rem 0.7rem;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #334155;
		border-bottom: 1px solid #e2e8f0;
	}
	.hint {
		margin: 0;
		padding: 0.35rem 0.7rem 0;
		font-size: 0.68rem;
		color: #94a3b8;
		line-height: 1.3;
	}
	.ghost {
		border: 1px solid #cbd5e1;
		background: #fff;
		border-radius: 0.35rem;
		padding: 0.2rem 0.45rem;
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
		text-transform: none;
		letter-spacing: 0;
		color: #0f172a;
	}
	.list {
		max-height: 240px;
		overflow-y: auto;
		padding: 0.35rem 0 0.5rem;
	}
	.row-wrap {
		position: relative;
	}
	.row-wrap.dragging {
		opacity: 0.4;
	}
	.snap-line {
		height: 3px;
		margin: 1px 0.55rem 1px;
		border-radius: 999px;
		background: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
		pointer-events: none;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.42rem 0.55rem;
		cursor: grab;
		font-size: 0.8rem;
		font-weight: 600;
		color: #0f172a;
		user-select: none;
		border-radius: 0.35rem;
		margin: 0 0.25rem;
		box-sizing: border-box;
	}
	.row:hover {
		background: #eef2ff;
	}
	.row.active {
		background: #dbeafe;
		color: #1e3a8a;
	}
	.row.drop-into {
		background: #bfdbfe;
		outline: 2px solid #2563eb;
		outline-offset: -2px;
	}
	.nest-badge {
		margin-left: auto;
		font-size: 0.62rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #1d4ed8;
		background: #eff6ff;
		border: 1px solid #93c5fd;
		border-radius: 999px;
		padding: 0.1rem 0.4rem;
	}
	.nest-preview {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.55rem 0.45rem;
		pointer-events: none;
		margin: 0 0.25rem;
	}
	.nest-bar {
		flex: 0 0 auto;
		width: 2px;
		height: 1.1rem;
		background: #2563eb;
		border-radius: 2px;
	}
	.nest-label {
		font-size: 0.68rem;
		font-weight: 600;
		color: #2563eb;
		border: 1px dashed #93c5fd;
		border-radius: 0.35rem;
		padding: 0.2rem 0.45rem;
		background: #eff6ff;
	}
	.grip {
		color: #94a3b8;
		font-size: 0.65rem;
		letter-spacing: -0.12em;
		cursor: grab;
	}
	.kind {
		width: 1rem;
		text-align: center;
		font-size: 0.7rem;
		color: #64748b;
	}
	.label {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.empty {
		margin: 0.5rem 0.75rem;
		font-size: 0.78rem;
		color: #94a3b8;
	}
</style>
