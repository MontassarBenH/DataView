<script>
  import { getContext } from "svelte";
  import { onMount } from 'svelte';

  export let dataTable;
  let journeyData = [];
  let error = null;
  let loading = true;

  const { styleable, API } = getContext("sdk");
  const component = getContext("component");


  /*const loadJourneys = async () => {
  try {
    console.log("Data Table Object:", dataTable);
    console.log("Table ID (raw):", dataTable.tableId);
    
    const tableId = typeof dataTable.tableId === 'object' ? dataTable.tableId.id : dataTable.tableId;
    console.log("Table ID (processed):", tableId);
    
    if (!tableId) {
      throw new Error("Invalid table ID");
    }
    
    const res = await API.searchTable({
      tableId: tableId,
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
};*/

  const loadJourneysWithGetTable = async () => {
  try {
    console.log("Data Table Object:", dataTable);
    console.log("Table ID (raw):", dataTable.tableId);
    
    const tableId = typeof dataTable.tableId === 'object' ? dataTable.tableId.id : dataTable.tableId;
    console.log("Table ID (processed):", tableId);
    
    if (!tableId) {
      throw new Error("Invalid table ID");
    }
    
    const res = await API.getTable(tableId);
    
    console.log("API Response Status:", res.status || 'No status available');
    console.log("API Response:", JSON.stringify(res, null, 2));
    
    if (res?.rows) {
      if (res.rows.length) {
        journeyData = [...res.rows];
        console.log("Journeys loaded:", journeyData);
      } else {
        journeyData = [];
        console.log("API returned empty rows.");
        error = "No journeys found in the database.";
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


/*const loadJourneysWithSearchTable = async () => {
  try {
    console.log("Data Table Object:", dataTable);
    console.log("Table ID (raw):", dataTable.tableId);
    
    const tableId = typeof dataTable.tableId === 'object' ? dataTable.tableId.id : dataTable.tableId;
    console.log("Table ID (processed):", tableId);
    
    if (!tableId) {
      throw new Error("Invalid table ID");
    }
    
    const res = await API.searchTable({
      tableId: tableId,
    });

    console.log("API Response Status:", res.status || 'No status available');
    console.log("API Response:", JSON.stringify(res, null, 2));
    
    if (res?.rows) {
      if (res.rows.length) {
        journeyData = [...res.rows];
        console.log("Journeys loaded:", journeyData);
      } else {
        journeyData = [];
        console.log("API returned empty rows.");
        error = "No journeys found in the database.";
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
};*/

/*const loadJourneys = async () => {
  try {
    console.log("Data Table Object:", dataTable);
    console.log("Table ID (raw):", dataTable.tableId);

    const tableId = typeof dataTable.tableId === 'object' ? dataTable.tableId.id : dataTable.tableId;
    console.log("Table ID (processed):", tableId);

    if (!tableId) {
      throw new Error("Invalid table ID");
    }

    const res = await API.searchTable({
      tableId: tableId,
      limit: 50,
      sort: "id",
      sortOrder: "desc",
      fields: ["id", "title", "description", "journey_items"]
    });

    console.log("API Response:", JSON.stringify(res, null, 2));

    if (res?.rows) {
      journeyData = res.rows;
      console.log("Journeys loaded:", journeyData);
    } else {
      journeyData = [];
      error = "No journeys found in the database.";
    }
  } catch (err) {
    console.error('Failed to load journeys:', err);
    error = `Error: ${err.message}`;
  } finally {
    loading = false;
  }
};*/


  onMount(async () => {
    await loadJourneysWithGetTable();
  });
</script>

<div use:styleable={$component.styles}>
  <div id="journeysDiv">
    {#if loading}
      <p>Loading journeys...</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else if journeyData.length > 0}
      {#each journeyData as journey}
        <div class="journey-item">
          <h3>{journey.title}</h3>
          <p>{journey.description}</p>
          {#if journey.journey_items}
            <h4>Journey Items:</h4>
            <ul>
              {#each journey.journey_items.split(',') as item}
                <li>{item.trim()}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    {:else}
      <p>No journeys found. The journey table is currently empty.</p>
    {/if}
  </div>
</div>

<style>
  .journey-item {
    margin-bottom: 1em;
    padding: 1em;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  h3 {
    margin: 0 0 0.5em;
  }

  p {
    margin: 0 0 1em;
  }

  ul {
    padding-left: 1em;
  }
</style>