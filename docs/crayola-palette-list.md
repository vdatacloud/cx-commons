# cx-commons color list

## Action tiers (warm = dangerous, cool = safe)

| Tier | Token | Light fill / hover | Dark fill / hover | Text | Buttons |
|---|---|---|---|---|---|
| Critical | `action-critical` | #E50B46 / #C7003B | #E50B46 / #C7003B | white | Execute Disbursement, Disburse stablecoins |
| High | `action-high` | #FF7538 / #EA6120 | #FF8D5F / #FFA785 | #1B1F27 | Fund Contract, Propose Disbursement, Approve Disbursement, Guaranteed Fiat Settlement, Render Arbitrator Decision, Propose Cancellation |
| Elevated | `action-elevated` | #FFAE42 / #EA9B28 | #FFC177 / #FFD7A9 | #1B1F27 | Approve Release, Milestone Release, Top Up, Lapse Period, Raise Dispute, Raise Timeout Dispute, Escalate to Arbitration, Ratify Settlement |
| Routine | `action-routine` | #68BC36 / #55A91B | #7AC752 / #8FD66B | #1B1F27 | Activate Contract, Attest to Funding Chain, Propose Settlement, Plan Payout, Ratify Draft Proposal |
| Low | `action-low` | #1DACD6 / #0D98BA | #45B8DF / #63C7EB | #1B1F27 | Accept Proposal, Open Period, Resume Subscription, Resync (text-only), Trackers (tint), Milestone Evidence |

## Navigation (same in both modes)

- `nav` #1A4876 (Crayola Midnight Blue), text white
- `nav-hover` #2B5988
- `nav-active` #68BC36 underline (logo green)

## Surfaces and text

| Token | Light | Dark |
|---|---|---|
| `surface-page` | #F6F8FB | #111A26 |
| `surface-card` | #FFFFFF | #1A2533 |
| `border-default` | #D5DBE5 | #2C3A4B |
| `text-default` | #1B1F27 | #E8ECF2 |
| `text-muted` | #5B6472 | #9AA6B6 |
| `text-link` | #1671CE | #6AA8F5 |

## Status badges

| Token | Hex | Crayola name |
|---|---|---|
| `status-draft` | #B0B7C6 | Cadet Blue |
| `status-funded` | #3A8EED | Logo blue |
| `status-active` | #68BC36 | Logo green |
| `status-proposed` | #FFAE42 | Yellow Orange |
| `status-disputed` | #FD5E53 | Sunset Orange |
| `status-arbitration` | #EE204D | Red |
| `status-settled` | #926EAE | Violet (Purple) |
| `status-awaiting-custody-approval` | #FF7538 | Orange |
| `status-fiat-pending` | #7366BD | Blue Violet |
| `status-lapsed` | #CB4154 | Brick Red |

## Brand scale (500 = logo blue)

50 #EFF6FF, 100 #D9EAFF, 200 #B7D7FF, 300 #89BEFF, 400 #4FA0FF, **500 #3A8EED**, 600 #1671CE, 700 #005CB0, 800 #00498F, 900 #003A72, 950 #00264F

## Implementation checklist

- [ ] Add `crayola-theme.css` tokens to the cx-commons `@theme` block
- [ ] Swap all 22 raw palette classes on action buttons for `bg-action-*` / `hover:bg-action-*-hover`
- [ ] Use `text-action-ink` on every tier except critical (`text-action-critical-ink`)
- [ ] Replace brand-500 link text with brand-600 on light backgrounds
- [ ] Point the nav bar at `bg-nav` with the `nav-active` underline
- [ ] Update status badges to the new status tokens (lapsed no longer shares disputed's color)
- [ ] Spot-check both modes after the swap
