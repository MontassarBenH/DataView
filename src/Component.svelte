<script>
  import { getContext } from "svelte";
  import { onMount } from 'svelte';

  export let dataTablejourney;
  let journeyData = [];
  let allJourneyItems = [];
  let editingJourneyItemId = null;
  let error = null;
  let loading = true;
  let message = null;
  let editingJourney = null;
  let showDeleteConfirm = false;
  let journeyToDelete = null;
  let editingId = null;


  const { styleable, API } = getContext("sdk");
  const component = getContext("component");




  const loadJourneys = async () => {
  try {
    console.log("Data Table Object:", dataTablejourney);
    console.log("Table ID (raw):", dataTablejourney.tableId);
    
    const tableId = typeof dataTablejourney.tableId === 'object' ? dataTablejourney.tableId.id : dataTablejourney.tableId;
    console.log("Table ID (processed):", tableId);
    
    if (!tableId) {
      throw new Error("Invalid table ID");
    }
    
    const res = await API.searchTable({
      tableId: tableId,
      query: {
        greater: {
          id: 0
        }
      },
      paginate: false,
      limit: 100
    });

    console.log("API Response:", JSON.stringify(res, null, 2));
    
    if (res && Array.isArray(res.rows)) {
      journeyData = res.rows;
      if (journeyData.length === 0) {
        console.log("API returned empty rows.");
        error = "No journeys found. The journey table appears to be empty.";
      } else {
        console.log("Journeys loaded:", journeyData);
      }
    } else {
      journeyData = [];
      console.log("Invalid response format or unexpected response:", res);
      error = "Invalid response format from API.";
    }
  } catch (err) {
    console.error('Failed to load journeys:', err);
    error = `Error: ${err.message}`;
  } finally {
    loading = false;
  }
};



function isJourneyItem(item) {
    return item && item.tableId && item.tableId.includes('journey_item');
  }

  function getVideoThumbnail(url) {
  return `<video src="${url}" controls></video>`;
}


const fetchJourneyItemTitles = async () => {
  try {
    const journeyItemsTableId = 'your_journey_items_table_id';
    const res = await API.searchTable({
      tableId: journeyItemsTableId,
      query: {
        greater: {
          id: 0
        }
      },
      paginate: false,
      limit: 1000,
      fields: ['title'] 
    });

    if (res && Array.isArray(res.rows)) {
    
      const journeyItemTitles = res.rows.map(item => item.title);
      return journeyItemTitles;
    } else {
      console.error("Failed to fetch journey item titles");
      return [];
    }
  } catch (err) {
    console.error('Failed to fetch journey item titles:', err);
    return [];
  }
};

