<script>
    import storage from '$lib/stores/storage';
    import { cart } from "$lib/stores/cart"    
    import Customization from "./Customization/Show.svelte";
    
    export let product;

    $: total = product.price * selectedQuantity;

    let selectedQuantity = product.group_size;

    function increaseQuantity() {
      selectedQuantity = selectedQuantity + product.group_size;
    }

    function decreaseQuantity() {
      selectedQuantity = selectedQuantity - product.group_size;
      if (selectedQuantity < product.group_size) {
        selectedQuantity = product.group_size;
      }
    }

    function addToCart() {
      // storage('user', null);
      // storage('cart', {
      //   test: "hio"
      // });
      let arr = $cart || [];
      arr.push({
        product: product,
        price: total,
        quantity: selectedQuantity
      })
      
      localStorage.setItem('cart', JSON.stringify(arr));
      cart.set(arr);
      // console.log(localStorage.getItem("cart"))
    }
</script>

<div class="shopfront">
  <ol class="breadcrumb">
  <li class="breadcrumb-item"><a href="/">{product.category.title}</a></li>
    <li class="breadcrumb-item active">{product.title}</li>
  </ol>

<img src="{product.image_url}" class="img-responsive" alt="">

<h1 class="product-title">
  {product.title.split("(")[0]}
  {#if product.title.split("(")[1]}
      <br>
      ({product.title.split("(")[1]}
  {/if}
</h1>

<form action="/charges" accept-charset="UTF-8" method="post">
  <div id="error_explanation">
  </div>
	 
   <h3>How Many?</h3>

   <div class="spinner">
<!-- 		<input type="number" id="amount" name="quantity" class="form-control" min="1" value="1" pattern="\d*"/> -->
<div class="btn-group" role="group" aria-label="Basic example" data-grp="1">
  <button type="button" class="btn btn-info minus-one" on:click={decreaseQuantity}>-</button>
<button type="button" class="btn btn-primary quantity-count">{selectedQuantity}</button>
  <button type="button" class="btn btn-info plus-one" on:click={increaseQuantity}>+</button>
</div>

    </div>


    {#if product.customizations && product.customizations.length > 0}
    <hr>
      <p class="requests-label text-center" style="font-weight: bold">Customizations (optional):</p>
      {#each product.customizations as customization}
        <Customization {customization}></Customization>
      {/each}

    {/if}

    <hr>

	<h1 class="usd-cost">$<span class="total-cost">{total}</span></h1>


  <input type="hidden" name="stripeToken" id="stripeToken">
  <input type="hidden" name="stripeEmail" id="stripeEmail">
  <input type="hidden" name="quantity" id="quantity" value="1">

    <span class="btn btn-pink btn-lg btn-block buy-now" on:click={() => addToCart()}>
		  Add To Cart
	  </span>
  </form>
</div>


<style>
  .shopfront {
    max-width: 350px;
    margin: 0 auto;
    width: 100%;
}

.breadcrumb {
    display: flex;
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    list-style: none;
    background-color: #e9ecef;
    border-radius: 0.25rem;
}

.shopfront img {
    width: 350px;
    margin: 0 auto;
    width: 100%;
}

.shopfront h1 {
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
}

form {
    background-color: #ffdbdb;
    padding: 25px;
}

.spinner {
    width: 119px;
    margin: 0 auto;
}

.shopfront h1 {
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
}
form h1, h3 {
    color: rgba(102, 45, 145, 0.67);
    text-align: center;
}

.btn-pink {
    background-color: #ee7785;
    color: #fff;
    transition: 1s;
}

.btn-block {
    display: block;
    width: 100%;
}

.btn-pink:hover {
    background-color: #da4e5e;
    color: #fff;
}
</style>