<script>
    import Category from "./Category/Index.svelte"
    import Api from "$lib/api/api"
    import {onMount} from "svelte"

    let categories = [];
    let newCategoryTitle = "Greeting Cards";
    
    onMount(async () => {
        categories = await Api.get('/categories.json');
        console.log(categories)
    })

    async function addCategory() {
        if (!newCategoryTitle || newCategoryTitle.trim().length === 0) {
            return;
        }
        
        try {
            const category = await Api.post('/categories.json', {
                category: {
                    title: newCategoryTitle.trim()
                }
            });
            categories = [...categories, category];
            newCategoryTitle = "";
        } catch (error) {
            console.error('Error adding category:', error);
        }
    }
</script>

<br><br>
<ul class="clean-list categories-list">
    {#each categories as category, index}
        <Category 
            {category} 
            {categories}
        />
    {/each}
</ul>
<input type="text" class="form-control" bind:value={newCategoryTitle} on:keydown={(e) => e.key === 'Enter' && addCategory()}>
<div class="btn btn-primary" on:click={addCategory}>Add Category</div>

<style>
    .categories-list .category {
        margin-bottom: 1rem;
    }
</style>

