export const FIRST_CAMPAIGN_ENTRY_ID = 'prologue_1a';

export const PROLOGUE_CAMPSITE_BACKGROUND = '/assets/prologue-1a-campsite.jpg';
export const PROLOGUE_SUNRISE_BACKGROUND = '/assets/prologue-1b-campsite-sunrise.webp';

export const PROLOGUE_RIVERBANK_BACKGROUND = '/assets/prologue-1c-riverbank.webp';

export const STORY_PORTRAITS = Object.freeze({
  soul: Object.freeze({
    'eyes-closed': '/assets/soul-story-eyes-closed.webp',
    focused: '/assets/soul-story-focused.webp',
    composed: '/assets/soul-story-composed.webp',
    hopeful: '/assets/soul-story-hopeful.webp',
    relaxed: '/assets/soul-story-relaxed.webp',
    startled: '/assets/soul-story-startled.webp',
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
        text: "Soul lay asleep in his tent, his blanket pulled up to his chin. Outside, the campfire had nearly burned out.\n\nA rustle in the bushes woke him.",
        portrait: { characterId: 'soul', reactionId: 'eyes-closed' },
      },
      {
        text: "His eyes slowly opened. He glanced toward the tent flap, where he could see a faint glow from the fire, then closed them again.\n\nIt was probably a rabbit. Whatever it was, he hoped it would be gone by the time he had to get up.",
        portrait: { characterId: 'soul', reactionId: 'focused' },
      },
      {
        text: "Suddenly, a branch snapped.\n\nSoul opened his eyes again. He stayed still for a moment, listening. Something scraped against the ground just outside the tent.",
        portrait: { characterId: 'soul', reactionId: 'startled' },
      },
      {
        text: "He slipped one hand out from under the blanket and reached for the sword beside him. Once he had a firm grip on it, he pushed the blanket aside and hurried outside.",
        portrait: { characterId: 'soul', reactionId: 'focused' },
      },
      {
        text: "At first, all he could see was the fire. As his eyes adjusted, he noticed a creature crouched just beyond it.\n\nSoul raised his sword. The creature’s eyes followed the movement.",
        portrait: { characterId: 'soul', reactionId: 'focused' },
      },
      {
        text: "For a moment, neither of them moved.\n\nThen the creature flattened itself against the dirt and sprang at him.",
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
        text: "Soul brought his sword down one last time. The Slime collapsed beside the fire and went still.\n\nHe kept his sword raised for a few seconds. When the Slime showed no sign of moving, he lowered it and looked at the blade.",
        portrait: { characterId: 'soul', reactionId: 'composed' },
      },
      {
        text: "Some of the slime was still clinging to it.\n\nSoul gave the sword a quick flick. Most of it came off, though a thin streak remained along one side. He wiped it away before sliding the sword back into its sheath.",
        portrait: { characterId: 'soul', reactionId: 'composed' },
      },
      {
        text: "By then, the sky was beginning to lighten. Soul glanced back at his tent. He’d hoped to get a little more sleep before sunrise, but he was wide awake now.",
        background: PROLOGUE_SUNRISE_BACKGROUND,
      },
      {
        text: "He went back inside to gather his things. After folding his blanket, he pulled the pegs out of the ground and rolled up the tent. The canvas came loose as he lifted it, so he set it down and rolled it again.",
        background: PROLOGUE_SUNRISE_BACKGROUND,
      },
      {
        text: "Once it was strapped to his pack, Soul put out the last of the fire and stood up. He took a moment to look around before deciding which way to go.\n\nBeyond the low hills, he could just make out the rooftops of a village.",
        background: PROLOGUE_SUNRISE_BACKGROUND,
        portrait: { characterId: 'soul', reactionId: 'hopeful' },
      },
      {
        text: "His expression brightened. If he got there early enough, he might be able to find somewhere that served breakfast.",
        background: PROLOGUE_SUNRISE_BACKGROUND,
        portrait: { characterId: 'soul', reactionId: 'hopeful' },
      },
      {
        text: "As the sun came up over the hills, a low growl drew his attention back to the campsite.",
        background: PROLOGUE_SUNRISE_BACKGROUND,
        portrait: { characterId: 'soul', reactionId: 'startled' },
      },
      {
        text: "Three wolves stepped out of the bushes beside the cold fire pit. Soul stood there with one hand still on his pack strap.\n\nHe hadn’t even started walking yet.",
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
  nextEntryId: 'prologue_1c',
};

const prologue1c = {
  id: 'prologue_1c',
  title: 'Prologue 1C',
  prerequisiteEntryId: prologue1b.id,
  story: {
    perspective: 'third-person-limited',
    viewpointCharacterId: 'soul',
    background: PROLOGUE_RIVERBANK_BACKGROUND,
    beats: [
      {
        text: "After defeating the wolves, Soul picked up his pack and set off toward the village.",
        background: PROLOGUE_SUNRISE_BACKGROUND,
      },
      {
        text: "He had been walking for a while when he heard water running nearby. By then, the sun was well above the hills. He followed the sound until he reached the river, about halfway to the village.",
      },
      {
        text: "Soul stopped on the bank and looked down at his clothes. There was dirt on his knees, grass stuck to one sleeve, and a patch of slime he’d somehow missed.\n\nHe glanced at the river again. He could spare a few minutes.",
      },
      {
        text: "Soul set his pack and sword down on the bank, removed his clothes, and stepped into the water. It was colder than he’d expected. He stood still until he got used to it, then waded in a little farther and began washing himself.",
      },
      {
        text: "Once he was done, he scrubbed his clothes in the shallows. He had to go over the same patch twice before the last of the slime came out.",
      },
      {
        text: "Soul climbed back onto the bank, wrung out his clothes, and spread them over a flat rock in the sun. He sat down beside them and listened to the water while he waited.\n\nFor a little while, it was quiet.",
        portrait: { characterId: 'soul', reactionId: 'relaxed' },
      },
      {
        text: "When his clothes were dry, Soul got dressed and took out a fresh roll of bandages. He had just started wrapping one around his forearm when a shadow passed over his hands.",
        portrait: { characterId: 'soul', reactionId: 'startled' },
      },
      {
        text: "He looked up. Five hawks were circling low over the bank.\n\n“Seriously?”",
        portrait: { characterId: 'soul', reactionId: 'startled' },
      },
      {
        text: "The hawks swooped before he could finish the wrap. Soul punched the first one away and reached for his sword. The loose end of his bandage slipped free as he got to his feet.",
        portrait: { characterId: 'soul', reactionId: 'startled' },
      },
    ],
  },
  encounter: {
    areaId: 'prologue-riverbank',
    party: ['soul'],
    waves: [[{ enemyId: 'hawk', quantity: 5, level: 1 }]],
  },
  firstClearCoins: 100,
  nextEntryId: null,
};

export const CAMPAIGN_ENTRIES = Object.freeze({
  [prologue.id]: prologue,
  [prologue1b.id]: prologue1b,
  [prologue1c.id]: prologue1c,
});

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
