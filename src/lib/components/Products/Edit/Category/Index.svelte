<script>
    import Api from "$lib/api/api.js"
    import Product from "./Product/Show.svelte";
    import { debounce } from 'lodash';
    export let category;
    export let categories;
    export let onDragStart = () => {};
    export let onDragOver = () => {};
    export let onDragLeave = () => {};
    export let onDrop = () => {};
    export let onDragEnd = () => {};
    export let isDragging = false;
    export let isDragOver = false;
    let makingNew = false;
    let newProductTitle;
    let editingTitle = false;
    let editedTitle = category.title;
    
    // Update editedTitle when category changes
    $: if (!editingTitle) {
        editedTitle = category.title;
    }

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

    function startEditing() {
        editingTitle = true;
        editedTitle = category.title;
    }

    async function saveTitle() {
        if (!editedTitle || editedTitle.trim().length === 0) {
            editedTitle = category.title;
            editingTitle = false;
            return;
        }
        
        if (editedTitle.trim() !== category.title) {
            try {
                const updated = await Api.put(`/categories/${category.id}.json`, {
                    category: {
                        title: editedTitle.trim()
                    }
                });
                category.title = updated.title;
            } catch (error) {
                console.error('Error updating category:', error);
                editedTitle = category.title;
            }
        }
        editingTitle = false;
    }

    function cancelEdit() {
        editedTitle = category.title;
        editingTitle = false;
    }
</script>
<li 
    class="category" 
    class:dragging={isDragging}
    class:drag-over={isDragOver}
    draggable="true"
    on:dragstart={onDragStart}
    on:dragover={onDragOver}
    on:dragleave={onDragLeave}
    on:drop={onDrop}
    on:dragend={onDragEnd}
>
    {#if editingTitle}
        <input 
            type="text" 
            class="title-input form-control" 
            bind:value={editedTitle}
            on:blur={saveTitle}
            on:keydown={(e) => {
                if (e.key === 'Enter') {
                    saveTitle();
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            }}
            autofocus
        />
    {:else}
        <h1 class="title" on:click={startEditing} title="Click to edit">{category.title}</h1>
    {/if}
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
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.category .title:hover {
    background-color: #f0f0f0;
}

.category .title-input {
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
    font-size: 1.5rem;
    border: 2px solid #007bff;
    padding: 0.5rem;
    border-radius: 4px;
}

.category {
    cursor: move;
    user-select: none;
    transition: opacity 0.2s, background-color 0.2s;
}

.category.dragging {
    opacity: 0.5;
}

.category.drag-over {
    background-color: #e3f2fd;
    border-top: 2px solid #2196f3;
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