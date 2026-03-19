<script>
    // @ts-nocheck
    import storage from '$lib/stores/storage';
    import { cart } from "$lib/stores/cart"    
    import Customization from "./Customization/Show.svelte";
    import { onMount } from 'svelte';
    import {
      createCardImage,
      createMockFrontFromPrint,
      createMockBackFromPrint,
      createMockInsidePanelsFromPrint
    } from '$lib/cardStudio/mocks.js';
    
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

    let mockView = 'front';
    let mockFrontUrl = '';
    let mockBackUrl = '';
    let mockInsideLeftUrl = '';
    let mockInsideRightUrl = '';

    onMount(async () => {
      if (!product?.greeting_card) return;

      const card = product.greeting_card;
      const sheetFormat = card.sheet_format || 'letter';

      if (card.front_image_url) {
        try {
          const frontPrint = await createCardImage(card.front_image_url, {
            place: 'front',
            scaleOverride: card.front_scale ?? 1,
            offsetX: card.front_offset_x ?? 0,
            offsetY: card.front_offset_y ?? 0,
            cardTitle: card.title,
            imprintLine1: 'lamha paper co.',
            imprintLine2: 'a design studio',
            imprintLine3: 'www.lamhapaper.co  •  Handmade in Fremont, CA',
            clipAtFold: true,
            foldRatioFront: card.fold_ratio_front ?? 0.5,
            sheetFormat,
            frontLayers: card.front_layers || []
          });
          const frontSource = frontPrint || card.front_image_url;
          mockFrontUrl = await createMockFrontFromPrint(frontSource);
          mockBackUrl = await createMockBackFromPrint(frontSource);
        } catch (e) {
          console.error('Error building product front/back mock', e);
        }
      }

      if (card.inside_image_url) {
        try {
          const insidePrint = await createCardImage(card.inside_image_url, {
            place: 'inside',
            scaleOverride: card.inside_scale ?? 1,
            offsetX: card.inside_offset_x ?? 0,
            offsetY: card.inside_offset_y ?? 0,
            sheetFormat,
            layers: card.inside_layers || []
          });
          const insideSource = insidePrint || card.inside_image_url;
          const { left, right } = await createMockInsidePanelsFromPrint(insideSource);
          mockInsideLeftUrl = left;
          mockInsideRightUrl = right;
        } catch (e) {
          console.error('Error building product inside mock', e);
        }
      }
    });

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

{#if product.greeting_card}
  <div class="card-mock">
    <div class="card-mock-tabs">
      <button type="button" class:active={mockView === 'front'} on:click={() => (mockView = 'front')}>
        Front
      </button>
      <button type="button" class:active={mockView === 'inside'} on:click={() => (mockView = 'inside')}>
        Inside
      </button>
      <button type="button" class:active={mockView === 'back'} on:click={() => (mockView = 'back')}>
        Back
      </button>
    </div>
    <div class="card-mock-frame">
      {#if mockView === 'inside'}
        <div class="inside-panels">
          <div class="inside-panel">
            <img src="{mockInsideLeftUrl || product.greeting_card.inside_image_url || product.image_url}" class="img-responsive" alt="Card inside left">
          </div>
          <div class="inside-panel">
            <img src="{mockInsideRightUrl || product.greeting_card.inside_image_url || product.image_url}" class="img-responsive" alt="Card inside right">
          </div>
        </div>
      {:else if mockView === 'back'}
        <img src="{mockBackUrl || product.greeting_card.front_image_url || product.image_url}" class="img-responsive" alt="Card back preview">
      {:else}
        <img src="{mockFrontUrl || product.greeting_card.front_image_url || product.image_url}" class="img-responsive" alt="Card front preview">
      {/if}
    </div>
  </div>
{:else}
  <img src="{product.image_url}" class="img-responsive" alt="">
{/if}

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

.card-mock {
    margin-bottom: 1rem;
}

.card-mock-tabs {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.card-mock-tabs button {
    border: none;
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    cursor: pointer;
    background: #e5e7eb;
    color: #374151;
}

.card-mock-tabs button.active {
    background: #111827;
    color: #f9fafb;
}

.card-mock-frame {
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
}

.inside-panels {
    display: flex;
    flex-direction: row;
}

.inside-panel {
    flex: 1;
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