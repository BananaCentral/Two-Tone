# Enemy Tags Standard

Every enemy archetype defines four metadata fields: `area`, `type`, `strengths`, and `weaknesses`.

| Field | Format | Meaning |
|---|---|---|
| `area` | Non-empty area label | World area where the enemy belongs. Current roster uses `One`. |
| `type` | `common`, `elite`, or `boss` | Must match the archetype's validated encounter `category`. |
| `strengths` | Array of trait tags | Descriptive traits authored for the enemy. |
| `weaknesses` | Array of trait tags | Descriptive vulnerabilities authored for the enemy. |

Strength and weakness values use the controlled trait vocabulary in the archetype data. Do not repeat a trait within the same list. A trait may appear in either list only when the authored enemy design explicitly says so.

Tags are descriptive metadata. They do not appear in the game UI and do not independently alter targeting, damage, resistance, encounter composition, or AI. Combat effects continue to come from the enemy's stats, attack definitions, passives, and other explicit mechanics. UI presentation of tags requires a separate design decision.

## Current enemy tags

| Enemy | Area | Type | Strengths | Weaknesses |
|---|---|---|---|---|
| Slime | One | Common | Magical Attacker, Magical Resistant, Defensive | Physically Fragile, Slow |
| Wolf | One | Common | Fast, Physical Attacker, Strong | Physically Fragile, Magically Fragile, Fragile |
| Hawk | One | Common | Fast, Physical Attacker | Physically Fragile, Magically Fragile, Weak, Fragile |
| Geode | One | Elite | Defensive, Magical Resistant, Physically Resistant | Slow, Weak |
| Goblin | One | Elite | Physical Attacker, Physically Defensive | Magically Fragile |
| Bear | One | Boss | Defensive, Strong, Physical Attacker | Physically Fragile, Magically Fragile |
