<script>
	// @ts-nocheck
	import { createEventDispatcher } from 'svelte';

	export let open = false;

	const dispatch = createEventDispatcher();

	const PRESETS = [
		{ id: 'tiktok', label: 'TikTok / Reels', width: 1080, height: 1920 },
		{ id: 'square', label: 'Square', width: 1080, height: 1080 },
		{ id: 'landscape', label: 'Landscape', width: 1920, height: 1080 },
		{ id: 'custom', label: 'Custom', width: 1080, height: 1920 }
	];

	let name = 'Untitled';
	let presetId = 'tiktok';
	let width = 1080;
	let height = 1920;
	let error = '';
	let wasOpen = false;

	// Reset form only when the modal opens (avoid Svelte reactive loops).
	$: {
		if (open && !wasOpen) {
			name = 'Untitled';
			presetId = 'tiktok';
			width = 1080;
			height = 1920;
			error = '';
		}
		wasOpen = open;
	}

	$: isCustom = presetId === 'custom';

	const onPreset = (id) => {
		presetId = id;
		const p = PRESETS.find((x) => x.id === id);
		if (p && id !== 'custom') {
			width = p.width;
			height = p.height;
		}
	};

	const clampDim = (n) => Math.max(64, Math.min(4096, Math.round(Number(n) || 0)));

	const cancel = () => dispatch('cancel');

	const submit = () => {
		const w = clampDim(width);
		const h = clampDim(height);
		if (w < 64 || h < 64) {
			error = 'Width and height must be between 64 and 4096.';
			return;
		}
		dispatch('create', {
			name: (name || 'Untitled').trim() || 'Untitled',
			width: w,
			height: h
		});
	};

	const onKey = (e) => {
		if (e.key === 'Escape') cancel();
	};

	const onBackdropClick = (e) => {
		if (e.target === e.currentTarget) cancel();
	};
</script>

{#if open}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions a11y-click-events-have-key-events -->
	<div
		class="new-design-backdrop"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:keydown={onKey}
		on:click={onBackdropClick}
	>
		<div class="new-design-panel" on:click|stopPropagation>
			<h2>New design</h2>
			<label class="field">
				<span>Name</span>
				<input type="text" bind:value={name} maxlength="120" />
			</label>

			<div class="presets">
				{#each PRESETS as p (p.id)}
					<button
						type="button"
						class:active={presetId === p.id}
						on:click={() => onPreset(p.id)}
					>
						{p.label}
						{#if p.id !== 'custom'}
							<small>{p.width}×{p.height}</small>
						{/if}
					</button>
				{/each}
			</div>

			<div class="dims" class:locked={!isCustom}>
				<label>
					<span>Width</span>
					<input type="number" min="64" max="4096" bind:value={width} disabled={!isCustom} />
				</label>
				<span class="times">×</span>
				<label>
					<span>Height</span>
					<input type="number" min="64" max="4096" bind:value={height} disabled={!isCustom} />
				</label>
			</div>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="actions">
				<button type="button" class="ghost" on:click={cancel}>Cancel</button>
				<button type="button" class="primary" on:click={submit}>Create</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.new-design-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000000;
		background: rgba(15, 23, 42, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.new-design-panel {
		width: min(420px, 100%);
		background: #fff;
		border-radius: 0.85rem;
		padding: 1.25rem 1.35rem;
		box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
		color: #0f172a;
		position: relative;
		z-index: 1;
	}
	h2 {
		margin: 0 0 1rem;
		font-size: 1.15rem;
		font-weight: 800;
		text-align: left;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #475569;
		margin-bottom: 0.85rem;
	}
	.field input,
	.dims input {
		border: 1px solid #cbd5e1;
		border-radius: 0.45rem;
		padding: 0.45rem 0.55rem;
		font-size: 0.9rem;
		color: #0f172a;
	}
	.presets {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
		margin-bottom: 0.85rem;
	}
	.presets button {
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		padding: 0.55rem 0.6rem;
		background: #f8fafc;
		cursor: pointer;
		font-weight: 700;
		font-size: 0.8rem;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		color: #0f172a;
	}
	.presets button small {
		font-weight: 500;
		color: #64748b;
		font-size: 0.7rem;
	}
	.presets button.active {
		border-color: #2563eb;
		background: #eff6ff;
	}
	.dims {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.dims.locked input {
		opacity: 0.7;
	}
	.dims label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #475569;
		flex: 1;
	}
	.times {
		padding-bottom: 0.55rem;
		color: #94a3b8;
		font-weight: 700;
	}
	.error {
		margin: 0 0 0.75rem;
		color: #b91c1c;
		font-size: 0.8rem;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}
	.ghost,
	.primary {
		border-radius: 0.5rem;
		padding: 0.5rem 0.9rem;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.ghost {
		border: 1px solid #cbd5e1;
		background: #fff;
		color: #0f172a;
	}
	.primary {
		border: none;
		background: #0f172a;
		color: #fff;
	}
</style>
