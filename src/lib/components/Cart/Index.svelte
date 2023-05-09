<script>
    import MediaQuery from '$lib/MediaQuery/MediaQuery.svelte';
    import Corner from "./Corner.svelte"
    import Bottom from "./Bottom.svelte"
    import Api from "$lib/api/api.js"
    import { loadStripe } from "@stripe/stripe-js";
    import {onMount} from "svelte";


    let stripePromise;
    function getStripe() {
        if (!stripePromise) {
        stripePromise = loadStripe(
                // process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
                "pk_test_51HtY9uBq7aAGJ0GIzpH9nzpU6EzTy1InfF2tyz7T1FeHQC0cNlL2raRnBkrtLGzcEKekZkRbCwMrBsmYyycINXHd00YOzk7lSo"
            );
        }
        return stripePromise;
    }


    async function checkout(payload) {

        const stripe = await getStripe();
        
        // console.log('checkou', payload)
        const response = await Api.post("/cart/checkout", {
            metadata: {
                invoice: payload.cart,
            },
            total: payload.total
        })


                console.log(response)
                stripe.redirectToCheckout({
                    // Make the id field from the Checkout Session creation API response
                    // available to this file, so you can provide it as parameter here
                    // instead of the {{CHECKOUT_SESSION_ID}} placeholder.
                    sessionId: response["session"]["id"]
                }).then(function (result) {
                    // If `redirectToCheckout` fails due to a browser or network
                    // error, display the localized error message to your customer
                    // using `result.error.message`.
                });
    }
</script>

<MediaQuery query="(min-width: 400px)" let:matches>
	{#if matches}
        <div class="corner">
            <Corner {checkout}></Corner>
        </div>
    {:else}
        <div class="bottom">
            <Bottom {checkout}></Bottom>
        </div>
	{/if}
</MediaQuery>

<style>
    
</style>

