import assert from 'node:assert/strict';
import test from 'node:test';
import { FIRST_CAMPAIGN_ENTRY_ID, awardCampaignClear, getCampaignEntry } from '../src/scripts/campaign.mjs';

test('the campaign opens with Soul facing one Slime after the gelatinous creature lunges', () => {
  const entry = getCampaignEntry(FIRST_CAMPAIGN_ENTRY_ID);
  assert.equal(entry.id, 'prologue_1a');
  assert.equal(entry.story.background, '/assets/area-1-meadow.png');
  assert.equal(entry.story.paragraphs.length, 5);
  assert.match(entry.story.paragraphs.at(-1), /flattened against the dirt, then sprang\.$/);
  assert.deepEqual(entry.encounter.party, ['soul']);
  assert.deepEqual(entry.encounter.waves, [[{ enemyId: 'slime', quantity: 1 }]]);
});

test('a legacy profile receives the reward once and unknown entries leave it intact', () => {
  const profile = { coins: 25 };
  assert.equal(awardCampaignClear(profile, 'toString'), null);
  assert.deepEqual(profile, { coins: 25 });
  assert.equal(awardCampaignClear(profile, FIRST_CAMPAIGN_ENTRY_ID), 100);
  assert.equal(awardCampaignClear(profile, FIRST_CAMPAIGN_ENTRY_ID), 0);
  assert.deepEqual(profile, { coins: 125, clearedCampaignEntries: [FIRST_CAMPAIGN_ENTRY_ID] });
});
