# Prevent hosted function service-degraded errors

## Goal
Keep the two-second dashboard refresh while reducing hosted-function pressure and preventing temporary platform-level 503 responses from blanking the board.

## Changes
1. **Batch the three order feeds**
   - Extend the hosted order function to accept a validated batch of approved filter sets.
   - Fetch in-progress, ready, and ready-to-pick data within one function invocation.
   - Preserve existing timeout, retry, 404-as-empty, and degraded-response behavior independently for each feed.

2. **Use one client poll**
   - Replace three simultaneous hosted-function calls with one batched call every two seconds.
   - Preserve the last successful result separately for each feed when a batch item is temporarily unavailable or the platform rejects an invocation.
   - Keep all existing grouping, sorting, Putlist, Picklist, and dispatch-station behavior unchanged.

3. **Verify stability**
   - Add focused batch-response tests.
   - Deploy the updated function and verify repeated polling returns successful responses without blanking the board.
   - Confirm the preview remains visible and receives fresh data across several refresh cycles.

## Technical details
- A single invocation reduces function boot pressure from three calls per interval to one.
- External Leapmile requests remain server-side so credentials are never exposed.
- The existing single-query request format remains supported for compatibility.
