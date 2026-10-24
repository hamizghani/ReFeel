# Familiar Product and State Specification

## Routes

- `/`: role gateway.
- `/shop`: active marketplace plus inert Coming soon items.
- `/listing/:id`: active listing detail.
- `/listing/:id/evidence`: source-linked Familiar Evidence.
- `/listing/:id/compare`: private reference comparison.
- `/match`: reference picker and Match results.
- `/sell`: seller workspace.
- `/sell/capture`: six-stage capture.
- `/sell/review`: finding decisions.
- `/sell/publish`: buyer-facing publication state.
- `/checkout`: bag, Buy now, simulated payment, reservation.
- `/orders`: order timeline.
- `/about`: compact product and simulation explanation.

## State

Use discriminated unions or explicit transition functions for view, listing availability, capture stage, finding review, comparison support, cart, reservation, and order status. Persist saved IDs, cart IDs, private references, finding decisions, reservation state, and order state. Reject impossible transitions such as adding Coming soon to cart or publishing before a finding decision.

## Evidence states

Each property has `supported`, `limited`, or `unavailable` support and may separately have seller status `unreviewed`, `confirmed`, `corrected`, or `unsure`.

## Match output

Return three candidates. Each candidate includes property-level result, support level, evidence count, and a grounded sentence. Missing values remain missing. No universal score.
