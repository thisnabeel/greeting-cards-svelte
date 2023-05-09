<script>
    import Formula from "./Show.svelte"
    import Api from "$lib/api/api.js";

    export let product;


    async function addFormula() {
        const response = await Api.post("/formulas.json", {
            title: "new",
            product_id: product.id
        })
        console.log("respone", response)
        product.formulas = [...product.formulas, response]
    }

    async function handleRemove(formula) {
        const response = await Api.delete("/formulas/"+formula.id+".json")

        product.formulas = product.formulas.filter(f => f.id !== formula.id);
    }
</script>

<section class="formulas">
    <ul>
        {#each product.formulas as formula}
            <Formula {formula} remove={() => handleRemove(formula)}></Formula>
        {/each}
    </ul>
    <div class="btn btn-info btn-block" on:click={addFormula}><i class="fa fa-plus"></i></div>
</section>

<style>

</style>