<script>
	import { onMount } from 'svelte';
	import { TIKTOK_FONTS_STYLESHEET } from '$lib/cardStudio/tiktokFonts.js';

	onMount(() => {
		const id = 'tiktok-studio-fonts';
		if (document.getElementById(id)) return;
		const link = document.createElement('link');
		link.id = id;
		link.rel = 'stylesheet';
		link.href = TIKTOK_FONTS_STYLESHEET;
		document.head.appendChild(link);
	});
</script>

<div class="studio-shell">
	<slot />
</div>

<style>
	:global(main) {
		max-width: min(96rem, 100%) !important;
		width: 100%;
	}

	.studio-shell {
		width: 100%;
	}
</style>
