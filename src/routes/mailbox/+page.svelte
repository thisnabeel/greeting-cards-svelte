<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Api from '$lib/api/api.js';
  import { adminSession } from '$lib/stores/admin';

  let isAdmin = false;
  let loading = true;
  let error = '';
  let inquiries = [];
  let didFetch = false;

  onMount(() => {
    adminSession.refresh();
    const unsub = adminSession.subscribe(async (value) => {
      isAdmin = value;
      if (!value) goto('/admin');
      if (value && !didFetch) {
        didFetch = true;
        try {
          loading = true;
          const data = await Api.get('/cart/inquiries');
          inquiries = Array.isArray(data) ? data : [];
        } catch (e) {
          console.error(e);
          error = 'Unable to load mailbox.';
        } finally {
          loading = false;
        }
      }
    });
    return unsub;
  });
</script>

{#if !isAdmin}
  <p class="hint">Redirecting…</p>
{/if}

{#if isAdmin}
  <section class="mailbox">
    <header class="mailbox-header">
      <h1>Mailbox</h1>
      <p>Saved cart inquiries sent by customers.</p>
    </header>

    {#if loading}
      <p class="hint">Loading…</p>
    {/if}
    {#if error}
      <p class="hint error">{error}</p>
    {/if}

    {#if !loading && inquiries.length === 0}
      <p class="hint">No inquiries yet.</p>
    {/if}

    {#if !loading}
      <ul class="inquiry-list">
        {#each inquiries as inquiry (inquiry.id)}
          <li class="inquiry-card">
            <div class="inquiry-top">
              <div class="inquiry-email">{inquiry.email}</div>
              <div class="inquiry-meta">
                <div>ID: {inquiry.id}</div>
                <div>Phone: {inquiry.phone}</div>
                <div>Status: {inquiry.status}</div>
                <div>
                  Created:{' '}
                  {inquiry.created_at
                    ? new Date(inquiry.created_at).toLocaleString()
                    : ''}
                </div>
              </div>
            </div>

            <div class="inquiry-total">Total: ${inquiry.total}</div>

            {#if inquiry.message}
              <div class="inquiry-message">
                Message: {inquiry.message}
              </div>
            {/if}

            <ul class="cart-lines">
              {#each inquiry.cart || [] as line (line.product?.id || line.product?.title || line.price)}
                <li class="cart-line">
                  <div class="cart-line-title">{line.product?.title}</div>
                  <div class="cart-line-qty">{line.quantity}x</div>
                  <div class="cart-line-price">${line.price}</div>
                </li>
              {/each}
            </ul>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  :global(main) {
    max-width: 96rem;
  }

  .mailbox {
    padding: 1.25rem;
  }

  .mailbox-header {
    margin-bottom: 1rem;
  }

  .mailbox-header h1 {
    margin: 0 0 0.25rem;
  }

  .hint {
    color: #93c5fd;
    margin: 1rem 0;
  }

  .hint.error {
    color: #fca5a5;
  }

  .inquiry-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .inquiry-card {
    background: rgba(30, 64, 175, 0.14);
    border: 1px solid rgba(59, 130, 246, 0.35);
    border-radius: 0.75rem;
    padding: 0.9rem 1rem;
  }

  .inquiry-top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .inquiry-email {
    font-weight: 800;
    color: #bfdbfe;
  }

  .inquiry-meta {
    color: #cbd5e1;
    font-size: 0.85rem;
  }

  .inquiry-total {
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 0.5rem;
  }

  .inquiry-message {
    margin: 0.2rem 0 0.65rem;
    padding: 0.55rem 0.65rem;
    background: rgba(2, 6, 23, 0.35);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 0.55rem;
    color: #e5e7eb;
    white-space: pre-wrap;
  }

  .cart-lines {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.35rem;
  }

  .cart-line {
    background: rgba(2, 6, 23, 0.35);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 0.55rem;
    padding: 0.55rem 0.65rem;
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .cart-line-title {
    flex: 1;
    color: #e5e7eb;
    font-weight: 700;
  }

  .cart-line-qty,
  .cart-line-price {
    color: #93c5fd;
    font-weight: 700;
    white-space: nowrap;
  }
</style>

