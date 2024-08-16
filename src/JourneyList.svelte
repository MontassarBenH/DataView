<script>
    import { onMount } from 'svelte';
    import { journeyDataStore, journeyFilterStore, journeySortOrderStore, displayedJourneys } from './stores.js';
    import { loadJourneys, deleteRow } from './api.js';
    import JourneyItem from './JourneyItem.svelte';
  
    export let API;
    export let dataTablejourney;
    export let Deleterow;
  
    let error = null;
    let loading = true;
    let message = null;
    let showDeleteConfirm = false;
    let journeyToDelete = null;
  
    onMount(async () => {
      try {
        const tableId = typeof dataTablejourney.tableId === 'object' ? dataTablejourney.tableId.id : dataTablejourney.tableId;
        const journeys = await loadJourneys(API, tableId);
        journeyDataStore.set(journeys);
      } catch (err) {
        error = `Error: ${err.message}`;
      } finally {
        loading = false;
      }
    });
  
    const openDeleteConfirm = (journey) => {
      journeyToDelete = journey;
      showDeleteConfirm = true;
    };
  
    const closeDeleteConfirm = () => {
      journeyToDelete = null;
      showDeleteConfirm = false;
    };
  
    const deleteJourney = async () => {
      try {
        const payload = { _id: journeyToDelete.id };
        await deleteRow(Deleterow, payload);
        message = "Journey deleted successfully.";
        closeDeleteConfirm();
        const tableId = typeof dataTablejourney.tableId === 'object' ? dataTablejourney.tableId.id : dataTablejourney.tableId;
        const journeys = await loadJourneys(API, tableId);
        journeyDataStore.set(journeys);
      } catch (err) {
        error = `Error deleting journey: ${err.message}`;
      }
    };
  
    const toggleSortOrder = () => {
      journeySortOrderStore.update(order => order === 'asc' ? 'desc' : 'asc');
    };
  </script>
  
  <div>
    <input bind:value={$journeyFilterStore} placeholder="Filter journeys...">
    <button on:click={toggleSortOrder}>
      Sort {$journeySortOrderStore === 'asc' ? '↑' : '↓'}
    </button>
  
    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <p>{error}</p>
    {:else}
      {#each $displayedJourneys as journey (journey.id)}
        <JourneyItem {journey} on:delete={() => openDeleteConfirm(journey)} />
      {/each}
    {/if}
  
    {#if showDeleteConfirm}
      <div class="modal">
        <p>Are you sure you want to delete this journey?</p>
        <button on:click={deleteJourney}>Yes</button>
        <button on:click={closeDeleteConfirm}>No</button>
      </div>
    {/if}
  
    {#if message}
      <p>{message}</p>
    {/if}
  </div>