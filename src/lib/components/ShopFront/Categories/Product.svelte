<script>
    export let product;
</script>

<div class="left-div left-text">
                        <div class="product">
                            <div class="thumbnail">
                                <div class="img-wrapper">
                                <a href="/products/{product.id}">
                                        <img src="{product.image_url}" alt="">
                                    </a>
                                </div>
                                <section class="bottom-card">
                                    <h1 class="text-center product-cost">${product.price}</h1>
                                    <small class="text-center" style="display:block;">{product.group_size} Per Order</small>
                                    <h4 class="text-center product-title">
                                        {product.title.split("(")[0]}
                                        {#if product.title.split("(")[1]}
                                            <br>
                                            ({product.title.split("(")[1]}
                                        {/if}
                                    </h4>
                                    
                                    <small class="text-center" style="display:block;">Minimum {product.minimum}</small>
                                </section>
                            </div>
                        </div>
                    </div>
<style>

    .left-text {
        text-align: center;
    }

.left-text, .right-text {
    font: 14px 'Source Code Pro', monospace;
    color: #333;
}
.left-div {
    display: inline-block;
    max-width: 300px;
    text-align: left;
    border-radius: 3px;
    vertical-align: top;
}

.product img {
    border: 10px solid transparent;
    transition: 0.5s;
}

.img-wrapper img {
}
.product img:hover {
    border: 10px solid #d68c9c;
    transition: 0.5s;
}

.product img {
        max-width: 100% !important;
}

	@media screen and (max-width: 600px) {
		.left-div, .right-div {
            display: block;
        } 
	}
/* @media screen and (max-width: 600px)
.left-div, .right-div {
    max-width: 100%;
} */
</style>