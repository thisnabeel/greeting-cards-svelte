<script>

    import Api from "$lib/api/api.js";
    export let customization;
    export let remove;

    let expand = false;

    let updateTimer;
    function save() {
        clearTimeout(updateTimer);
		updateTimer = setTimeout(async () => {
            customization.method = "_post";
			const response = await Api.put('/customizations/' + customization.id + '.json', customization);
			// let response = await Api.get("/abstractions/"+abstraction.id+".json")
			console.log('response', response);
		}, 500);
    }


</script>

<li class="customization">

                    <!-- <div class="start">
                        <i class="fa fa-expand" on:click={() => expand = !expand}></i>
                        <input type="text" class="form-control" bind:value={customization.title} on:change={save}>
                        <i class="fa fa-remove" on:click={remove}></i>
                    </div> -->
                    <div class="row">
                        <div class="col-lg-8 col-md-8 col-sm-8">
                            <label for="">Title:</label>
                            <input type="text" class="form-control" bind:value={customization.title} on:change={save}>
                        </div>


                        <div class="col-lg-4 col-md-4 col-sm-4">
                            <label for="">Cost:</label>
                            <input type="text" class="form-control" bind:value={customization.cost} on:change={save}>
                        </div>
                    </div>

                        <div>
                                <label for="">Choices:</label>
                                <input type="text" class="form-control" bind:value={customization.choices} on:change={save}>
                            </div>

                
            </li>

<style>
    .customization {
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