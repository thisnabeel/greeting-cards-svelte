<script>
    export let cart;
    export let remove;

    export let removable = true;
</script>

<ul class="cart-list" style="display: block;">
                    {#each cart || [] as line}
                        <li>
                            {#if removable}
                                <span class="fa fa-remove remove-cp cp-remove" data-index="0" on:click={() => remove(line)}></span>
                            {/if}
                            <div class="cp-head">
                                <span class="cp-cost">
                                    ${line.price} <i class="fa fa-arrow-right"></i>
                                </span>
                                <span class="cp-quantity">
                                    {line.quantity}x
                                </span>
                                <span class="cp-title">
                                    {line.product.title}
                                </span>
                            </div>
                            <span class="cp-requests" count="0">
                                
                            </span>
                        </li>
                    {/each}
                </ul>

<style>
.cp-head {
    padding: 13px;
}

.cp-remove {
    position: absolute;
    left: -27px;
    top: 26px;
    color: #ccc;
}

li {
    list-style: none;
}
.cart-list > li, .invoice-list > li {
    border-radius: 20px;
    box-shadow: 0px 1px 5px -1px rgb(254 164 127);
    position: relative;
    border-radius: 10px;
}


</style>