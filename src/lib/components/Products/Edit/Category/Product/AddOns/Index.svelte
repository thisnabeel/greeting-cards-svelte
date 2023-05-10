<script>
    import Customization from "./Show.svelte"
    import Api from "$lib/api/api.js";

    export let product;


    async function addCustomization() {
        const response = await Api.post("/customizations.json", {
            title: "new",
            product_id: product.id
        })
        console.log("respone", response)
        product.customizations = [...product.customizations, response]
    }

    async function handleRemove(customization) {
        const response = await Api.delete("/customizations/"+customization.id+".json")

        product.customizations = product.customizations.filter(f => f.id !== customization.id);
    }
</script>

<section class="customizations">
    <ul>
        {#each product.customizations as customization}
            <Customization {customization} remove={() => handleRemove(customization)}></Customization>
        {/each}
    </ul>
    <div class="btn btn-info btn-block" on:click={addCustomization}><i class="fa fa-plus"></i></div>
</section>

<style>

</style>