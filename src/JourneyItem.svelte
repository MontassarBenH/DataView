<script>
    import { createEventDispatcher } from 'svelte';
  
    export let journey;
    
    const dispatch = createEventDispatcher();
  
    const handleDelete = () => {
      dispatch('delete', journey);
    };
  </script>
  
  <div>
    <h2>{journey.title}</h2>
    <p>{journey.description}</p>
    <button on:click={handleDelete}>Delete</button>
  </div>