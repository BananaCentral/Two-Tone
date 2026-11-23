import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { CAMPAIGN_ARCS, CAMPAIGN_ENTRIES, FIRST_CAMPAIGN_ENTRY_ID, STORY_PORTRAITS, awardCampaignClear, getCampaignEntry, isCampaignEntryUnlocked } from '../src/scripts/campaign.mjs';

test('the campaign opens with Soul facing one Slime after the gelatinous creature lunges', () => {
  const entry = getCampaignEntry(FIRST_CAMPAIGN_ENTRY_ID);
  assert.equal(entry.id, 'prologue_1a');
  assert.equal(entry.story.background, '/assets/prologue-1a-campsite.jpg');
  assert.equal(entry.story.beats.length, 11);
  assert.match(entry.story.beats.at(-1).text, /flattened itself against the dirt and sprang at him\.$/);
  assert.equal(entry.encounter.areaId, 'prologue-campsite');
  assert.deepEqual(entry.encounter.party, ['soul']);
  assert.deepEqual(entry.encounter.waves, [[{ enemyId: 'slime', quantity: 1, level: 1 }]]);
});

test('Prologue 1A assigns a registered Soul portrait to each story beat', () => {
  const { beats } = getCampaignEntry(FIRST_CAMPAIGN_ENTRY_ID).story;
  assert.deepEqual(beats.map(beat => beat.portrait.reactionId), [
    'eyes-closed', 'eyes-closed', 'focused', 'focused', 'startled', 'startled',
    'focused', 'focused', 'focused', 'startled', 'startled',
  ]);
  for (const { portrait: { characterId, reactionId } } of beats) {
    assert.equal(characterId, 'soul');
    const path = STORY_PORTRAITS[characterId][reactionId];
    assert.ok(existsSync(new URL('..' + path, import.meta.url)));
  }
});

test('a legacy profile receives the reward once and unknown entries leave it intact', () => {
  const profile = { coins: 25 };
  assert.equal(awardCampaignClear(profile, 'toString'), null);
  assert.deepEqual(profile, { coins: 25 });
  assert.equal(awardCampaignClear(profile, FIRST_CAMPAIGN_ENTRY_ID), 100);
  assert.equal(awardCampaignClear(profile, FIRST_CAMPAIGN_ENTRY_ID), 0);
  assert.deepEqual(profile, { coins: 125, clearedCampaignEntries: [FIRST_CAMPAIGN_ENTRY_ID], playerRank: 2, rankXp: 0 });
});

test('Prologue 1B unlocks after 1A and grants a separate first-clear reward', () => {
  const profile = { coins: 0 };
  const entry = getCampaignEntry('prologue_1b');
  assert.equal(isCampaignEntryUnlocked(entry), false);
  assert.equal(getCampaignEntry(FIRST_CAMPAIGN_ENTRY_ID).nextEntryId, entry.id);
  assert.equal(awardCampaignClear(profile, entry.id), null);
  assert.deepEqual(profile, { coins: 0 });
  assert.equal(awardCampaignClear(profile, FIRST_CAMPAIGN_ENTRY_ID), 100);
  assert.equal(isCampaignEntryUnlocked(entry, profile.clearedCampaignEntries), true);
  assert.equal(entry.story.beats.length, 12);
  assert.deepEqual(entry.story.beats.map(beat => beat.background ?? entry.story.background), [
    ...Array(4).fill('/assets/prologue-1a-campsite.jpg'),
    ...Array(8).fill('/assets/prologue-1b-campsite-sunrise.webp'),
  ]);
  assert.deepEqual(entry.story.beats.map(beat => beat.portrait?.reactionId), [
    'composed', 'composed', 'composed', 'composed', undefined, undefined,
    'hopeful', 'hopeful', 'hopeful', 'startled', 'startled', 'startled',
  ]);
  assert.equal(entry.encounter.areaId, 'prologue-campsite-sunrise');
  assert.deepEqual(entry.encounter.waves, [[{ enemyId: 'wolf', quantity: 3, level: 1 }]]);
  assert.equal(awardCampaignClear(profile, entry.id), 100);
  assert.equal(awardCampaignClear(profile, entry.id), 0);
  assert.equal(profile.coins, 200);
  assert.equal(isCampaignEntryUnlocked(getCampaignEntry('prologue_1c'), profile.clearedCampaignEntries), true);
});

