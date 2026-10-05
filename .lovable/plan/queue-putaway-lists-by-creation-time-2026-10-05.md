# Queue Putaway lists by creation time

## Goal
Show exactly one Putaway list at a time: the earliest-created active list first, then advance only after every tray in that list is completed.

## Changes
1. Add each grouped list’s earliest API `created_at` timestamp to the list data.
2. Sort Putaway lists oldest-first using that timestamp, with List ID as a stable fallback.
3. Keep the current single Putaway slot so it remains visible while any tray in that list is still active; when the completed list disappears from active feeds, display the next oldest list.
4. Leave Picklist cards, dispatch stations, polling, and all existing card content unchanged.

## Verification
- Check oldest-first ordering with multiple Putaway lists.
- Confirm partial tray completion does not advance the queue.
- Confirm completing the final tray advances to the next Putaway list.
