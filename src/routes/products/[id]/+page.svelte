

<script>
    import Product from "$lib/components/Products/Show.svelte"
    import {onMount} from "svelte";
    import Api from "$lib/api/api"
    	import { page } from '$app/stores';

    
    let product;
    onMount(async () => {
        product = await Api.get("/products/"+$page.params.id+".json") 
    })
</script>

{#if product}
    <Product {product}/>
{/if}