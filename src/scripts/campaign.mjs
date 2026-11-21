export const FIRST_CAMPAIGN_ENTRY_ID = 'prologue_1a';

export const PROLOGUE_CAMPSITE_BACKGROUND = '/assets/prologue-1a-campsite.jpg';
export const PROLOGUE_SUNRISE_BACKGROUND = '/assets/prologue-1b-campsite-sunrise.png';

export const STORY_PORTRAITS = Object.freeze({
  soul: Object.freeze({
    'eyes-closed': '/assets/soul-story-eyes-closed.png',
    focused: '/assets/soul-story-focused.png',
    composed: '/assets/soul-story-composed.png',
    hopeful: '/assets/soul-story-hopeful.png',
    startled: '/assets/soul-story-startled.png',
  }),
});

const prologue = {
  id: FIRST_CAMPAIGN_ENTRY_ID,
  title: 'Prologue 1A',
  story: {
    perspective: 'third-person-limited',
    viewpointCharacterId: 'soul',
    background: PROLOGUE_CAMPSITE_BACKGROUND,
    beats: [
      {
        text: 'A rustle in the bushes woke Soul.',
        portrait: { characterId: 'soul', reactionId: 'eyes-closed' },
      },
      {
        text: 'He lay still beneath his blanket, listening. Through the gap in the tent flap, he could see the glow of the campfire. He waited for the sound of a rabbit scrambling away.',
        portrait: { characterId: 'soul', reactionId: 'focused' },
      },
      {
        text: 'A branch cracked. Something scraped against the ground just outside.',
        portrait: { characterId: 'soul', reactionId: 'startled' },
      },
      {
        text: 'Soul grabbed his sword, shoved the flap aside, and burst out of the tent.',
        portrait: { characterId: 'soul', reactionId: 'focused' },
      },
      {
        text: 'A creature crouched at the edge of the firelight. Its eyes followed him as he stepped away from the tent. He raised his sword. The creature flattened against the dirt, then sprang.',
        portrait: { characterId: 'soul', reactionId: 'startled' },
      },
    ],
  },
  encounter: {
    areaId: 'prologue-campsite',
    party: ['soul'],
    waves: [[{ enemyId: 'slime', quantity: 1, level: 1 }]],
  },
  firstClearCoins: 100,
  nextEntryId: 'prologue_1b',
};

const prologue1b = {
  id: 'prologue_1b',
  title: 'Prologue 1B',
  prerequisiteEntryId: prologue.id,
  story: {
    perspective: 'third-person-limited',
    viewpointCharacterId: 'soul',
    background: PROLOGUE_CAMPSITE_BACKGROUND,
    beats: [
      {
        text: 'Soul’s sword struck the Slime one last time. It went still in the dirt.',
        portrait: { characterId: 'soul', reactionId: 'composed' },
      },
      {
        text: 'He flicked the slime from his blade and slid it back into its sheath.',
        portrait: { characterId: 'soul', reactionId: 'composed' },
      },
      {
        text: 'The sky was beginning to pale by the time Soul pulled up the last tent peg. He rolled the canvas and strapped it to his pack.',
        background: PROLOGUE_SUNRISE_BACKGROUND,
      },
      {
        text: 'He slung the pack over one shoulder and looked out across the meadow. Beyond the low hills, he could make out the rooftops of a village.',
        background: PROLOGUE_SUNRISE_BACKGROUND,
        portrait: { characterId: 'soul', reactionId: 'hopeful' },
      },
      {
        text: 'As the sun broke over the hills, a low growl drew his attention back to the campsite. Three wolves stepped out of the bushes beside the cold fire pit. Soul’s hand went to his sword.',
        background: PROLOGUE_SUNRISE_BACKGROUND,
        portrait: { characterId: 'soul', reactionId: 'startled' },
      },
    ],
  },
  encounter: {
    areaId: 'prologue-campsite-sunrise',
    party: ['soul'],
    waves: [[{ enemyId: 'wolf', quantity: 3, level: 1 }]],
  },
  firstClearCoins: 100,
  nextEntryId: null,
};

export const CAMPAIGN_ENTRIES = Object.freeze({ [prologue.id]: prologue, [prologue1b.id]: prologue1b });

export function getCampaignEntry(entryId) {
  return Object.hasOwn(CAMPAIGN_ENTRIES, entryId) ? CAMPAIGN_ENTRIES[entryId] : null;
}

export function isCampaignEntryUnlocked(entry, cleared = []) {
  return !entry.prerequisiteEntryId || cleared.includes(entry.prerequisiteEntryId);
}

export function getCampaignResumeEntry(cleared = []) {
  let entry = getCampaignEntry(FIRST_CAMPAIGN_ENTRY_ID);
  while (entry.nextEntryId && cleared.includes(entry.id)) {
    const next = getCampaignEntry(entry.nextEntryId);
    if (!next || !isCampaignEntryUnlocked(next, cleared)) break;
    entry = next;
  }
  return entry;
}

export function awardCampaignClear(profile, entryId) {
  const entry = getCampaignEntry(entryId);
  if (!entry) return null;

  const cleared = profile.clearedCampaignEntries ?? [];
  if (!isCampaignEntryUnlocked(entry, cleared)) return null;
  if (cleared.includes(entryId)) return 0;

  profile.clearedCampaignEntries = [...cleared, entryId];
  profile.coins += entry.firstClearCoins;
  return entry.firstClearCoins;
}
