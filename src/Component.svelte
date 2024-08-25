<script>
  import { getContext } from "svelte";
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { derived, writable } from 'svelte/store';
  import { tick } from 'svelte';




  export let dataTablejourney;
  export let dataTablejourneyitems;
  export let journeyHide;

  let journeyData = [];

  let editingJourneyItemId = null;
  let error = null;
  let loading = true;
  let showSuccessModal = false;
  let successMessage = '';
  let message = null;
  let mounted = false;
  let showDeleteConfirm = false;
  let showDeleteConfirmitem = false;
  let itemToDelete = null;
  let journeyToDelete = null;
  let editingId = null;
  let journeyFilter = "";
  let journeyItemFilter = "";
  let journeySortOrder = 'desc';
  let showNewItemOverlay = false;
  let currentEditingJourney = null;
  let creatingNewJourney = false;


  const journeyDataStore = writable([]);
  const allJourneyItemsStore = writable([]);

  let allJourneyItems;
  allJourneyItemsStore.subscribe(value => {
    allJourneyItems = value;
  });
  



  const { styleable, API } = getContext("sdk");
  const component = getContext("component");
  const dispatch = createEventDispatcher();

 const refreshDisplay = () => {
    journeyDataStore.set([...journeyData]);
    allJourneyItems = [...allJourneyItems];
};




  // New Item Template
  let newJourneyItem = {
    title: '',
    description: '',
    media: '',
    ranking: null,
    journey_id: null
  };

  const showSuccess = (message) => {
  // Set a small delay to ensure other operations complete first
  setTimeout(() => {
    successMessage = message;
    showSuccessModal = true;
  }, 100);
};

  const closeSuccessModal = async () => {
    showSuccessModal = false;
    await reloadData();
    refreshDisplay();
  };

  const loadAllData = async () => {
    try {
      loading = true;
      await loadJourneyItems(); 
      await loadJourneys();
      
    } catch (err) {
      console.error('Error during initialization:', err);
      error = `Initialization error: ${err.message}`;
    } finally {
      loading = false;
    }
  };

  const loadJourneys = async (journeyId = null) => {
  try {
    // Retrieve the tableId from dataTablejourney object.
    // If dataTablejourney.tableId is an object, extract its 'id' property; otherwise, use it directly.
    const tableId = typeof dataTablejourney.tableId === 'object' ? dataTablejourney.tableId.id : dataTablejourney.tableId;

    if (!tableId) {
      throw new Error("Invalid journey table ID");
    }

    let res;
    if (journeyId) {
      res = await API.searchTable({
        tableId: tableId,
        query: {
          equal: {
            id: journeyId
          }
        },
        paginate: false,
        limit: 1
      });
    } else {
      res = await API.searchTable({
        tableId: tableId,
        query: {
          greater: {
            id: 0
          }
        },
        paginate: false,
        limit: 100
      });
    }

    if (res && Array.isArray(res.rows)) {
      journeyData = res.rows;
    } else {
      journeyData = [];
      error = "Invalid response format from API for journeys.";
    }
  } catch (err) {
    console.error('Failed to load journeys:', err);
    error = `Error: ${err.message}`;
  }
};

