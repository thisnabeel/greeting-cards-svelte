<script>
    // @ts-nocheck
    import MediaQuery from '$lib/MediaQuery/MediaQuery.svelte';
    import Corner from "./Corner.svelte"
    import Bottom from "./Bottom.svelte"
    import Api from "$lib/api/api.js"
    async function inquire(payload) {
        const response = await Api.post("/cart/inquire", {
            inquiry: {
                email: payload.email,
                phone: payload.phone,
                message: payload.message,
                cart: payload.cart,
                total: payload.total
            }
        });
        return response;
    }
</script>

<MediaQuery query="(min-width: 450px)" let:matches>
	{#if matches}
        <div class="corner">
            <Corner {inquire}></Corner>
        </div>
    {:else}
        <div class="bottom">
            <Bottom {inquire}></Bottom>
        </div>
	{/if}
</MediaQuery>

<style>
    
</style>

