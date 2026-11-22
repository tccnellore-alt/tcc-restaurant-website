# TCC Perfect 10

## Confirmed promotion rules

- Access is limited to a valid, active dedicated table QR token.
- The game is hidden from the customer menu while `perfect_10_enabled` is false.
- Each browser/device game session has three attempts.
- A win is recorded for an elapsed time from 9.991 to 10.009 seconds inclusive; the game displays two decimal places.
- A winning session receives one unique `TCC10-XXXXXXXX` code.
- Reward: 10% off all hot and cold beverages.
- Food is excluded. The reward cannot be combined with other offers.
- A reward is valid for the visit window, implemented as three hours from the start of the game session.
- A reward can be redeemed only once.

## Architecture

- Customer UI: `perfect-10.js` and `perfect-10.css`, loaded by `menu.html`.
- Staff UI: `game-rewards.html`, `game-rewards.js`, and `game-rewards.css`.
- Backend: Supabase Edge Function `tcc-game`.
- Database: `tcc_game_sessions`, `tcc_game_attempts`, and `tcc_game_rewards`.
- The game toggle is stored in `tcc_store_settings.perfect_10_enabled`; it defaults to false.
- Game state and redemption are processed server-side. Redemption uses a row lock to prevent duplicate redemption.
- The existing table QR tokens and TCC Desk admin sessions are reused.

## Staff redemption procedure

1. Customer shows the winning code.
2. Staff validates it in TCC Desk > Perfect 10.
3. Staff applies the 10% discount to eligible beverage lines in SR POS.
4. Staff marks the code as redeemed in TCC Desk.

The website is not currently integrated with SR POS, so discount application in the POS is manual. Do not apply the reward to food, takeaway fees, or other non-beverage charges.

## Operational notes

- Disabling the game hides the customer entry point and blocks new game sessions/attempts. Existing valid rewards remain visible and redeemable.
- The Order Desk checks for new winners every four seconds while open. Browser notifications require notification permission.
- The timer is measured in the customer browser using a monotonic clock. Server-side attempt limits and reward issuance are enforced, but a determined user can manipulate browser-side timing. This is a promotional game, not a secure contest.
- Three attempts are enforced per browser/device session. A different device or a cleared browser storage can start another session; identity-level enforcement would require phone verification.
