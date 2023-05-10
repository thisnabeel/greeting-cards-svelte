<script>
    export let customization;

    // $: multiple = customization.choices && customization.choices.includes(", ")
    // $: bool = customization.choices && !customization.choices.includes(", ")
    $: choices = customization.choices;
</script>



    <table class="table">
        <tr>
            <td >
                <h2>{customization.title}</h2>
            </td>
            <td>
                {#if !choices || !customization.choices.includes(", ")}
                    <div>
                        <input type="checkbox" >
                    </div>
                {:else}
                    <div>
                        <select name="" class="form-control" id="">
                            <option value=""></option>
                            {#each choices.split(", ") as option}
                                <option value={option}>{option}</option>
                            {/each}
                        </select>
                    </div>
                {/if}
            </td>
        </tr>

    </table>


<style>

    input[type=checkbox] {
        transform: scale(3.5);
}
    .flex {
        display: flex;
        text-align: center;
    }

    .flex > * {
        flex: 1 1 50%;
    }
</style>