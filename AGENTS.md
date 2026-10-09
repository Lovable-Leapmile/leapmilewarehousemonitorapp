Order type indicators on the ready-list cards must come from API `metadata.type`, never the legacy ID-parity `kind`, because the latter is not a real order classification.
External Leapmile order requests are made directly from the browser (user decision — internal TV board, token exposure accepted); base URL and token live in `src/lib/leapmile.config.ts`.
Transient Leapmile failures are retried in the client fetch layer, and polling preserves each feed's last successful data on failure.
Putaway lists use a single FIFO slot ordered by earliest tray creation and advance only when the active list disappears after all trays complete.
Ready-card station markers use the measured card space to fit every tray at normal display zoom without clipping or scrolling.
Pickup cards use a retained five-slot client queue, with waiting lists admitted FIFO and slots released only by pigeon-hole list IDs, because absence from an active feed does not confirm dispatch.