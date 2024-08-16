export const loadJourneys = async (API, tableId) => {
    try {
      const res = await API.searchTable({
        tableId: tableId,
        query: { greater: { id: 0 } },
        paginate: false,
        limit: 100
      });
      
      if (res && Array.isArray(res.rows)) {
        return res.rows;
      } else {
        throw new Error("Invalid response format from API for journeys.");
      }
    } catch (err) {
      console.error('Failed to load journeys:', err);
      throw err;
    }
  };
  
  export const loadJourneyItems = async (API, tableId) => {
    try {
      const res = await API.searchTable({
        tableId: tableId,
        query: { greater: { id: 0 } },
        paginate: false,
        limit: 100
      });
      
      if (res && Array.isArray(res.rows)) {
        return res.rows.map(item => ({
          ...item,
          ranking: item.ranking !== undefined ? Number(item.ranking) : null
        }));
      } else {
        throw new Error("Invalid response format from API for journey items.");
      }
    } catch (err) {
      console.error('Failed to load journey items:', err);
      throw err;
    }
  };
  
  export const saveJourney = async (API, tableId, journey) => {
    try {
      const preparedJourney = {
        ...journey,
        journey_items: journey.selectedJourneyItems || null,
        id: undefined
      };
  
      Object.keys(preparedJourney).forEach(key => 
        preparedJourney[key] === undefined && delete preparedJourney[key]
      );
  
      return await API.saveRow({
        tableId: tableId,
        ...preparedJourney
      });
    } catch (err) {
      console.error('Failed to save journey:', err);
      throw err;
    }
  };
  
  export const saveJourneyItem = async (API, tableId, item) => {
    try {
      const preparedItem = {
        ...item,
        journey_id: item.journey_id || null,
        ranking: item.ranking !== undefined && item.ranking !== '' ? Number(item.ranking) : null,
        id: undefined
      };
  
      Object.keys(preparedItem).forEach(key => 
        preparedItem[key] === undefined && delete preparedItem[key]
      );
  
      return await API.saveRow({
        tableId: tableId,
        ...preparedItem
      });
    } catch (err) {
      console.error('Failed to save journey item:', err);
      throw err;
    }
  };
  
  export const deleteRow = async (Deleterow, payload) => {
    try {
      const result = await Deleterow(payload);
      if (result !== true) {
        throw new Error("Unexpected result from delete operation");
      }
      return result;
    } catch (err) {
      console.error('Failed to delete row:', err);
      throw err;
    }
  };