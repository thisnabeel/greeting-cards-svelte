<script>
    import Categories from "./Categories/Index.svelte";
</script>

<section class="shopfront">
	<h3>
      No Additives - No Hormones&nbsp;- No Stimulant - No Preservatives
	</h3>
	
<h1 class="green-text">
      100% Certified Zabihah Meat
    </h1>
</section>
<a href="http://maps.google.com/?q= Fremont, California USA" target="_blank">
        <img src="/map.png" class="map" style="max-height: 300px; max-width: 100%;" alt="">
    </a>

    <Categories></Categories>
    
<style>
	.shopfront {
		text-align: center;
	}
.shopfront h1 {
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
}

.green-text {
    color: #6ab04c;
}

.map {
	margin: 0 auto;
	display: block;
}
</style>
	