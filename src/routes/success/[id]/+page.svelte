<script>
    import {page} from "$app/stores"
    import {onMount} from "svelte";
    import Api from "$lib/api/api"
    import { cart } from "$lib/stores/cart"   
    import CartList from "$lib/components/Cart/CartList/Index.svelte";

    let sale;
    $: console.log($page.params.id)
    onMount(async () => {
        localStorage.setItem('cart', JSON.stringify([]));
        cart.set([]);

        const response = await Api.get("/success/"+$page.params.id+".json");
        console.log(response);
        sale = response.sale;

        
    })
    
</script>

{#if sale}

<div class="row">

    <div class="col-lg-6">
    
        <h2>Customer Details:</h2>
        <h2><i class="fa fa-envelope"></i> {sale.email}</h2>
        <h2><i class="fa fa-phone"></i> {sale.phone_number}</h2>
    </div>
    
    <div class="col-lg-6" style="text-align:right">
        <h2>Reference Code:</h2>
        <code>{sale.guid}</code>
    </div>
</div>

<hr>
<h1 class="text-center">Invoice:</h1>
<section class="invoice">
    
    <CartList cart={sale.invoice} removable={false}></CartList>
</section>
<hr>
<h1>Payed: <br>${sale.amount / 100}</h1>
{/if}

<style>
    .invoice {
        max-width: 400px;
        display: block;
        margin: 0 auto;
    }

    .float-right {
        float:right;
        max-width: fit-content;
    }

    .float-left {
        float:left;
        max-width: fit-content;
    }
</style>
