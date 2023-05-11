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

    async function handleDuplicate(formula) {
        let cloneFormula = {...formula}
        // console.log(cloneFormula);
        delete cloneFormula.id;
        cloneFormula.title = "Cloned: " + cloneFormula.title;

        const materials = cloneFormula.materials;

        console.log("clone", cloneFormula);
        const newFormula = await Api.post("/formulas.json", cloneFormula);
        newFormula.materials = [];

        newFormula.materials = [];

        // Use map() to create an array of Promises that create materials
        const newMaterials = await Promise.all(materials.map(async material => {
            let cloneMaterial = {...material};
            delete cloneMaterial.id;
            cloneMaterial.formula_id = newFormula.id;

            const newMaterial = await Api.post("/materials.json", cloneMaterial);
            return newMaterial;
        }));

        newFormula.materials = newMaterials;
        product.formulas = [...product.formulas, newFormula];
    }

</script>

<section class="formulas">
    <ul>
        {#each product.formulas as formula}
            <Formula {formula} duplicate={() => handleDuplicate(formula)} remove={() => handleRemove(formula)}></Formula>
        {/each}
    </ul>
    <div class="btn btn-info btn-block" on:click={addFormula}><i class="fa fa-plus"></i></div>
</section>

<style>

</style>