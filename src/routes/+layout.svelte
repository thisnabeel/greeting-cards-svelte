<script>
	import Header from './Header.svelte';
	import Cart from "$lib/components/Cart/Index.svelte"
	import './styles.css';
</script>

<div class="app border">
	<Header />
	<Cart />
	<main>
		<slot />
	</main>


</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.border {
    margin: 30px;
    background-color: #fff;
    padding: 10px;
    -webkit-box-shadow: 0px 1px 5px -1px rgba(0, 0, 0, 0.75);
    -moz-box-shadow: 0px 1px 5px -1px rgba(0, 0, 0, 0.75);
    box-shadow: 0px 1px 5px -1px rgba(0, 0, 0, 0.75);
}
	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
