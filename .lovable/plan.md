# Separate Putlist Order Row

## What will change
- Split ready orders using the live API `metadata.type`: `putaway` becomes Putlist and `pickup` remains Picklist.
- Keep the existing five-card Picklist area and its slot-preserving behavior, but exclude Putlist orders from it.
- Add one full-width Putlist order card immediately above the A–P dispatch-station row.
- Show only the first available Putlist order at a time, using the same list ID, order-type badge, letter badge, station circles, bin suffixes, and live polling behavior as Picklist cards.
- Keep dispatch-station yellow highlighting tied only to the visible Picklist orders.

## Layout
```text
[ Picklist cards — existing layout ]
-----------------------------------
[ Putlist order — one full-width row ]
-----------------------------------
[ Dispatch stations A–P — existing ]
```

## Technical details
- Update only the dashboard presentation logic; API calls and two-second polling remain unchanged.
- Use `orderType === "putaway"` and `orderType === "pickup"` from API metadata, never the legacy list kind.
- Preserve the zero-scroll full-screen board by giving the Putlist row a bounded height and allowing the Picklist area to use the remaining space.
- Verify the visible layout and ensure the build remains error-free.
