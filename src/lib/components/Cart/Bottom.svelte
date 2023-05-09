<script>
    import { cart } from "$lib/stores/cart"    
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
        <div class="inner-cart-btn">
        <span class="fa fa-shopping-cart"></span> $<span class="cart-cost">{total}</span>
        </div>
    </section>
        <div class="cart-view" class:hidden={!showCart}>
            <h1><div on:click={() => showCart = !showCart} class="fa fa-arrow-left toggle-cart"></div> Cart: 
                <div class="btn btn-primary checkout collect-phone" on:click={handleCheckout} data-total="0">Pay $<span class="cart-cost">0</span> <i class="fa fa-arrow-right"></i></div>
            </h1>
            <ul class="cart-list">
                {#each $cart || [] as line}
                <li>
                    <span class="fa fa-remove remove-cp cp-remove" data-index="0"  on:click={() => remove(line)}></span>
                    
                    <div class="cph">
                        <div class="cp-head">
                            <span class="cp-cost">
                                ${line.price} <i class="fa fa-arrow-right"></i>
                            </span>
                            <span class="cp-quantity">
                                {line.quantity}x
                            </span>
                            <span class="cp-title">
                                {line.product.title}
                            </span>
                        </div>

                    </div>


                    <span class="cp-requests" count="0">
                        
                    </span>
                </li>
                {/each}
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
    height: 8vh;
    font-size: 8px;
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

.cart-view {
    position: fixed;
    top: 0;
    background: #fff;
    font-size: 2em;
    width: 100%;
    height: 100vh;
}

.cart-view h1 {
    font-size: 2em;
    padding: 0.3em;
    text-align: left;
    
}

.checkout {
    position: relative;
    left: 20px;
    top: 18px;
    float: right;
    font-size: 52px;
    padding: 30px;
    border-radius: 20px;
}

.cart-list {

    background: #fff;
    list-style: none;
    width: 100%;
    margin: 0;

    padding: 0 1em;
    
}


.checkout {
    position: relative;
    left: 20px;
    top: 18px;
    float: right;
    font-size: 52px;
    padding: 30px;
    border-radius: 20px;
}

.checkout .btn {
        position: relative;
    left: 6px;
    top: 5px;
    float: right;
    font-size: 26px;
    padding: 18px;
    border-radius: 20px;
}



</style>