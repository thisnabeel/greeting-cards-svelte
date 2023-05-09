<script>
    export let product;
    export let categories;
    export let remove;

    import debounce  from 'lodash/debounce';
    import Api from "$lib/api/api.js";
    import Formulas from "./Formulas/Index.svelte";

    let expanded = false;

    const params = ["title", "image_url", "description", "price", "minimum", "maximum", "group_size"]
    let timer;
	const save = () => {
		clearTimeout(timer);
		timer = setTimeout(async () => {
            product.method = "_post";
			const response = await Api.put('/products/' + product.id + '.json', product);
			// let response = await Api.get("/abstractions/"+abstraction.id+".json")
			console.log('response', response);
		}, 1000);
    };
    
    async function toggleActive() {
        const response = await Api.put('/products/' + product.id + '.json', {
            active: !product.active,
            method:  "_post"
        });
        product.active = !product.active;
    }

    let tab = "details";
</script>

<li class="product" class:editing={expanded} class:active="{product.active}" class:inactive="{!product.active}">
    <span class="title" on:click={() => expanded = !expanded}>
        {product.title}
    </span>
<span><i class="fa active-status" class:fa-toggle-on="{product.active}" class:fa-toggle-off="{!product.active}" on:click={toggleActive}></i></span>
    {#if expanded}
        <section class="expanded">
            <div class="expand-nav">
                <div class:active-tab="{tab === "details"}" on:click={() => tab = "details"}>Details</div>
                <div class:active-tab="{tab === "formulas"}" on:click={() => tab = "formulas"}>Formulas</div>
            </div>

            {#if tab === "details"}
                {#each params as param}
                    <div>
                        <label for="">{param}</label>
                        <input type="text" class="form-control" bind:value={product[param]} on:change={save}>
                    </div>
                {/each}
            {/if}

            {#if tab === "formulas"}
                <Formulas {product}/>
            {/if}


            <div class="btn btn-outline-danger pull-right" on:click={() => {
                expanded = false; 
                remove(product.id)
            }}>Remove</div>
        </section>
    {/if}
</li>

<style>
    .editing .expanded, .editing .title {
        padding: 14px;
        background: antiquewhite;
        display: block;
    }

    .editing .title {
        font-weight: bold;
    }

    .pull-right {
        float:right;
        display: inline-block;
    }
    
    .active .fa {
        color: green;
    }

    .inactive .title, .inactive .fa {
        color: gray
    }

    .expand-nav {
        display: flex;
        max-width: 50%;
        /* border: 1px solid #000; */
        margin: 0 auto;
    }

    .expand-nav > div {
        flex: 1 1 50%;
        text-align: center;
        padding: 14px;
    }

    .expand-nav .active-tab {
        background: #000;
        color: #fff;
    }
</style>