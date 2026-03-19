<script>
    import EditProducts from "$lib/components/Products/Edit/Index.svelte";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { adminSession } from "$lib/stores/admin";

    let isAdmin = false;

    onMount(() => {
      adminSession.refresh();
      const unsubscribe = adminSession.subscribe((value) => {
        isAdmin = value;
        if (!value) {
          goto("/admin");
        }
      });

      return unsubscribe;
    });
</script>

{#if isAdmin}
  <EditProducts></EditProducts>
{/if}

<style>
  :global(main) {
    max-width: 96rem;
  }
</style>
