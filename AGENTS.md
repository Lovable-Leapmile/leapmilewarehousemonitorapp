Order type indicators on the ready-list cards must come from API `metadata.type`, never the legacy ID-parity `kind`, because the latter is not a real order classification.
External Leapmile order requests are made directly from the browser (user decision — internal TV board, token exposure accepted); base URL and token live in `src/lib/leapmile.config.ts`.
Transient Leapmile failures are retried in the client fetch layer, and polling preserves each feed's last successful data on failure.
Putaway and Pickup sections show every active list stacked oldest-created first, sized to fit without scrolling.
Ready-card station markers use the measured card space to fit every tray at normal display zoom without clipping or scrolling.
Pickup cards use a retained five-slot client queue admitting both in-progress and ready lists FIFO and releasing slots only by pigeon-hole list IDs, because absence from an active feed does not confirm dispatch.
Pickup stops include pending and arrived trays with an explicit arrival flag; Putaway stops remain arrived-only so each display preserves its own workflow.