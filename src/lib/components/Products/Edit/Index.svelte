<script>
    import Category from "./Category/Index.svelte"
    import Api from "$lib/api/api"
    import {onMount} from "svelte"
    let categories = [];
    onMount(async () => {
		categories = await Api.get('/categories.json');
		console.log(categories)


    })
</script>

<br><br>
<ul class="clean-list">
    {#each categories as category}
        <Category {category} {categories} />
    {/each}
</ul>
<input type="text" class="form-control">
<div class="btn btn-primary">Add Category</div>

