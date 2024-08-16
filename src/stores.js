import { writable, derived } from 'svelte/store';

export const journeyDataStore = writable([]);
export const journeyItemsStore = writable([]);
export const journeyFilterStore = writable("");
export const journeyItemFilterStore = writable("");
export const journeySortOrderStore = writable('desc');
export const journeyItemSortOrderStore = writable('desc');

export const displayedJourneys = derived(
  [journeyDataStore, journeyFilterStore, journeySortOrderStore],
  ([$journeyData, $journeyFilter, $journeySortOrder]) => 
    filterJourneys($journeyData, $journeyFilter)
      .sort((a, b) => sortById(a, b, $journeySortOrder))
);

export const displayedJourneyItems = derived(
  [journeyItemsStore, journeyItemFilterStore],
  ([$journeyItems, $journeyItemFilter]) => 
    filterJourneyItems($journeyItems, $journeyItemFilter)
      .sort(sortByRanking)
);

// Helper functions (could be moved to a separate utils.js file)
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

const sortById = (a, b, order) => {
  return order === 'asc' ? a.id - b.id : b.id - a.id;
};

const sortByRanking = (a, b) => {
  const rankingA = a.ranking !== undefined ? Number(a.ranking) : null;
  const rankingB = b.ranking !== undefined ? Number(b.ranking) : null;
  
  if (rankingA === null && rankingB === null) return 0;
  if (rankingA === null) return 1;
  if (rankingB === null) return -1;
  return rankingB - rankingA;
};