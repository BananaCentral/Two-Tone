# 28-Day Login Event Standard

Open the login event from **Main Menu → Events**. Signed-in players can manually claim once per Eastern calendar day. The login event and Daily Reward each have their own claim.

## Claim order

| Claim | Coins | Total collected |
|---|---:|---:|
| 1 | 200 | 200 |
| 2 | 100 | 300 |
| 3 | 100 | 400 |
| 4 | 200 | 600 |
| 5 | 100 | 700 |
| 6 | 100 | 800 |
| 7 | 200 | 1,000 |

Players can claim on any seven days of the cycle. Skipping a day preserves the next claim in sequence. Daily eligibility resets at midnight in `America/New_York`.

The shared cycle starts on November 23, 2026, Eastern Time and rolls over every 28 calendar days. The start date is defined in `src/scripts/login-event.mjs`. When a cycle ends, unclaimed rewards expire and the next claim returns to the first reward. Previously granted coins stay in the wallet.

## Event screen

Follow the [UI Layout Standard](../project-standard/ui-layout-standard.md) and [UI Copy Standard](../project-standard/ui-copy-standard.md).

- List available events in a left tab rail styled like Loadout and Campaign. Highlight the selected tab and open the first event by default. The 28-Day Login Event is the first tab.
- Show the selected event in the right panel. Center its title above the artwork. Keep the reset date and maximum reward in clear space on the banner.
- Use the Store’s current featured characters as full-body banner art. Place one larger character in front and offset the others behind at different heights. Keep faces visible. Use shared lighting and compose the banner around the available lineup when fewer than three characters are featured.
- The art follows the Store’s weekly rotation. Claim eligibility follows the event calendar.
- Arrange the seven reward cards in an evenly spaced row below the banner. Mark claimed rewards and highlight the next claim. Align the available reward value above the **Claim** button. Show **Claimed today** or **Cycle complete** as appropriate. Keep the artwork visible in every state.

## Account persistence

The authenticated server stores the cycle number, claim count, and previous claim day. It checks eligibility using server time and awards coins under the same profile lock as the progress update. Action receipts make successful request retries idempotent. Existing accounts without login event progress start with zero claims.