const deleteJourney = async () => {
  console.log("Attempting to delete journey:", journeyToDelete);
  try {
    if (!journeyToDelete) {
      throw new Error("No journey selected for deletion.");
    }

    loading = true;
    error = null;
    message = null;

   
    const tableId = typeof dataTablejourney.tableId === 'object' ? dataTablejourney.tableId.id : dataTablejourney.tableId;
    console.log("Table ID:", tableId);

    if (!tableId) {
      throw new Error("Invalid table ID");
    }

    if (!journeyToDelete.id) {
      throw new Error("Invalid journey object or missing ID");
    }

    console.log("Journey ID:", journeyToDelete.id);

    const deleteUrl = `/api/tables/${tableId}/rows/${journeyToDelete.id}`;
    console.log("Delete URL:", deleteUrl);

    const result = await API.request({
      method: 'DELETE',
      url: `/api/datasource_plus_${tableId}/rows/${journey.id}`,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: journey.id })
    });

    console.log("Delete result:", result);

    message = "Journey deleted successfully.";
    closeDeleteConfirm(); 
    await loadJourneys();
  } catch (err) {
    console.error('Failed to delete journey:', err);
    error = `Error deleting journey: ${err.message}`;
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
  } finally {
    loading = false;
  }
};

  const openDeleteConfirm = (journey) => {
  console.log("Open delete confirm for journey:", journey);
  journeyToDelete = journey;
  showDeleteConfirm = true;
};

  const confirmDelete = (journey) => {
    if (confirm("Are you sure you want to delete this journey?")) {
      deleteJourney(journey);
    }
  };


  const closeDeleteConfirm = () => {
    journeyToDelete = null;
    showDeleteConfirm = false;
  };

  const startEditing = async (journeyId) => {
  editingId = journeyId;
  await fetchJourneyItemTitles();
};

  const cancelEditing = () => {
    editingId = null;
  };

  const startEditingJourneyItem = (itemId) => {
    editingJourneyItemId = itemId;
  };

  const cancelEditingJourneyItem = () => {
    editingJourneyItemId = null;
  };


  const saveJourneyItem = async (item) => {
    try {
      loading = true;
      error = null;
      message = null;
      const tableId = item.tableId;

      const preparedItem = {
        ...item,
        id: undefined
      };

      Object.keys(preparedItem).forEach(key => 
        preparedItem[key] === undefined && delete preparedItem[key]
      );

      const result = await API.saveRow({
        tableId: tableId,
        ...preparedItem
      });

      message = "Journey item updated successfully.";
      editingJourneyItemId = null;
      await loadJourneys();
    } catch (err) {
      console.error('Failed to update journey item:', err);
      error = `Error updating journey item: ${err.message}`;
    } finally {
      loading = false;
    }
  };

  const deleteJourneyItem = async (item) => {
    if (confirm("Are you sure you want to delete this journey item?")) {
      try {
        loading = true;
        error = null;
        message = null;

        const tableId = item.tableId;

        const result = await API.request({
          method: 'DELETE',
          url: `/api/${tableId}/rows/${item.id}`,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: item.id })
        });

        message = "Journey item deleted successfully.";
        await loadJourneys();
      } catch (err) {
        console.error('Failed to delete journey item:', err);
        error = `Error deleting journey item: ${err.message}`;
      } finally {
        loading = false;
      }
    }
  };

  const saveJourney = async (journey) => {
  try {
    loading = true;
    error = null;
    message = null;
    const tableId = typeof dataTablejourney.tableId === 'object' ? dataTablejourney.tableId.id : dataTablejourney.tableId;
    
    console.log("Attempting to save journey:", journey);
    console.log("Table ID:", tableId);

 
    const preparedJourney = {
      ...journey,
      journey_items: journey.selectedJourneyItems || null,
      id: undefined
    };


    Object.keys(preparedJourney).forEach(key => 
      preparedJourney[key] === undefined && delete preparedJourney[key]
    );

    console.log("Prepared journey object:", preparedJourney);

  
    const result = await API.saveRow({
      tableId: tableId,
      ...preparedJourney
    });

    console.log("Save result:", result);

    message = "Journey updated successfully.";
    editingId = null;
    await loadJourneys();
  } catch (err) {
    console.error('Failed to update journey:', err);
    error = `Error updating journey: ${err.message}`;
    if (err.response) {
      console.error('Error response:', err.response);
    }
  } finally {
    loading = false;
  }
};



onMount(async () => {
  console.log("Available API methods:", Object.keys(API));

      if (typeof API.delete !== 'function') {
        console.error("API.delete method is not available!");
      }
      await loadJourneys();
    });
</script>

