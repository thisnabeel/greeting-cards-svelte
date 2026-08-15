<script>
	// @ts-nocheck
	export let designs = [];
	export let activeId = null;
	export let saving = false;
	export let saveError = '';

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const select = (id) => dispatch('select', { id });
	const createNew = () => dispatch('new');
	const duplicate = (id) => dispatch('duplicate', { id });
	const remove = (id) => {
		if (confirm('Delete this design?')) dispatch('delete', { id });
	};
	const rename = (design) => {
		const next = prompt('Rename design', design.name || 'Untitled');
		if (next != null && next.trim()) dispatch('rename', { id: design.id, name: next.trim() });
	};
</script>

<div class="design-strip">
	<button type="button" class="new-btn" on:click={createNew}>+ New design</button>

	<div class="strip-scroll" role="list">
		{#each designs as design (design.id)}
			<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div
				class="thumb"
				class:active={design.id === activeId}
				role="listitem"
				on:click={() => select(design.id)}
				title="{design.name} · {design.width}×{design.height}"
			>
				{#if design.thumbnail_url}
					<img src={design.thumbnail_url} alt="" />
				{:else}
					<span class="placeholder">{design.width}×{design.height}</span>
				{/if}
				<span class="name">{design.name || 'Untitled'}</span>
				<span class="actions">
					<button type="button" class="icon" title="Rename" on:click|stopPropagation={() => rename(design)}
						>✎</button
					>
					<button
						type="button"
						class="icon"
						title="Duplicate"
						on:click|stopPropagation={() => duplicate(design.id)}>⧉</button
					>
					<button
						type="button"
						class="icon danger"
						title="Delete"
						on:click|stopPropagation={() => remove(design.id)}>×</button
					>
				</span>
			</div>
		{/each}
	</div>

	<div class="status" class:error={!!saveError}>
		{#if saveError}
			{saveError}
		{:else if saving}
			Saving…
		{:else if activeId}
			Saved
		{/if}
	</div>
</div>

<style>
	.design-strip {
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
		padding: 0.65rem 0;
		border-bottom: 1px solid #e2e8f0;
		margin-bottom: 0.25rem;
	}
	.new-btn {
		flex-shrink: 0;
		align-self: center;
		border: 1px dashed #94a3b8;
		border-radius: 0.55rem;
		padding: 0.55rem 0.85rem;
		background: #f8fafc;
		font-weight: 700;
		font-size: 0.8rem;
		cursor: pointer;
		color: #0f172a;
		white-space: nowrap;
	}
	.strip-scroll {
		display: flex;
		gap: 0.55rem;
		overflow-x: auto;
		flex: 1;
		min-width: 0;
		padding-bottom: 0.15rem;
	}
	.thumb {
		position: relative;
		flex: 0 0 auto;
		width: 72px;
		border: 2px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0;
		background: #1e293b;
		cursor: pointer;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		color: #fff;
	}
	.thumb.active {
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
	}
	.thumb img {
		width: 100%;
		height: 96px;
		object-fit: cover;
		display: block;
		background: #0f172a;
	}
	.placeholder {
		display: grid;
		place-items: center;
		height: 96px;
		font-size: 0.62rem;
		color: #94a3b8;
		padding: 0.25rem;
		text-align: center;
	}
	.name {
		display: block;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.25rem 0.3rem;
		background: #0f172a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left;
	}
	.actions {
		display: none;
		position: absolute;
		top: 2px;
		right: 2px;
		gap: 2px;
	}
	.thumb:hover .actions,
	.thumb.active .actions {
		display: flex;
	}
	.icon {
		border: none;
		border-radius: 3px;
		width: 18px;
		height: 18px;
		font-size: 0.7rem;
		line-height: 1;
		padding: 0;
		background: rgba(15, 23, 42, 0.85);
		color: #fff;
		cursor: pointer;
	}
	.icon.danger {
		background: rgba(185, 28, 28, 0.9);
	}
	.status {
		flex-shrink: 0;
		align-self: center;
		font-size: 0.72rem;
		color: #64748b;
		min-width: 3.5rem;
		text-align: right;
	}
	.status.error {
		color: #b91c1c;
	}
</style>
