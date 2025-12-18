<script>
	import Categories from './Categories/Index.svelte';
</script>

<section class="shopfront">
	<h3 class="cursive-font">Artisan Greeting Cards & Gifts</h3>

	<h1 class="green-text">Rooted in Muslim cultures.<br /> Crafted with intention.</h1>

	<small class="bbh-bogle-regular">Crafted with love in Fremont, CA, USA.</small>
</section>
<a href="http://maps.google.com/?q= Fremont, California USA" target="_blank">
	<img src="/map.png" class="map" style="max-height: 300px; max-width: 100%;" alt="" />
</a>

<Categories />

<style>
	.shopfront {
		text-align: center;
	}
	.shopfront h1 {
		font-family: 'Montserrat', sans-serif;
		font-weight: 700;
	}

	.green-text {
		color: #6ab04c;
	}

	.map {
		margin: 0 auto;
		display: block;
	}

	.shopfront small {
		display: inline-block;
		padding: 1rem 2rem;
	}
</style>
