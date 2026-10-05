import { cn } from "@/lib/utils";
import type { TrackerList } from "@/lib/tracker-types";
import { SketchStations } from "./SketchStations";
import { LetterBadge } from "./LetterBadge";

/**
 * Card modelled on the hand-drawn sketch: ID block on the left, circled
 * station numbers on the right — styled with the board's neon theme.
 */
export function SketchCard({
  list,
  letter,
  className,
  highlight = false,
}: {
  list: TrackerList;
  letter?: string;
  className?: string;
  /** Top pick list — rendered in the yellow accent. */
  highlight?: boolean;
}) {
  // All pick lists render in the yellow accent — green is no longer used here.
  const ready = false;
  const head = list.listId.slice(0, -3);
  const tail = list.listId.slice(-3);

  return (
    <article
      className={cn(
        "relative flex min-h-0 min-w-0 items-stretch gap-1 overflow-hidden rounded-2xl border-2 bg-card/80 py-3 pl-2 pr-2 backdrop-blur sm:gap-2 sm:py-4 sm:pl-2 sm:pr-2",
        ready ? "border-success/55" : "border-warning/70",
        highlight && "bg-[color-mix(in_oklab,var(--card)_88%,var(--warning)_12%)]",
        className
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", ready ? "bg-success" : "bg-warning")}
      />

      <div className="relative ml-1 flex w-[9.5rem] shrink-0 flex-col items-center justify-center gap-1 border-r border-foreground/20 pl-0 pr-2 text-center leading-none sm:w-[12.5rem] sm:pr-3">
        <span className="font-mono text-2xl tracking-[0.12em] text-foreground/85 sm:text-3xl">
          {head}
        </span>
        <span
          className={cn(
            "font-mono text-8xl font-black tracking-tight sm:text-[6.5rem]",
            ready ? "text-success" : "text-warning"
          )}
        >
          {tail}
        </span>

        {list.orderType && (
          <span
            className={cn(
              "mt-1 rounded-sm border px-2.5 py-1.5 font-sans text-base font-extrabold leading-none sm:text-lg",
              list.orderType === "putaway"
                ? "border-put bg-put text-put-foreground"
                : "border-pick bg-pick text-pick-foreground"
            )}
          >
            {list.orderType.toUpperCase()}
          </span>
        )}

        {/* Putaway cards do not use dispatch-station letter badges. */}
        {list.orderType !== "putaway" && (
          <LetterBadge
            letter={letter ?? list.listLetter}
            className="mt-3 size-[3.75rem]"
            textClassName="text-4xl"
          />
        )}
      </div>

      <SketchStations
        stops={list.stops ?? []}
        tone={ready ? "success" : "warning"}
        className="min-w-0 flex-1 pl-3 pr-1 sm:pl-4 sm:pr-1"
      />
    </article>
  );
}

