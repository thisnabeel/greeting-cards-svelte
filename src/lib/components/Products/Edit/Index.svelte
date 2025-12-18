<script>
    import Category from "./Category/Index.svelte"
    import Api from "$lib/api/api"
    import {onMount} from "svelte"
    let categories = [];
    let newCategoryTitle = "Greeting Cards";
    let draggedIndex = null;
    let draggedOverIndex = null;
    
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

    function handleDragStart(event, index) {
        draggedIndex = index;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target);
    }

    function handleDragOver(event, index) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (draggedOverIndex !== index) {
            draggedOverIndex = index;
        }
    }

    function handleDragLeave() {
        // Only clear if we're not hovering over another item
        setTimeout(() => {
            if (draggedOverIndex !== null) {
                draggedOverIndex = null;
            }
        }, 50);
    }

    async function handleDrop(event, dropIndex) {
        event.preventDefault();
        event.stopPropagation();
        draggedOverIndex = null;
        
        if (draggedIndex === null || draggedIndex === dropIndex) {
            draggedIndex = null;
            return;
        }

        // Reorder categories array
        const reorderedCategories = [...categories];
        const [draggedCategory] = reorderedCategories.splice(draggedIndex, 1);
        reorderedCategories.splice(dropIndex, 0, draggedCategory);

        // Update positions and save to API
        const updates = reorderedCategories.map(async (cat, index) => {
            const newPosition = index + 1;
            try {
                const updated = await Api.put(`/categories/${cat.id}.json`, {
                    category: {
                        position: newPosition
                    }
                });
                cat.position = updated.position;
            } catch (error) {
                console.error(`Error updating category ${cat.id}:`, error);
            }
        });

        await Promise.all(updates);
        categories = reorderedCategories;
        draggedIndex = null;
    }

    function handleDragEnd() {
        draggedIndex = null;
        draggedOverIndex = null;
    }
</script>

<br><br>
<ul class="clean-list categories-list">
    {#each categories as category, index}
        <Category 
            {category} 
            {categories}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            isDragging={draggedIndex === index}
            isDragOver={draggedOverIndex === index}
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

