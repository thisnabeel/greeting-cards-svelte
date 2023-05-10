<script>
    import { cart } from "$lib/stores/cart"    
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

let showCart = false;

</script>

<aside class="cart">
    <section class="cart-button toggle-cart" on:click={() => showCart = !showCart}>
        <div class="content" style="vertical-align: bottom;">

            <div class="inner-cart-btn">
            <span class="fa fa-shopping-cart"></span> $<span class="cart-cost">{total}</span>
        </div>
        </div>
    </section>
        <div class="cart-view" class:hidden={!showCart}>
            <div class="flex">
                <div>
                    <h1  on:click={() => showCart = !showCart}  class="go-back"><div class="fa fa-arrow-left toggle-cart"></div> Back</h1>
                </div>
                <div>
                <div class="btn btn-primary checkout go-checkout collect-phone" on:click={handleCheckout} data-total="0">Pay $<span class="cart-cost">{total}</span> <i class="fa fa-arrow-right"></i></div>
                </div>
            </div>

            <br>
            <h1>Cart:</h1>
            <ul class="cart-list">
                <CartList cart={$cart} {remove}></CartList>
            </ul>
            
        </div>
</aside>

<style>
    .cart {
    position: fixed;
    bottom: 0;
    right: 0;
    display: block;
    width: 100%;
        z-index: 999999;
}

.cart-button {
    width: 100%;
    height: 11vh;
    font-size: 8px;
    bottom: 0;
    /* margin-bottom: 69px; */
}

.inner-cart-btn {
    position: static;
    width: 100%;
    height: 100%;
    right: 0px;
    padding: 0.45em;
    font-size: 4em;
    text-align: center;
    background: #8E2DE2;
    background: -webkit-linear-gradient(to right, #4A00E0, #8E2DE2);
    background: linear-gradient(to right, #4A00E0, #8E2DE2);
    color: #fff;
}

.content {
        background: #8E2DE2;
    background: -webkit-linear-gradient(to right, #4A00E0, #8E2DE2);
    background: linear-gradient(to right, #4A00E0, #8E2DE2);
        height: 100%;
}

.cart-view {
    position: fixed;
    top: 0;
    background: #fff;
    font-size: 2em;
    width: 100%;
    height: 100vh;
}

.cph {
    display: inline-block;
}

.cart-list {

    background: #fff;
    list-style: none;
    width: 100%;
    margin: 0;

    padding: 0 1em;

        font-size: 24px;
    
}

.flex {
    display: flex;
}
.flex > div {
    flex: 1 1 50%;
}

.go-checkout {
        display: block;
    width: 100%;
    padding: 10px;
    /* height: 100%; */
    text-align: center;
    vertical-align: middle;
    font-size: 27px;
}

.go-back {
text-align: left;
    padding: 4px;
    padding-left: 10px;
}
</style>