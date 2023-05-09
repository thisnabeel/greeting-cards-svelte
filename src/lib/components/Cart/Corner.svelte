<script>
    import { cart } from "$lib/stores/cart"  
    import StripeForm from "./Stripe.svelte"  
    import CartList from "./CartList/Index.svelte"
    export let checkout;

    function handleCheckout() {
        checkout({
            cart: $cart,
            total: total
        })
    }

    function remove(line) {
        cart.set($cart.filter(l => l != line));
    }
    // $: console.log("cart", cart)
    
    //       let arr = JSON.parse(localStorage.getItem("cart")) || [];
    //   arr.push({
    //     product: product,
    //     price: total,
    //     quantity: selectedQuantity
    //   })
      
    //   localStorage.setItem('cart', JSON.stringify(arr));
    //   console.log(localStorage.getItem("cart"))
    $: total = $cart.reduce((accumulator, item) => {
  return accumulator + item.price;
}, 0);

let startStripe = false;
$: console.log("startStripe", startStripe)

</script>
<aside class="cart">
    <section class="cart-button">
        <div class="inner-cart-btn">
            <div class="btn btn-primary checkout collect-phone" data-total="{total}" on:click={handleCheckout}>Checkout</div>
            
            <span class="fa fa-shopping-cart"></span> $<span class="cart-cost">{total}</span>
        </div>
    </section>
    <div class="lines">

        <CartList cart={$cart} remove={(line) => remove(line)}></CartList>
    </div>
            {#if startStripe}
                <StripeForm {total}></StripeForm>
            {/if}
</aside>

<style>
    .cart {
        position: fixed;
        top: 40px;
        right: 40px;
    }

    .cart-button {
        width: 100%;
        margin-bottom: 69px;
    }

    .inner-cart-btn {
        position: absolute;
        width: max-content;
        right: 0px;
        padding: 20px;
        border-radius: 20px;
        background: #8E2DE2;
        background: -webkit-linear-gradient(to right, #4A00E0, #8E2DE2);
        background: linear-gradient(to right, #4A00E0, #8E2DE2);
        color: #fff;
    }

    .cart-list {
        max-width: 370px;
        display: none;
        background: #fff;
        list-style: none;
    }




    .checkout[data-total="0"] {
        display: none;
    }
    .checkout {
        position: absolute;
        left: -100px;
        top: 14px;
    }
    .btn-primary {
        color: #fff;
        background-color: #007bff;
        border-color: #007bff;
    }

    .cart-list > li, .invoice-list > li {
        border-radius: 20px;
        box-shadow: 0px 1px 5px -1px rgb(254 164 127);
        position: relative;
        border-radius: 10px;
    }

    .cp-remove {
        position: absolute;
        left: -20px;
        top: 16px;
        color: #ccc;
    }

    .cp-head {
        padding: 13px;
    }

    .cp-requests[count="0"] {
        display: none;
    }

    .cp-requests {
        display: block;
        background: #c84352;
        color: #fff;
        padding: 13px;
        border-radius: 0 0 10px 10px;
    }

    .cp-quantity {
        font-weight: bold;
    }

    .lines {
        background: #fff;
        border-radius: 10px;
        padding: 10px;
    }
</style>