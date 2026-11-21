export const FIRST_CAMPAIGN_ENTRY_ID = 'prologue_1a';

const prologue = {
  id: FIRST_CAMPAIGN_ENTRY_ID,
  title: 'Prologue 1A',
  story: {
    perspective: 'third-person-limited',
    viewpointCharacterId: 'soul',
    background: '/assets/prologue-1a-campsite.jpg',
    paragraphs: [
      'A rustle in the bushes woke Soul.',
      'He lay still beneath his blanket, listening. Through the gap in the tent flap, he could see the glow of the campfire. He waited for the sound of a rabbit scrambling away.',
      'A branch cracked. Something scraped against the ground just outside.',
      'Soul grabbed his sword, shoved the flap aside, and burst out of the tent.',
      'A creature crouched at the edge of the firelight. Its eyes followed him as he stepped away from the tent. He raised his sword. The creature flattened against the dirt, then sprang.',
    ],
  },
  encounter: {
    areaId: 'area-1',
    party: ['soul'],
    waves: [[{ enemyId: 'slime', quantity: 1 }]],
  },
  firstClearCoins: 100,
  nextEntryId: null,
};

export const CAMPAIGN_ENTRIES = Object.freeze({ [prologue.id]: prologue });

export function getCampaignEntry(entryId) {
  return Object.hasOwn(CAMPAIGN_ENTRIES, entryId) ? CAMPAIGN_ENTRIES[entryId] : null;
}

export function awardCampaignClear(profile, entryId) {
  const entry = getCampaignEntry(entryId);
  if (!entry) return null;

  const cleared = profile.clearedCampaignEntries ?? [];
  if (cleared.includes(entryId)) return 0;

  profile.clearedCampaignEntries = [...cleared, entryId];
  profile.coins += entry.firstClearCoins;
  return entry.firstClearCoins;
}
