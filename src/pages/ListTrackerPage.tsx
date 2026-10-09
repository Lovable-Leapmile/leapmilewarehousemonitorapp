import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { trackerListsQuery } from "@/lib/tracker.queries";
import { SketchCard } from "@/components/tracker/SketchCard";
import { LetterBadge } from "@/components/tracker/LetterBadge";
import { cn } from "@/lib/utils";
import type { PigeonHole, TrackerList } from "@/lib/tracker-types";
import { createPickupQueue, updatePickupQueue } from "@/lib/pickup-queue";

const PICKLIST_SLOTS = 5;

function placeSlots(
  slots: (string | null)[],
  candidates: TrackerList[],
  byId: Map<string, TrackerList>,
) {
  const candIds = new Set(candidates.map((l) => l.id));
  // Free slots whose list is gone or has switched rows.
  for (let i = 0; i < slots.length; i++) {
    const id = slots[i];
    if (id && !candIds.has(id)) slots[i] = null;
  }
  const placed = new Set(slots.filter(Boolean) as string[]);
  for (const list of candidates) {
    if (placed.has(list.id)) continue;
    const free = slots.indexOf(null);
    if (free === -1) break;
    slots[free] = list.id;
    placed.add(list.id);
  }
  return slots.map((id) => (id ? byId.get(id) ?? null : null));
}

const PIGEON_LETTERS = "ABCDEFGH".split("");

/**
 * Dispatch-station cards: 8 picking slots, badge left + list ID right.
 * Empty holes are grey/white, holes with ready-to-pick data turn green, and
 * holes whose letter is also on the pick list above turn yellow.
 */
function PigeonRow({ holes, pickLetters }: { holes: PigeonHole[]; pickLetters: Set<string> }) {
  const byLetter = new Map(holes.map((h) => [h.letter, h]));

  return (
    <section className="grid shrink-0 grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2.5">
      {PIGEON_LETTERS.map((letter) => {
        const ids = byLetter.get(letter)?.listIds ?? [];
        const filled = ids.length > 0;
        const picked = pickLetters.has(letter);
        const accent = picked ? "hsl(var(--warning))" : filled ? "hsl(var(--success))" : "hsl(var(--muted))";
        return (
          <div
            key={`pigeon-${letter}`}
            className={cn(
              "relative flex min-w-0 items-center justify-center gap-5 rounded-lg border px-3 py-2.5 sm:gap-7 sm:px-4 sm:py-3",
              picked
                ? "border-warning/70"
                : filled
                  ? "border-success/45"
                  : "border-foreground/10"
            )}
            style={{
              background: `linear-gradient(160deg,color-mix(in srgb,hsl(var(--card)) 90%,${accent} 10%),color-mix(in srgb,hsl(var(--background)) 88%,black))`,
              boxShadow: `inset 6px 6px 10px -6px oklch(0 0 0/70%),inset -4px -4px 8px -6px oklch(1 0 0/12%),0 2px 0 0 color-mix(in srgb,${accent} 35%,transparent),0 10px 22px -14px oklch(0 0 0/85%)`,
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 rounded-b-lg bg-[linear-gradient(to_bottom,oklch(1_0_0/8%),transparent)]"
            />
            <LetterBadge
              letter={letter}
              active={filled}
              highlight={picked}
              className="size-11 shrink-0 sm:size-12"
              textClassName="text-2xl sm:text-3xl"
            />
            <span className="flex min-w-0 flex-col items-center justify-center gap-1 leading-none">
              {!filled ? (
                <span className="font-mono text-2xl font-black tracking-tight text-foreground/35">
                  —
                </span>
              ) : (
                ids.slice(0, 2).map((id) => (
                  <span key={id} className="flex min-w-0 flex-col items-center leading-none">
                    <span className="w-full truncate text-center font-mono text-[0.85rem] tracking-[0.12em] text-foreground/70">
                      {id.slice(0, -3)}
                    </span>
                    <span
                      className={cn(
                        "mt-1 w-full truncate text-center font-mono text-4xl font-black tracking-tight",
                        picked ? "text-warning" : "text-success"
                      )}
                    >
                      {id.slice(-3)}
                    </span>
                  </span>
                ))
              )}
            </span>
          </div>
        );
      })}
    </section>
  );
}

const READY_LETTERS = "GHIJK".split("");

export default function ListTrackerPage() {
  const { data } = useQuery(trackerListsQuery);

  const incoming = data?.lists ?? [];
  const pigeonHoles = data?.pigeonHoles ?? [];
  const byId = new Map(incoming.map((l) => [l.id, l]));

  const ready = incoming.filter((l) => l.status === "ready");
  const putlists = ready
    .filter((l) => l.orderType === "putaway")
    .sort((a, b) => {
      const aCreated = a.createdAt ? Date.parse(a.createdAt) : Number.MAX_SAFE_INTEGER;
      const bCreated = b.createdAt ? Date.parse(b.createdAt) : Number.MAX_SAFE_INTEGER;
      return aCreated - bCreated || a.listId.localeCompare(b.listId);
    });

  // Keep a last-known ready card until its list reaches a pigeon hole.
  const pickupQueueRef = useRef(createPickupQueue(PICKLIST_SLOTS));
  const picklistSlots = updatePickupQueue(pickupQueueRef.current, incoming, pigeonHoles);
  const putlistSlotRef = useRef<(string | null)[]>([null]);
  const putlist = placeSlots(putlistSlotRef.current, putlists, byId)[0] ?? null;

  // Letters currently on the pick list above — their pigeon holes go yellow.
  const pickLetters = new Set(
    picklistSlots
      .map((l, i) => (l ? l.listLetter || READY_LETTERS[i] || "" : ""))
      .filter(Boolean)
      .map((s) => s.toUpperCase())
  );

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-background p-2 sm:p-3">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:64px_64px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 size-[70vw] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, color-mix(in srgb, hsl(var(--brand)) 22%, transparent), transparent 65%)",
        }}
      />
      <h1 className="sr-only">Warehouse task monitoring dashboard</h1>

      {/* outer bordered container, as in the sketch */}
      <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col gap-2 rounded-2xl border-2 border-border/60 bg-card/40 p-2 backdrop-blur sm:gap-3 sm:p-3">
        {incoming.length === 0 && pigeonHoles.length === 0 && !picklistSlots.some(Boolean) ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <p className="font-mono text-3xl font-bold tracking-[0.2em] text-foreground/60 sm:text-5xl">
              NO LIST AVAILABLE
            </p>
          </div>
        ) : (
          <>
            <section className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2 sm:gap-3">
              {picklistSlots.map((list, i) =>
                list ? (
                  <SketchCard
                    key={list.id}
                    list={list}
                    letter={list.listLetter || (READY_LETTERS[i] ?? "A")}
                    highlight={i === 0}
                    className={cn("h-full", i === 0 && "col-span-2")}
                  />
                ) : (
                  <div
                    key={i}
                    className={cn(
                      "h-full min-h-0 rounded-2xl border-2 border-dashed border-border/40 bg-card/20",
                      i === 0 && "col-span-2"
                    )}
                  />
                )
              )}
            </section>

            <div className="border-t border-foreground/20" />

            {putlist && (
              <section aria-label="Putlist order" className="h-[clamp(10rem,17vh,12rem)] shrink-0">
                <SketchCard
                  list={putlist}
                  letter={putlist.listLetter}
                  className="h-full"
                />
              </section>
            )}

            {putlist && <div className="border-t border-foreground/20" />}

            <PigeonRow holes={pigeonHoles} pickLetters={pickLetters} />
          </>
        )}
      </div>
    </main>
  );
}
