import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { FIRST_CAMPAIGN_ENTRY_ID, STORY_PORTRAITS, awardCampaignClear, getCampaignEntry, getCampaignResumeEntry } from '../src/scripts/campaign.mjs';

test('the campaign opens with Soul facing one Slime after the gelatinous creature lunges', () => {
  const entry = getCampaignEntry(FIRST_CAMPAIGN_ENTRY_ID);
  assert.equal(entry.id, 'prologue_1a');
  assert.equal(entry.story.background, '/assets/prologue-1a-campsite.jpg');
  assert.equal(entry.story.beats.length, 5);
  assert.match(entry.story.beats.at(-1).text, /flattened against the dirt, then sprang\.$/);
  assert.equal(entry.encounter.areaId, 'prologue-campsite');
  assert.deepEqual(entry.encounter.party, ['soul']);
  assert.deepEqual(entry.encounter.waves, [[{ enemyId: 'slime', quantity: 1, level: 1 }]]);
});

test('Prologue 1A assigns a registered Soul portrait to each story beat', () => {
  const { beats } = getCampaignEntry(FIRST_CAMPAIGN_ENTRY_ID).story;
  assert.deepEqual(beats.map(beat => beat.portrait.reactionId), [
    'eyes-closed', 'focused', 'startled', 'focused', 'startled',
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
  assert.deepEqual(profile, { coins: 125, clearedCampaignEntries: [FIRST_CAMPAIGN_ENTRY_ID] });
});

test('Prologue 1B unlocks after 1A and grants a separate first-clear reward', () => {
  const profile = { coins: 0 };
  const entry = getCampaignEntry('prologue_1b');
  assert.equal(getCampaignResumeEntry().id, FIRST_CAMPAIGN_ENTRY_ID);
  assert.equal(getCampaignEntry(FIRST_CAMPAIGN_ENTRY_ID).nextEntryId, entry.id);
  assert.equal(awardCampaignClear(profile, entry.id), null);
  assert.deepEqual(profile, { coins: 0 });
  assert.equal(awardCampaignClear(profile, FIRST_CAMPAIGN_ENTRY_ID), 100);
  assert.equal(getCampaignResumeEntry(profile.clearedCampaignEntries).id, entry.id);
  assert.equal(entry.story.beats.length, 5);
  assert.deepEqual(entry.story.beats.map(beat => beat.background ?? entry.story.background), [
    '/assets/prologue-1a-campsite.jpg',
    '/assets/prologue-1a-campsite.jpg',
    '/assets/prologue-1b-campsite-sunrise.webp',
    '/assets/prologue-1b-campsite-sunrise.webp',
    '/assets/prologue-1b-campsite-sunrise.webp',
  ]);
  assert.deepEqual(entry.story.beats.map(beat => beat.portrait?.reactionId), [
    'composed', 'composed', undefined, 'hopeful', 'startled',
  ]);
  assert.equal(entry.encounter.areaId, 'prologue-campsite-sunrise');
  assert.deepEqual(entry.encounter.waves, [[{ enemyId: 'wolf', quantity: 3, level: 1 }]]);
  assert.equal(awardCampaignClear(profile, entry.id), 100);
  assert.equal(awardCampaignClear(profile, entry.id), 0);
  assert.equal(profile.coins, 200);
  assert.equal(getCampaignResumeEntry(profile.clearedCampaignEntries).id, entry.id);
});
