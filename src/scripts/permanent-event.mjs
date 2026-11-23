export const SOUL_GIFT = Object.freeze({
  id: 'soul-gift',
  title: 'Soul’s Gift',
  coins: 2_000,
  items: Object.freeze([
    Object.freeze({ id: 'book:small', name: 'Small Enchanted Books', image: 'enchantedBookSmall', quantity: 200 }),
    Object.freeze({ id: 'bottle:small', name: 'Small Enchanted Bottles', image: 'enchantedBottleSmall', quantity: 200 }),
    Object.freeze({ id: 'gem', name: 'Gems', image: 'gem', quantity: 2 }),
    Object.freeze({ id: 'core', name: 'Cores', image: 'core', quantity: 2 }),
  ]),
});

export function hasClaimedSoulGift(profile) {
  return profile.permanentEventClaims?.includes(SOUL_GIFT.id) ?? false;
}

export function claimSoulGift(profile, addInventory) {
  if (hasClaimedSoulGift(profile)) return null;

  profile.coins += SOUL_GIFT.coins;
  for (const { id, quantity } of SOUL_GIFT.items) {
    addInventory(profile, id, quantity);
  }
  profile.permanentEventClaims = [...(profile.permanentEventClaims ?? []), SOUL_GIFT.id];
  return [
    { coins: SOUL_GIFT.coins },
    ...SOUL_GIFT.items.map(({ id, name, quantity }) => ({ id, name, inventoryItem: id, quantity })),
  ];
}
