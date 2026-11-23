export function commonStoreReward(type, roll) {
  const [size, label, quantity] = roll < 0.6 ? ["small", "Small", 15]
    : roll < 0.9 ? ["medium", "Medium", 7]
    : ["large", "Large", 1];
  const item = type === "character" ? "bottle" : "book";
  const noun = type === "character" ? "Bottle" : "Book";
  const id = `${item}:${size}`;
  return {
    id,
    inventoryItem: id,
    name: `${label} Enchanted ${noun}${quantity === 1 ? "" : "s"}`,
    quantity,
  };
}
