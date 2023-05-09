<script>
    import Api from "$lib/api/api.js";

    export let material;
    export let sendUp;
    export let remove;


    $: console.log(material)
    $: sendUp(material)

    let estimate;

    $: estimate = Math.round((material.cost / material.makes) * 100) / 100;

    let updateTimer;
    function save() {
        clearTimeout(updateTimer);
		updateTimer = setTimeout(async () => {
            material.method = "_post";
			const response = await Api.put('/materials/' + material.id + '.json', material);
			// let response = await Api.get("/abstractions/"+abstraction.id+".json")
			console.log('response', response);
		}, 250);
    }
</script>

<li class="material" style="position: relative;">
    <div class="row">
        <div class="col-lg-4 col-md-4 col-sm-4 estimate-container">
            <div class="estimate" style="font-size: 40px;">${estimate}</div>
            <div class="fa fa-times remove" on:click={remove}></div>
        </div>
        <div class="col-lg-8 col-md-8 col-sm-8">
            <label for="">Generic:</label>
            <input type="text" style="font-size: 30px;" class="form-control" on:change={save} bind:value={material.generic}>
        </div>
    </div>
                        <hr>
                        <div class="row">
                            <div class="col-lg-4 col-md-4 col-sm-4">
                                <label for="">
                                    Specific:
                                </label>
                                <input type="text" class="form-control" on:change={save} bind:value={material.specific}>
                            </div>
                            <div class="col-lg-4 col-md-4 col-sm-4">
                                <label for="">
                                    Cost:
                                </label>
                                <input type="text" class="form-control" on:change={save} bind:value={material.cost}>
                            </div>
                            <div class="col-lg-4 col-md-4 col-sm-4">
                                <label for="">
                                    Makes:
                                </label>
                                <input type="text" class="form-control" on:change={save} bind:value={material.makes}>
                            </div>
                        </div>
                    </li>

<style>
    .estimate-container {
        align-self: center;
        text-align: center;
        padding-top: 20px;
    }
     .material {
        padding: 30px;
            background: #dcf5f4;
            display: block;
            margin-top: 10px;
            border-radius: 10px;
     }

     .remove {
        position: absolute;
        top: 10px;
        right: 10px;
     }
</style>