<script>

    import Material from "./Material/Show.svelte";
    import Api from "$lib/api/api.js";
    export let formula;
    export let remove;
    export let duplicate;

    let expand = false;

    $: console.log("for", formula)

    async function addMaterial() {
        const response = await Api.post("/materials.json", {
            generic: "new",
            cost: 0,
            makes: 0,
            formula_id: formula.id
        })
        console.log("respone", response)
        formula.materials = [...formula.materials, response]
    }
    let estimate;

    function handleUpdate(payload) {
        // console.log(payload)
        console.log(formula.materials);
        estimateCost()
        //  Math.round((material.cost / material.makes) * 100) / 100;
    }
    
    let updateTimer;
    function save() {
        clearTimeout(updateTimer);
		updateTimer = setTimeout(async () => {
			const response = await Api.put('/formulas/' + formula.id + '.json', {
                title: formula.title,
                method: "_post",
            });
			// let response = await Api.get("/abstractions/"+abstraction.id+".json")
			console.log('response', response);
		}, 500);
    }
    
    function estimateCost() {
        estimate = formula.materials.reduce((acc, material) => {
            return acc + (Math.round((material.cost / material.makes) * 100) / 100);
        }, 0.0)
    }
    estimateCost()

     async function handleRemove(id) {
        const deleted = await Api.delete("/materials/"+id+".json");
        formula.materials = formula.materials.filter(p => p.id !== id);
    }
</script>

<li class="formula">

                <div class="flex">
                    <div>
                        <h1>${(Math.round((estimate) * 100) / 100)}</h1>
                    </div>
                    <div class="start">
                        <i class="fa fa-expand" on:click={() => expand = !expand}></i>
                        <input type="text" class="form-control" bind:value={formula.title} on:change={save}>
                        <i class="fa fa-remove" on:click={remove}></i>
                        <i class="fa fa-copy" on:click={duplicate}></i>
                    </div>
                </div>

                {#if expand}
                    <ul class="formula clean-list">
                        {#each formula.materials as material}
                            <Material {material} remove={() => handleRemove(material.id)} sendUp={(payload) => handleUpdate(payload)}></Material>
                        {/each}
                    </ul>
                    <div class="addMaterial btn btn-info" on:click={addMaterial}><i class="fa fa-plus"></i></div>
                {/if}
            </li>

<style>
    .formula {
        padding: 12px;
        background: #efdfc9;
        list-style: none;
        margin: 10px 0;
    }

    .start {
        align-self: center;
    }
     .start > * {
         display: inline;
     }

     .start > input {
         width: 90%;
     }

     .flex {
         display: flex;
     }

     .flex > div:nth-child(1) {
             width: max-content;
            padding: 20px;
     }

     .flex > div:nth-child(2) {
             width: 100%;

     }
</style>