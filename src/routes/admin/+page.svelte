<script>
  import { goto } from '$app/navigation';
  import { adminSession } from '$lib/stores/admin';

  const ADMIN_PASSWORD = '38850';
  let password = '';
  let error = '';

  function login() {
    if (password === ADMIN_PASSWORD) {
      adminSession.login();
      goto('/products');
      return;
    }

    error = 'Incorrect password';
  }
</script>

<section class="admin-login">
  <h1>Admin Login</h1>
  <p>Enter admin password to access product editing.</p>

  <input
    type="password"
    placeholder="Admin password"
    bind:value={password}
    on:keydown={(e) => e.key === 'Enter' && login()}
  />

  <button type="button" on:click={login}>Login</button>

  {#if error}
    <p class="error">{error}</p>
  {/if}
</section>

<style>
  .admin-login {
    max-width: 360px;
    margin: 4rem auto;
    padding: 1.25rem;
    border-radius: 0.75rem;
    background: #111827;
    color: #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .admin-login input {
    padding: 0.6rem 0.7rem;
    border-radius: 0.5rem;
    border: 1px solid #374151;
    background: #0b1220;
    color: #e5e7eb;
  }

  .admin-login button {
    border: none;
    border-radius: 999px;
    padding: 0.5rem 1rem;
    background: #2563eb;
    color: white;
    cursor: pointer;
  }

  .error {
    color: #fca5a5;
    margin: 0;
  }
</style>

