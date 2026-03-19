<script>
    // @ts-nocheck
    import { cart } from "$lib/stores/cart"    
    import CartList from "./CartList/Index.svelte"
  import { adminSession } from "$lib/stores/admin";
  import { onMount } from "svelte";
    export let inquire;

  let isAdmin = false;
    let inquireOpen = false;
    let inquiryEmail = '';
    let inquiryPhone = '';
    let inquiryMessage = '';
    let inquireLoading = false;
    let inquireError = '';
    let inquireConfirmOpen = false;

  onMount(() => {
    adminSession.refresh();
    const unsub = adminSession.subscribe((value) => {
      isAdmin = value;
    });
    return unsub;
  });

    function openInquireModal() {
        inquireOpen = true;
        inquiryEmail = '';
        inquiryPhone = '';
        inquiryMessage = '';
        inquireConfirmOpen = false;
        inquireError = '';
    }

    async function submitInquiry() {
        if (!inquiryEmail) {
            inquireError = 'Email is required.';
            return;
        }
        if (!inquiryPhone) {
            inquireError = 'Phone number is required.';
            return;
        }

        inquireLoading = true;
        inquireError = '';
        try {
            await inquire({
                email: inquiryEmail,
                phone: inquiryPhone,
                message: inquiryMessage,
                cart: $cart,
                total: total
            });

            cart.set([]);
            inquireOpen = false;
            inquireConfirmOpen = true;
        } catch (e) {
            console.error(e);
            inquireError = 'Unable to submit inquiry. Please try again.';
        } finally {
            inquireLoading = false;
        }
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
    {#if isAdmin}
        <section class="admin-button-wrap">
            <a class="admin-products-btn" href="/products">Products</a>
            <a class="admin-products-btn" href="/mailbox">Mailbox</a>
        </section>
    {/if}
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
                <div
                    class="btn btn-primary inquire go-checkout collect-phone"
                    on:click={openInquireModal}
                    data-total="{total}"
                >
                    Inquire (cart $<span class="cart-cost">{total}</span>)
                </div>
                </div>
            </div>

            <br>
            <h1>Cart:</h1>
            <ul class="cart-list">
                <CartList cart={$cart} {remove}></CartList>
            </ul>

            {#if inquireOpen}
                <div class="inquire-modal-overlay" on:click={() => (inquireOpen = false)}>
                    <div class="inquire-modal" on:click|stopPropagation>
                        <h2>Send an inquiry</h2>
                        <p>Please enter your email and phone. We’ll save your cart and share the details with the admin.</p>

                        <label class="inquire-email">
                            <span>Email</span>
                            <input type="email" bind:value={inquiryEmail} placeholder="you@example.com" />
                        </label>

                        <label class="inquire-email">
                            <span>Phone number</span>
                            <input type="tel" bind:value={inquiryPhone} placeholder="(555) 123-4567" />
                        </label>

                        <label class="inquire-message">
                            <span>Message (optional)</span>
                            <textarea
                                bind:value={inquiryMessage}
                                rows="3"
                                placeholder="Any details for the admin…"
                            ></textarea>
                        </label>

                        {#if inquireError}
                            <p class="error">{inquireError}</p>
                        {/if}

                        <div class="inquire-actions">
                            <button type="button" class="btn-secondary" on:click={() => (inquireOpen = false)} disabled={inquireLoading}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                class="btn-primary"
                                on:click={submitInquiry}
                                disabled={inquireLoading || !inquiryEmail || !inquiryPhone}
                            >
                                {inquireLoading ? 'Submitting…' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            {/if}

            {#if inquireConfirmOpen}
                <div class="inquire-modal-overlay" on:click={() => (inquireConfirmOpen = false)}>
                    <div class="inquire-modal" on:click|stopPropagation>
                        <h2>Thanks!</h2>
                        <p>
                            We’ll get back to you shortly. Your inquiry has been saved and the admin has been notified.
                        </p>
                        <div class="inquire-actions">
                            <button type="button" class="btn-primary" on:click={() => (inquireConfirmOpen = false)}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            {/if}
            
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

.admin-button-wrap {
    width: 100%;
    margin-bottom: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0 12px;
}

.admin-products-btn {
    display: inline-block;
    padding: 8px 14px;
    border-radius: 999px;
    background: #0f172a;
    color: #fff;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.85rem;
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

.inquire[data-total="0"] {
    display: none;
}

.go-back {
text-align: left;
    padding: 4px;
    padding-left: 10px;
}

.inquire-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.65);
    z-index: 1000000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
}

.inquire-modal {
    width: 100%;
    max-width: 420px;
    background: #0b1220;
    color: #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.1rem 1.05rem;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55);
}

.inquire-modal h2 {
    margin: 0 0 0.35rem;
    font-size: 1.1rem;
}

.inquire-modal p {
    margin: 0 0 0.95rem;
    color: #cbd5e1;
    line-height: 1.35;
}

.inquire-email {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.65rem;
}

.inquire-email span {
    font-weight: 700;
    font-size: 0.85rem;
}

.inquire-message {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
}

.inquire-message textarea {
    padding: 0.6rem 0.65rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(148, 163, 184, 0.45);
    background: rgba(2, 6, 23, 0.6);
    color: #e5e7eb;
    resize: vertical;
}

.inquire-email input {
    padding: 0.6rem 0.65rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(148, 163, 184, 0.45);
    background: rgba(2, 6, 23, 0.6);
    color: #e5e7eb;
}

.inquire-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
}

.btn-secondary {
    border: 1px solid rgba(148, 163, 184, 0.45);
    background: transparent;
    color: #e5e7eb;
    padding: 0.55rem 0.8rem;
    border-radius: 999px;
    cursor: pointer;
}

.error {
    margin: 0.2rem 0 0.65rem;
    color: #fca5a5;
    font-weight: 600;
}
</style>