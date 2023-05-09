<script>
    import Api from "$lib/api/api"
    import {onMount} from "svelte"
    import Product from "./Product.svelte"
    let categories = [];
    onMount(async () => {
		categories = await Api.get('/categories.json');
		console.log(categories)


    })
</script>

<br><br>
{#each categories.filter(c => c.products.filter(p => p.active).length > 0) as category}
    <section>
        <h1>
            {category.title}
        </h1>
        
        {#each category.products.filter(p => p.active) as product}
            <Product {product}></Product>
        {/each}
    </section>
{/each}

<style>
    section {
        text-align: center;
    }
    h1 {
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
}
</style>