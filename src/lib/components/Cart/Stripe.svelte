<form on:submit={handleSubmit}>
  <div id="card-element"></div>
  <button type="submit">Pay</button>
</form>

<script>
  import { onMount } from 'svelte';
import { loadStripe } from "@stripe/stripe-js";
import API from '$lib/api/api';

    export let total;

  let stripe;
  let cardElement;
  let elements;

  onMount(async () => {

    stripe = await loadStripe(
                "pk_test_51HtY9uBq7aAGJ0GIzpH9nzpU6EzTy1InfF2tyz7T1FeHQC0cNlL2raRnBkrtLGzcEKekZkRbCwMrBsmYyycINXHd00YOzk7lSo"
            );
    const appearance = {
        theme: 'stripe'
    };

    const clientSecret = await API.post('/create_payment_intent', {
        total: total
    })
    console.log(clientSecret);
    // Pass the appearance object to the Elements instance
    elements = stripe.elements({clientSecret: clientSecret});
    cardElement = elements.create('payment', {
        layout: {
            type: 'tabs',
            defaultCollapsed: false
        },
          paymentMethodOrder: ['apple_pay', 'google_pay', 'card', 'klarna']

    });
    cardElement.mount('#card-element');
  });

  async function handleSubmit(event) {
    event.preventDefault();
    elements.submit();
    const { error, paymentMethod } = await stripe
        .createPaymentMethod({
            elements,
            params: {
            billing_details: {
                name: 'Jenny Rosen',
            },
            },
        })
        .then(function(result) {
            // Handle result.error or result.paymentMethod
        });
    if (error) {
      console.error(error);
    } else {
      console.log(paymentMethod);
      // submit the form or handle the payment method as needed
    }
  }
</script>

<style>
    form {
        background-color: #fff;
        padding: 30px;
    }

    form button {
        display: block;
        width: 100%;
        border: 0;
        padding: 10px;
        background: #2563eb;
        color: #fff;
        border-radius: 10px;
    }
</style>