const loadJourneyItems = async () => {
  try {
    const tableId = typeof dataTablejourneyitems.tableId === 'object' ? dataTablejourneyitems.tableId.id : dataTablejourneyitems.tableId;
    
    if (!tableId) {
      throw new Error("Invalid journey items table ID");
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
    
    if (res && Array.isArray(res.rows)) {
      const updatedItems = res.rows.map(item => ({
        ...item,
        ranking: item.ranking !== undefined ? Number(item.ranking) : null
      }));
      allJourneyItemsStore.set(updatedItems);  
    } else {
      allJourneyItemsStore.set([]);  
      error = "Invalid response format from API for journey items.";
    }
  } catch (err) {
    console.error('Failed to load journey items:', err);
    error = `Error: ${err.message}`;
  }
};

    // Journey CRUD Functions

    const startCreatingNewJourney = () => {
      creatingNewJourney = true;
      currentEditingJourney = {
        id: null,  // Explicitly set to null for new journeys
        title: '',
        description: '',
        journey_item: []
      };
    };

    const saveJourney = async () => {
  try {
    // Validation
    if (!currentEditingJourney.title || currentEditingJourney.title.trim() === '') {
      throw new Error("Journey title cannot be blank");
    }

    loading = true;
    error = null;
    message = null;
    const journeyTableId = typeof dataTablejourney.tableId === 'object' ? dataTablejourney.tableId.id : dataTablejourney.tableId;
    const itemsTableId = typeof dataTablejourneyitems.tableId === 'object' ? dataTablejourneyitems.tableId.id : dataTablejourneyitems.tableId;
    
    // Prepare the journey object
    const preparedJourney = {
      ...currentEditingJourney,
      journey_item: Array.isArray(currentEditingJourney.journey_item)
        ? currentEditingJourney.journey_item
            .filter(item => !item.isNew)
            .map(item => ({ _id: item.id }))
        : [],
        id: currentEditingJourney.id
    };

    // Save journey (this will update if id exists, or create new if it doesn't)
    const journeyResult = await API.saveRow({
      tableId: journeyTableId,
      ...preparedJourney
    });

    // Update existing journey items and create new ones
    const itemUpdatePromises = currentEditingJourney.journey_item.map(async (item) => {
      const journeyItemData = {
        ...item,
        journey_id: journeyResult.id,
        id: item.isNew ? undefined : item.id  // Remove id for new items
      };
      delete journeyItemData.isNew;  // Remove the isNew flag
      return API.saveRow({
        tableId: itemsTableId,
        ...journeyItemData
      });
    });

    const updatedItems = await Promise.all(itemUpdatePromises);

    showSuccess("Journey and all items updated successfully.");

    // Update the current editing journey with the latest data
    currentEditingJourney = { ...journeyResult, journey_item: updatedItems };
    editingId = journeyResult.id;

    // Reload data
    await reloadData(editingId);
    refreshDisplay();

    return true;

  } catch (err) {
    console.error('Failed to update journey:', err);
    error = `Error updating journey: ${err.message}`;
    if (err.response) {
      console.error('Error response:', err.response);
    }
    return false;
  } finally {
    loading = false;
  }
};

const fetchRelatedItems = async (journeyId) => {
  try {
    const itemsTableId = typeof dataTablejourneyitems.tableId === 'object' ? dataTablejourneyitems.tableId.id : dataTablejourneyitems.tableId;
    
    if (!itemsTableId) {
      throw new Error("Invalid journey items table ID");
    }
    
    const res = await API.searchTable({
      tableId: itemsTableId,
      query: {
        equal: {
          journey_id: journeyId
        }
      },
      paginate: false,
      limit: 1000 
    });
    
    console.log("API response for related items:", res);

    if (res && Array.isArray(res.data)) {
      return res.data;
    } else if (res && Array.isArray(res.rows)) {
      return res.rows;
    } else {
      console.error("Unexpected response format:", res);
      return [];
    }
  } catch (err) {
    console.error('Failed to fetch related journey items:', err);
    return [];
  }
};

const deleteJourney = async (journey) => {
  console.log("Attempting to delete journey:", JSON.stringify(journey, null, 2));
  try {
    loading = true;
    error = null;
    message = null;

    if (!journey || !journey.id) {
      throw new Error("Invalid journey object");
    }

    // 1. Fetch all related journey items
    const relatedItems = await fetchRelatedItems(journey.id);
    console.log(`Found ${relatedItems.length} related items for journey ${journey.id}`);

    // 2. Delete all related journey items
    const itemsTableId = typeof dataTablejourneyitems.tableId === 'object' ? dataTablejourneyitems.tableId.id : dataTablejourneyitems.tableId;
    
    for (const item of relatedItems) {
      console.log(`Deleting journey item: ${item.id}`);
      try {
        const itemDeleteResult = await API.deleteRow({
          tableId: itemsTableId,
          rowId: item.id
        });
        console.log(`Delete result for item ${item.id}:`, itemDeleteResult);
      } catch (itemError) {
        console.error(`Error deleting journey item ${item.id}:`, itemError);
        // Continue with other items even if one fails
      }
    }

    // 3. Delete the journey
    console.log(`Deleting journey: ${journey.id}`);
    const journeyTableId = typeof dataTablejourney.tableId === 'object' ? dataTablejourney.tableId.id : dataTablejourney.tableId;
    try {
      const journeyDeleteResult = await API.deleteRow({
        tableId: journeyTableId,
        rowId: journey.id
      });

      console.log(`Delete result for journey ${journey.id}:`, journeyDeleteResult);

      if (journeyDeleteResult) {
        showSuccess("Journey and all related items deleted successfully.");
        
        // 4. Update local data
        journeyData = journeyData.filter(j => j.id !== journey.id);
        allJourneyItems = allJourneyItems.filter(item => item.journey_id !== journey.id);

        closeDeleteConfirm();
        // Force a re-render
        refreshDisplay();
      } else {
        throw new Error("Failed to delete journey");
      }
    } catch (journeyError) {
      console.error(`Error deleting journey ${journey.id}:`, journeyError);
      throw journeyError;
    }
  } catch (err) {
    console.error('Failed to delete journey:', err);
    error = `Error deleting journey: ${err.message}`;
    if (err.response) {
      console.error('Error response:', err.response);
    }
  } finally {
    loading = false;
  }
};

const startEditing = async (journeyId) => {
  editingId = journeyId;
  const journey = journeyData.find(j => j.id === journeyId);
  if (journey) {
    // Create a deep copy to avoid unintended mutations
    currentEditingJourney = JSON.parse(JSON.stringify(journey));
    currentEditingJourney.journey_item = Array.isArray(currentEditingJourney.journey_item)
      ? currentEditingJourney.journey_item
      : [];

    // Fetch full journey item details and update the currentEditingJourney.journey_item
    const itemsTableId = typeof dataTablejourneyitems.tableId === 'object' ? dataTablejourneyitems.tableId.id : dataTablejourneyitems.tableId;
    const res = await API.searchTable({
      tableId: itemsTableId,
      query: {
        equal: {
          journey_id: journeyId
        }
      },
      paginate: false,
      limit: 1000
    });

    if (res && Array.isArray(res.rows)) {
      currentEditingJourney.journey_item = res.rows.map(item => ({
        ...item,
        ranking: Number(item.ranking) || 0
      }));
    } else {
      currentEditingJourney.journey_item = [];
    }

    // Sort the journey items by ranking
    currentEditingJourney.journey_item.sort(sortByRankingAscending);
  }
};

    const cancelEditing = () => {
        editingId = null;
        currentEditingJourney = null;
        creatingNewJourney = false;
      };

  // Journey Item CRUD Functions

 // Update the addNewJourneyItem function to set a default ranking
 const addNewJourneyItem = () => {
      const newItem = {
        title: '',
        description: '',
        media: '',
        ranking: Math.max(...currentEditingJourney.journey_item.map(item => item.ranking || 0), 0) + 1,
        journey_id: currentEditingJourney.id,
        isNew: true  // Flag to identify new items
      };
      currentEditingJourney.journey_item = [...currentEditingJourney.journey_item, newItem];
      // Force a re-render
      currentEditingJourney = { ...currentEditingJourney };
      refreshDisplay();

    };

const saveJourneyItem = async (item) => {
  try {
    loading = true;
    error = null;
    message = null;
    const tableId = dataTablejourneyitems.tableId;

    const preparedItem = {
      ...item,
      journey_id: currentEditingJourney.id,
      ranking: item.ranking !== undefined && item.ranking !== '' ? Number(item.ranking) : null,
      id: undefined
    };

    Object.keys(preparedItem).forEach(key => 
      preparedItem[key] === undefined && delete preparedItem[key]
    );

    const result = await API.saveRow({
      tableId: tableId,
      ...preparedItem
    });

    showSuccess("Journey item updated successfully.");
    editingJourneyItemId = null;

    // Update the item in currentEditingJourney
    const index = currentEditingJourney.journey_item.findIndex(i => i.id === item.id);
    if (index !== -1) {
      currentEditingJourney.journey_item[index] = { ...result };
    }

    // Force a re-render
    currentEditingJourney = { ...currentEditingJourney };

  } catch (err) {
    console.error('Failed to update journey item:', err);
    error = `Error updating journey item: ${err.message}`;
  } finally {
    loading = false;
  }
};



const deleteJourneyItem = async (item) => {
    try {
      loading = true;
      error = null;
      message = null;

      if (!item || !item.id) {
        throw new Error("Invalid journey item object");
      }

      const itemsTableId = typeof dataTablejourneyitems.tableId === 'object' ? dataTablejourneyitems.tableId.id : dataTablejourneyitems.tableId;

      console.log(`Deleting journey item: ${item.id}`);
      try {
        const itemDeleteResult = await API.deleteRow({
          tableId: itemsTableId,
          rowId: item.id
        });

        console.log(`Delete result for item ${item.id}:`, itemDeleteResult);

        if (itemDeleteResult) {
          showSuccess("Journey item deleted successfully.");

          // Update local data
          allJourneyItems = allJourneyItems.filter(i => i.id !== item.id);

          // Update the journeyData
          journeyData = journeyData.map(journey => {
            journey.journey_item
            return {
              ...journey,
              journey_item: journey.journey_item ? journey.journey_item?.filter(i => i.id !== item.id) : []
            }
          });

          // Force a re-render
          refreshDisplay();

          closeDeleteConfirmitem();
        } else {
          throw new Error("Failed to delete journey item");
        }
      } catch (itemError) {
        console.error(`Error deleting journey item ${item.id}:`, itemError);
        if (itemError.response && itemError.response.status === 403) {
          error = "You are not authorized to delete this journey item.";
        } else {
          error = `Error deleting journey item: ${itemError.message}`;
        }
      }
    } catch (err) {
      console.error('Failed to delete journey item:', err);
      error = `Error deleting journey item: ${err.message}`;
      if (err.response) {
        console.error('Error response:', err.response);
      }
    } finally {
      loading = false;
    }
};


  // Utility Functions


  const sortByRanking = (a, b) => {
  const rankingA = a.ranking !== undefined ? Number(a.ranking) : Infinity;
  const rankingB = b.ranking !== undefined ? Number(b.ranking) : Infinity;
  return rankingB - rankingA;
};

  const sortByRankingAscending = (a, b) => {
    const rankingA = a.ranking !== undefined ? Number(a.ranking) : Infinity;
    const rankingB = b.ranking !== undefined ? Number(b.ranking) : Infinity;
    return rankingA - rankingB;
  };


function getVideoThumbnail(url) {
  return `<video src="${url}" controls width="250" height="130"></video>`;
}

const sortById = (a, b, order) => {
    if (order === 'asc') {
      return a.id - b.id;
    } else {
      return b.id - a.id;
    }
  };

  const toggleSortOrder = (currentOrder) => {
    return currentOrder === 'asc' ? 'desc' : 'asc';
  };



  const filterJourneys = (journeys, filter) => {
  return journeys.filter(journey => 
    journey.title.toLowerCase().includes(filter.toLowerCase()) ||
    journey.description.toLowerCase().includes(filter.toLowerCase())
  );
};

const filterJourneyItems = (items, filter) => {
  return items.filter(item => 
    item.title.toLowerCase().includes(filter.toLowerCase()) ||
    item.description.toLowerCase().includes(filter.toLowerCase()) ||
    item.journey_text.toLowerCase().includes(filter.toLowerCase())
  );
};



const openDeleteConfirm = (journey) => {
  console.log("Open delete confirm for journey:", journey);
  journeyToDelete = journey;
  showDeleteConfirm = true;
};

const openDeleteConfirmitem = (item) => {
  console.log("Open delete confirm for item:", JSON.stringify(item, null, 2));
  itemToDelete = item;
  showDeleteConfirmitem = true;
};

const closeDeleteConfirmitem = () => {
  itemToDelete = null;
  showDeleteConfirmitem = false;
};

  const closeNewItemOverlay = () => {
    showNewItemOverlay = false;
    newJourneyItem = {
      title: '',
      description: '',
      media: '',
      ranking: null,
      journey_id: null
    };
  };

  const saveNewJourneyItem = async () => {
  try {
    loading = true;
    error = null;
    message = null;

    const tableId = dataTablejourneyitems.tableId;

    const result = await API.saveRow({
      tableId: tableId,
      ...newJourneyItem
    });

    showSuccess("New journey item added successfully.");
    closeNewItemOverlay();

    // Add the new item to currentEditingJourney
    currentEditingJourney.journey_item = [...currentEditingJourney.journey_item, result];

    // Force a re-render
    currentEditingJourney = { ...currentEditingJourney };
    refreshDisplay();


  } catch (err) {
    console.error('Failed to add new journey item:', err);
    error = `Error adding new journey item: ${err.message}`;
  } finally {
    loading = false;
  }
};



  const sortJourneyItemsByRanking = (a, b) => {
  return b.ranking - a.ranking;
};

  // Lifecycle
onMount(() => {
  
    if (!mounted) {
      loadAllData();
      mounted = true;
    }

    return () => {
      mounted = false;
    };
  });


      $: displayedJourneys = derived(journeyDataStore, $journeyData =>
      filterJourneys($journeyData, journeyFilter).sort((a, b) => sortById(a, b, journeySortOrder))
    );

    
        $: displayedJourneyItems = derived(journeyDataStore, $journeyData =>
      filterJourneys($journeyData.flatMap(j => j.journey_item), journeyItemFilter).sort(sortJourneyItemsByRanking)
    );

    $: sortedJourneyData = journeyData.map(journey => ({
      ...journey,
      journey_item: (journey.journey_item || []).map(item => ({
        ...item,
        ranking: Number(item.ranking) || 0
      })).sort(sortByRankingAscending)
    }));


        journeyData = journeyData.map(journey => ({
      ...journey,
      journey_item: journey.journey_item ? journey.journey_item.map((item, index) => ({
        ...item,
        ranking: Number(item.ranking) || index + 1
      })).sort(sortByRankingAscending) : []
    }));



  const closeDeleteConfirm = () => {
    journeyToDelete = null;
    showDeleteConfirm = false;
  };



  const reloadData = async (journeyId = null) => {
  loading = true;
  error = null;
  try {
    if (journeyId) {
      // Load only the current editing journey
      await loadJourneys(journeyId);
    } else {
      // Load all journeys
      await loadJourneys();
    }
    await loadJourneyItems();
    refreshDisplay();
  } catch (err) {
    console.error('Error reloading data:', err);
    error = `Error reloading data: ${err.message}`;
  } finally {
    loading = false;
  }
};


    
</script>

<div use:styleable={$component.styles}>
  {#if loading}
    <p>Loading...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if message}
    <p class="message">{message}</p>
  {:else}
  {#if !journeyHide}
  <div id="journeysDiv">
        <div class="container">
        <h2>Journeys</h2>
        <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={startCreatingNewJourney}>Create New Journey</button>
        </div>
     {#if currentEditingJourney && currentEditingJourney.journey_item}  
      <!-- Editing view for the specific journey -->
      <div class="journey-edit">
        <input type="text" bind:value={currentEditingJourney.title} placeholder="Title" class="edit-input" />
        <textarea bind:value={currentEditingJourney.description} placeholder="Description" class="edit-textarea"></textarea>
          <h3>Journey Items</h3>
          <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={addNewJourneyItem}>Add New Item</button>
         
        <ul class="journey-items-list">
          {#each (currentEditingJourney.journey_item || []).sort(sortByRankingAscending) as item (item.id || item.ranking)}
          <li class="journey-item">
              <div class="journey-item-container">
                <div class="journey-item-media">
                  {#if item.media}
                    <div class="video-container">
                      {@html getVideoThumbnail(item.media)}
                    </div>
                  {:else}
                    <div class="no-media">No media</div>
                  {/if}
                </div>
                <div class="journey-item-content">
                  <input type="text" bind:value={item.title} placeholder="Title" class="edit-input" />
                  <textarea bind:value={item.description} placeholder="Description" class="edit-textarea"></textarea>
                  <input type="text" bind:value={item.media} placeholder="Media URL" class="edit-input" />
                  {#if item.internal_comment !== undefined}
                    <input type="text" bind:value={item.internal_comment} placeholder="Internal Comment" class="edit-input" />
                  {/if}
                  <input type="number" bind:value={item.ranking} placeholder="Ranking" class="edit-input" min="0" step="1" />
                  <div class="journey-item-actions">
                    <button class="spectrum-Button spectrum-Button--warning spectrum-Button--sizeM" on:click={() => openDeleteConfirmitem(item)}>Delete</button>
                  </div>
                </div>
              </div>
            </li>
          {/each}
        </ul>

        <div class="journey-actions">
          <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={saveJourney}>Save Journey</button>
          <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={cancelEditing}>Close</button>
        </div>
      </div>
    {:else}
      <!-- List of journeys -->
      <div class="filter-sort-container">
        <input type="text" bind:value={journeyFilter} placeholder="Search journeys..." class="filter-input" />
      </div>
      {#if filterJourneys(journeyData, journeyFilter).length > 0}
        <ul class="journey-list">
          {#each filterJourneys(journeyData, journeyFilter).sort((a, b) => sortById(a, b, journeySortOrder)) as journey (journey.id)}
            <li class="journey-item">
              <div class="journey-header">
                <h3>{journey.title}</h3>
              </div>
              <p>{journey.description}</p>
              {#if journey.journey_item && journey.journey_item.length > 0}
                <h4>Journey Items:</h4>
                <ul class="journey-items">
                  {#each journey.journey_item.sort(sortByRankingAscending) as journeyItem (journeyItem._id)}
                    <li class="journey-item">
                      <span class="item-title">{journeyItem.title || journeyItem.primaryDisplay}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
              <div class="journey-actions">
                <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--cta gap-M svelte-4lnozm c454061e78c2a4775a343d673e7a8fb04-TdiW38gAi8-dom" on:click={() => startEditing(journey.id)}>Edit</button>
                <button class="spectrum-Button spectrum-Button--warning spectrum-Button--sizeM" on:click={() => openDeleteConfirm(journey)}>Delete</button>
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <p>No journeys found.</p>
      {/if}
    {/if}
  </div>
{/if}

{#if showNewItemOverlay}
  <div class="overlay">
    <div class="overlay-content">
      <h3>Add New Journey Item</h3>
      <input type="text" bind:value={newJourneyItem.title} placeholder="Title" class="edit-input" />
      <textarea bind:value={newJourneyItem.description} placeholder="Description" class="edit-textarea"></textarea>
      <input type="text" bind:value={newJourneyItem.media} placeholder="Media URL" class="edit-input" />
      <input type="number" bind:value={newJourneyItem.ranking} placeholder="Sorting" class="edit-input" min="0" step="1" />
      <div class="overlay-actions">
        <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={saveNewJourneyItem}>Save</button>
        <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={closeNewItemOverlay}>Close</button>
      </div>
    </div>
  </div>
{/if}

{#if showSuccessModal}
  <div class="success-modal">
    <div class="modal-content">
      <p>{successMessage}</p>
      <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={closeSuccessModal}>OK</button>
    </div>
  </div>
{/if}

{#if showSuccessModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <p>{successMessage}</p>
      <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={closeSuccessModal}>OK</button>
    </div>
  </div>
{/if}

  {#if showDeleteConfirmitem}
    <div class="delete-confirm-modal">
      <p>Are you sure you want to delete this journey item?</p>
      <button class="spectrum-Button spectrum-Button--warning spectrum-Button--sizeM" on:click={() => deleteJourneyItem(itemToDelete)}>Yes, Delete</button>
      <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={closeDeleteConfirmitem}>Cancel</button>
    </div>
  {/if}

      {#if showDeleteConfirm}
      <div class="delete-confirm-modal">
        <p>Are you sure you want to delete this journey?</p>
        <button class="spectrum-Button spectrum-Button--warning spectrum-Button--sizeM" on:click={() => deleteJourney(journeyToDelete)}>Yes, Delete</button>
        <button class="spectrum-Button spectrum-Button--sizeM spectrum-Button--primary gap-M svelte-4lnozm c0c157ac533e94fe7a15900bd7e58318a-dom" on:click={closeDeleteConfirm}>Cancel</button>
      </div>
    {/if}
  {/if}
</div>

<style>

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .overlay-content {
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    width: 80%;
    max-width: 500px;
  }

  .overlay-actions {
    margin-top: 1rem;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }


/* Filter and Sort Container */
.filter-sort-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.filter-input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px 0 0 8px;
  font-size: 16px;
}

.sort-button {
  padding: 10px 15px;
  background-color: #0e66cf;
  color: white;
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.sort-button:hover {
  background-color: #0d5cbf;
}

/* General Container Styling */
#journeysDiv
 {
  background-color: #fff;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 20px;
}

/* Headers */

.container {
  display: flex;
  justify-content: space-between;
  align-items: center; /* This centers the items vertically if needed */
  width: 100%; /* Optional, makes the container take full width */
}
h2 {
  font-size: 1.8em;
  color: #444;
  margin-bottom: 15px;
  border-bottom: 2px solid #eee;
  padding-bottom: 5px;
}

/* Journey Items List */
.journey-list,
.journey-items-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.journey-item {
  padding: 20px;
  list-style-type: none;
  border-radius: 6px;
  border: 1px solid #ddd;
  margin-bottom: 20px;
  background-color: #fafafa;
}



.journey-header h3 {
  font-size: 1.6em;
  margin: 0;
  color: #333;
}

/* Journey and Journey Item Edit Forms */
.journey-edit {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.edit-input,
.edit-textarea
 {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-sizing: border-box;
}

.edit-textarea{
  min-height: 100px;
}


.item-title {
  font-size: 1.1em; 
  color: #333; 
}

/* Journey Item Container */
.journey-item-container {
  display: flex;
  margin-bottom: 1em;
}

.journey-item-media {
  flex: 0 0 250px;
  margin-right: 20px;
}

.journey-item-content {
  flex: 1;
  margin-bottom: 15px;
}

.journey-item-content input,
.journey-item-content textarea {
  width: 100%;
  margin-bottom: 0.5em;
}

/* Media Handling */
.video-container,
.no-media {
  width: 250px;
  height: 130px;
}

.no-media {
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  color: #666;
}

.journey-item-media {
  float: right;
  margin-top: 50px;
  margin-right: 1em;
  margin-left: 20px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f5f5f5;
}


/* Actions Buttons */
.journey-actions,
.journey-item-actions {
  display: flex;
  gap: 10px;
  margin-top: 1em;
}

.red-button {
    background-color: red;
    border-color: red;
    color: white; /* Ensure the text is readable */
}

.journey-actions button,
.journey-item-actions button {
  padding: 6px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

/* Delete Confirmation Modal */
.delete-confirm-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #fff;
  padding: 30px;
  border-radius: 12px;
  z-index: 1000;
  border: 2px solid #ccc; 
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); 
}

.delete-confirm-modal button {
  margin: 10px;
  border-radius: 20px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
}


</style>
