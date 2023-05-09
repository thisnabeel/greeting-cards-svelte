<script>
    import Api from "$lib/api/api.js"
    import Product from "./Product/Show.svelte";
    export let category;
    export let categories;
    let makingNew = false;
    let newProductTitle;

    async function saveProduct() {
        const product = await Api.post("/products.json", {
            title: newProductTitle,
            category_id: category.id,
            price: 1,
            minimum: 1,
            maximum: 1
        })
        category.products = [...category.products, product];
        makingNew = false;
        newProductTitle = null;
    }

    async function handleRemove(id) {
        const deleted = await Api.delete("/products/"+id+".json");
        category.products = category.products.filter(p => p.id !== id);
    }
</script>
<li class="category"><h1 class="title">{category.title}</h1>
            <ul class="products-list">
                {#each category.products as product}
                    <Product {product} {categories} remove={handleRemove} />
    
                    
                {/each}
                
                <!-- position: absolute;
        bottom: 0px;
        left: -25px; -->
                <div class="btn btn-outline-warning add-new-product" style="border:none;" class:hidden={makingNew} on:click="{() => makingNew = !makingNew}"><i class="fa fa-plus"></i></div>
                {#if makingNew}
                    
                    <div class="new-product">
                    <input type="text" on:blur={() => {if (!newProductTitle || newProductTitle.length < 1) {makingNew = false}} } bind:value={newProductTitle} placeholder="New Product" class="form-control">
                    {#if makingNew && newProductTitle && newProductTitle.length > 1}
                        <div class="btn btn-primary" on:click={saveProduct} >Save</div>
                    {/if}
                    </div>
                {/if}
            </ul>
        </li>

<style>
    section {
        text-align: center;
    }



.category .title {
    text-align: left;
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
}

.new-product {
    opacity: 50%;
}


.products-list {
    position: relative;
}
.products-list .add-new-product {
    position: absolute;
    bottom: 0;
    left: -30px;
}
</style>