test('Prologue 1C unlocks after the wolves and stages five Hawks at the river', () => {
  const profile = { coins: 100, clearedCampaignEntries: ['prologue_1a'] };
  const entry = getCampaignEntry('prologue_1c');
  assert.equal(awardCampaignClear(profile, entry.id), null);
  assert.equal(awardCampaignClear(profile, 'prologue_1b'), 100);
  assert.equal(isCampaignEntryUnlocked(entry, profile.clearedCampaignEntries), true);
  assert.equal(entry.story.beats[0].background, '/assets/prologue-1b-campsite-sunrise.webp');
  assert.equal(entry.story.background, '/assets/prologue-1c-riverbank.webp');
  assert.equal(entry.story.beats[6].portrait.reactionId, 'relaxed');
  assert.equal(entry.encounter.areaId, 'prologue-riverbank');
  assert.deepEqual(entry.encounter.waves, [[{ enemyId: 'hawk', quantity: 5, level: 1 }]]);
  assert.equal(awardCampaignClear(profile, entry.id), 100);
  assert.equal(awardCampaignClear(profile, entry.id), 0);
  assert.equal(profile.coins, 300);
});

test('Arc One lists Prologue parts A through D in order with stable entry IDs', () => {
  const arc = CAMPAIGN_ARCS.find(arc => arc.id === 'arc_1');
  const chapter = arc.chapters.find(chapter => chapter.id === 'prologue');
  assert.deepEqual(chapter.parts, [
    { label: 'A', entryId: 'prologue_1a' },
    { label: 'B', entryId: 'prologue_1b' },
    { label: 'C', entryId: 'prologue_1c' },
    { label: 'D', entryId: 'prologue_1d' },
  ]);
  for (const part of chapter.parts) {
    const entry = getCampaignEntry(part.entryId);
    assert.ok(entry?.summary.trim(), part.entryId);
  }
});

test('each story screen contains a single paragraph, including standalone reactions', () => {
  for (const entry of Object.values(CAMPAIGN_ENTRIES)) {
    for (const beat of entry.story.beats) assert.doesNotMatch(beat.text, /[\r\n]/);
  }
  assert.equal(getCampaignEntry('prologue_1b').story.beats.at(-1).text, 'He hadn’t even started walking yet.');
  assert.equal(getCampaignEntry('prologue_1c').story.beats.at(-2).text, '“Seriously?”');
});

test('Prologue 1D follows the Hawks and stages a single Goblin in the village', () => {
  const profile = { coins: 200, clearedCampaignEntries: ['prologue_1a', 'prologue_1b'] };
  const entry = getCampaignEntry('prologue_1d');
  assert.equal(getCampaignEntry('prologue_1c').nextEntryId, entry.id);
  assert.equal(awardCampaignClear(profile, entry.id), null);
  assert.equal(awardCampaignClear(profile, 'prologue_1c'), 100);
  assert.equal(entry.story.beats.length, 16);
  assert.equal(entry.story.beats[1].text, 'His stomach growled.');
  assert.equal(entry.story.background, '/assets/prologue-1c-riverbank.webp');
  assert.equal(entry.story.beats.at(-1).background, '/assets/prologue-1d-village.webp');
  assert.equal(entry.encounter.areaId, 'prologue-village');
  assert.deepEqual(entry.encounter.waves, [[{ enemyId: 'goblin', quantity: 1, level: 1 }]]);
  assert.equal(awardCampaignClear(profile, entry.id), 100);
  assert.equal(awardCampaignClear(profile, entry.id), 0);
  assert.equal(profile.coins, 400);
});

test('Prologue first clears each award five Rank XP and replays award none', () => {
  const profile = { coins: 0 };
  for (const [part, rank, xp] of [['a', 2, 0], ['b', 2, 5], ['c', 3, 0], ['d', 3, 5]]) {
    assert.equal(awardCampaignClear(profile, 'prologue_1' + part), 100);
    assert.equal(awardCampaignClear(profile, 'prologue_1' + part), 0);
    assert.equal(profile.playerRank, rank);
    assert.equal(profile.rankXp, xp);
  }
});