<div use:styleable={$component.styles}>
  <div id="journeysDiv">
    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else if message}
      <p class="message">{message}</p>
    {/if}

    {#if journeyData.length > 0}
  <ul class="journey-list">
    {#each journeyData as item}
      <li class="journey-item">
        {#if isJourneyItem(item)}
          <!-- Display Journey Item -->
          <div class="journey-item-container">
            <div class="journey-item-media">
              {#if item.media}
                {@html getVideoThumbnail(item.media)}
              {:else}
                <div class="no-media">No Media</div>
              {/if}
            </div>
            <div class="journey-item-content">
              {#if editingJourneyItemId === item.id}
                <!-- Edit mode -->
                <h3><input bind:value={item.title} placeholder="Title" /></h3>
                <p><textarea bind:value={item.description} placeholder="Description"></textarea></p>
                <p><input bind:value={item.media} placeholder="Media URL" /></p>
                <p class="internal-comment">Internal Comment: <input bind:value={item.internal_comment} placeholder="Internal Comment" /></p>
                <p class="journey-text">Journey: <input bind:value={item.journey_text} placeholder="Journey" /></p>
              {:else}
                <!-- Display mode -->
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {#if item.internal_comment}
                  <p class="internal-comment">Internal Comment: {item.internal_comment}</p>
                {/if}
                <p class="journey-text">Journey: {item.journey_text}</p>
              {/if}
              <div class="journey-item-actions">
                {#if editingJourneyItemId === item.id}
                  <button class="save-btn" on:click={() => saveJourneyItem(item)}>Save</button>
                  <button class="cancel-btn" on:click={cancelEditingJourneyItem}>Cancel</button>
                {:else}
                  <button class="edit-btn" on:click={() => startEditingJourneyItem(item.id)}>Edit</button>
                  <button class="delete-btn" on:click={() => deleteJourneyItem(item)}>Delete</button>
                {/if}
              </div>
            </div>
          </div>
        {:else}
              <!-- Display Journey (existing code) -->
              {#if editingId === item.id}
              <div class="journey-edit">
                <input bind:value={item.title} placeholder="Title" />
                <textarea bind:value={item.description} placeholder="Description"></textarea>
                
                <div class="journey-items-select">
                  <h4>Select Journey Items:</h4>
                  {#each allJourneyItems as journeyItem (journeyItem.id)}
                    <label>
                      <input type="checkbox" 
                            bind:group={item.selectedJourneyItems} 
                            value={journeyItem.id} />
                      {journeyItem.title || journeyItem.primaryDisplay}
                    </label>
                  {/each}
                </div>

                <div class="journey-actions">
                  <button class="save-btn" on:click={() => saveJourney(item)}>Save</button>
                  <button class="cancel-btn" on:click={cancelEditing}>Cancel</button>
                </div>
              </div>
            {:else}
                <div class="journey-header">
                  <h3>{item.title}</h3>
                  <div class="journey-actions">
                    <button class="edit-btn" on:click={() => startEditing(item.id)}>Edit</button>
                    <button class="delete-btn" on:click={() => confirmDelete(item)}>Delete</button>
                  </div>
                </div>
                <p>{item.description}</p>
              {/if}
              {#if item.journey_item && item.journey_item.length > 0}
                <h4>Journey Items:</h4>
                <ul class="journey-items">
                  {#each item.journey_item as journeyItem}
                    <li class="journey-subitem">
                      
                      <div class="journey-subitem-content">
                        <h5>{journeyItem.title || journeyItem.primaryDisplay}</h5>
                        {#if journeyItem.description}
                          <p>{journeyItem.description}</p>
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
    {:else if !loading}
      <p>No data found. The table is currently empty.</p>
    {/if}
  </div>
</div>

<style>
.journey-items-select {
    margin-top: 1em;
    border: 1px solid #ccc;
    padding: 1em;
    border-radius: 4px;
  }

  .journey-items-select label {
    display: block;
    margin-bottom: 0.5em;
  }

  .journey-items-select input[type="checkbox"] {
    margin-right: 0.5em;
  }
.journey-item-content input,
.journey-item-content textarea {
  width: 100%;
  padding: 5px;
  margin: 5px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.journey-item-content h3 input {
  font-size: 1.4em;
  font-weight: bold;
}

.journey-item-content textarea {
  min-height: 100px;
  resize: vertical;
}

.journey-item-content .internal-comment input,
.journey-item-content .journey-text input {
  display: inline-block;
  width: calc(100% - 150px);
  margin-left: 10px;
}
  
  .journey-item-container,
  .journey-subitem {
    display: flex;
    margin-bottom: 1em;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  .journey-item-media {
  flex: 0 0 300px; /* Increased from 120px */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 10px;
}



.no-media {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 169px;
  width: 300px;
  background-color: #e0e0e0;
  color: #666;
  font-size: 0.8em;
}

  .journey-item-content,
  .journey-subitem-content {
    flex: 1;
    padding: 10px;
  }

  .internal-comment {
    font-style: italic;
    color: #666;
  }

  .journey-text {
    font-weight: bold;
  }

  .journey-items {
    list-style-type: none;
    padding-left: 0;
  }

  .journey-subitem h5 {
    margin: 0 0 0.5em 0;
  }
  .journey-list {
    list-style-type: none;
    padding: 0;
  }

  .journey-item {
    margin-bottom: 2em;
    padding: 1.5em;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .journey-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1em;
  }

  .journey-actions {
    display: flex;
    gap: 0.5em;
  }

  .journey-edit input,
  .journey-edit textarea {
    width: 100%;
    margin-bottom: 1em;
    padding: 0.5em;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  h3 {
    margin: 0;
    color: #333;
    font-size: 1.4em;
  }

  p {
    margin: 0 0 1em;
    color: #666;
  }

  h4 {
    margin: 1em 0 0.5em;
    color: #444;
    font-size: 1.1em;
  }

  .journey-items {
    list-style-type: disc;
    padding-left: 1.5em;
    color: #555;
  }

  .journey-items li {
    margin-bottom: 0.3em;
  }

  .error {
    color: #d32f2f;
    font-weight: bold;
  }

  .message {
    color: #2196f3;
    font-weight: bold;
  }

  button {
    padding: 0.5em 1em;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    transition: background-color 0.3s;
  }

  .edit-btn, .save-btn {
    background-color: #4caf50;
    color: white;
  }

  .edit-btn:hover, .save-btn:hover {
    background-color: #45a049;
  }

  .delete-btn {
    background-color: #f44336;
    color: white;
  }

  .delete-btn:hover {
    background-color: #d32f2f;
  }

  .cancel-btn {
    background-color: #f0f0f0;
    color: #333;
  }

  .cancel-btn:hover {
    background-color: #e0e0e0;
  }
</style>