<script>
	// @ts-nocheck
	import { createEventDispatcher, tick } from 'svelte';
	import {
		runsToHtml,
		htmlToRuns,
		applyFormatToSelection,
		defaultRunStyle,
		runsToPlainText,
		ensureRuns,
		layoutRunsToLines
	} from '$lib/cardStudio/richText.js';
	import { DEFAULT_TIKTOK_FONT } from '$lib/cardStudio/tiktokFonts.js';

	export let layer;
	export let editing = false;

	const dispatch = createEventDispatcher();

	let editorEl;
	let seeded = false;
	let layoutCtx;

	$: ensured = layer?.type === 'text' ? ensureRuns(layer) : null;
	$: displayHtml = ensured
		? runsToHtml(
				ensured.runs?.length
					? ensured.runs
					: [
							{
								text: ensured.text || '',
								...defaultRunStyle(),
								fontSize: ensured.fontSize || 42,
								color: ensured.textColor || '#ffffff',
								fontFamily: ensured.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily
							}
						]
			)
		: '';

	$: padding = layer?.padding ?? 12;
	$: lineHeight = layer?.lineHeight ?? 1.15;

	$: layoutLines = (() => {
		if (!ensured || editing) return [];
		if (typeof document === 'undefined') return [];
		if (!layoutCtx) {
			const c = document.createElement('canvas');
			layoutCtx = c.getContext('2d');
		}
		if (!layoutCtx) return [];
		const boxW = Math.max(8, layer.width || 80);
		const wrapW =
			layer.respectBounds === false ? 1e9 : Math.max(8, boxW - padding * 2);
		return layoutRunsToLines(layoutCtx, ensured.runs, wrapW);
	})();

	// Seed contenteditable once when entering edit mode
	$: if (editing && editorEl && !seeded) {
		seeded = true;
		tick().then(() => {
			if (editorEl) editorEl.innerHTML = displayHtml || '<br>';
		});
	}
	$: if (!editing) seeded = false;

	const emitRuns = () => {
		if (!editorEl) return;
		const runs = htmlToRuns(editorEl);
		dispatch('change', {
			runs,
			text: runsToPlainText(runs)
		});
	};

	/** Apply style patch to current selection, or signal parent to format all runs. */
	export function applyStyle(patch) {
		if (!editing || !editorEl) {
			dispatch('formatall', patch);
			return false;
		}
		editorEl.focus();
		const ok = applyFormatToSelection(editorEl, {
			...defaultRunStyle(),
			...(ensured?.runs?.[0] || {}),
			...patch
		});
		if (!ok) {
			dispatch('formatall', patch);
			return false;
		}
		emitRuns();
		return true;
	}

	export function readSelectionStyle() {
		const sel = window.getSelection();
		if (!sel || !sel.rangeCount || !editorEl) return null;
		let node = sel.anchorNode;
		if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
		while (node && node !== editorEl && node.dataset?.richRun !== '1') {
			node = node.parentElement;
		}
		if (!node || node === editorEl) return null;
		return {
			fontSize: parseFloat(node.style.fontSize) || undefined,
			fontFamily: node.style.fontFamily || undefined,
			color: node.style.color || undefined,
			letterSpacing: parseFloat(node.style.letterSpacing) || 0
		};
	}
</script>

<div
	class="rich-wrap"
	class:editing
	style="padding:{padding}px;line-height:{lineHeight};"
>
	{#if editing}
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			bind:this={editorEl}
			class="rich-editor"
			contenteditable="true"
			spellcheck="false"
			on:input={emitRuns}
			on:mousedown|stopPropagation
		></div>
	{:else}
		<div class="rich-preview">
			{#each layoutLines as line}
				<div class="rich-line" style="height:{line.maxFontSize * lineHeight}px;">
					{#each line.segments as seg}
						<span
							style="font-size:{seg.fontSize}px;font-family:{seg.fontFamily};color:{seg.color};letter-spacing:{seg.letterSpacing || 0}px;"
							>{seg.text}</span
						>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.rich-wrap {
		position: relative;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		overflow: hidden;
		pointer-events: none;
	}
	.rich-wrap.editing {
		pointer-events: auto;
		overflow: hidden;
	}
	.rich-editor {
		width: 100%;
		min-height: 1em;
		outline: none;
		font-weight: 700;
		line-height: inherit;
		caret-color: #93c5fd;
		word-break: break-word;
		white-space: pre-wrap;
		pointer-events: none;
	}
	.editing .rich-editor {
		cursor: text;
		pointer-events: auto;
		min-height: 100%;
	}
	.rich-preview {
		width: 100%;
	}
	.rich-line {
		white-space: nowrap;
		overflow: hidden;
		font-weight: 700;
	}
	.rich-editor :global([data-rich-run]) {
		font-weight: 700;
	}
</style>
