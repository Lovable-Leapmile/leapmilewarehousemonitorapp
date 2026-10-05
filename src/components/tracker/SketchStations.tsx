import { useEffect, useRef, useState } from "react";
import type { TrackerList } from "@/lib/tracker-types";
import { cn } from "@/lib/utils";

/**
 * Size station markers to the actual card space so every tray remains visible
 * at normal zoom, including in the shorter pickup rows on TV displays.
 */
function stationLayout(width: number, height: number, count: number) {
  if (!count || !width || !height) return { columns: 1, size: 48 };
  let best = { columns: 1, size: 0 };
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const size = Math.min(88, width / columns - 8, height / rows - 20);
    if (size > best.size) best = { columns, size };
  }
  return { ...best, size: Math.max(14, best.size) };
}

export function SketchStations({
  stops,
  tone = "success",
  className,
}: {
  stops?: TrackerList["stops"];
  tone?: "success" | "warning";
  className?: string;
}) {
  // Keep the station and bin from the same tray record; never invent station numbers.
  const trays = stops ?? [];
  const containerRef = useRef<HTMLUListElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const { columns, size } = stationLayout(bounds.width, bounds.height, trays.length);
  const fontSize = Math.max(13, Math.min(size * 0.45, 40));
  const binFontSize = Math.max(10, Math.min(size * 0.21, 15));
  const circle =
    tone === "warning"
      ? "border-warning/70 bg-warning/10 text-warning"
      : "border-success/70 bg-success/10 text-success";

  const chip =
    tone === "warning"
      ? "border-warning bg-warning text-background"
      : "border-success bg-success text-background";

  return (
    <ul
      ref={containerRef}
      className={cn("grid content-center justify-start items-center gap-x-1", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, ${size + 8}px)` }}
    >
      {trays.map((tray) => (
        <li key={tray.orderId} className="flex min-w-0 flex-col items-center text-center">
          <span
            className={cn(
              "grid shrink-0 place-items-center whitespace-nowrap rounded-full border-2 font-mono font-semibold tabular-nums",
              circle,
            )}
            style={{ width: size, height: size, fontSize: tray.stationName.length > 2 ? fontSize * 0.65 : fontSize }}
          >
            {tray.stationName}
          </span>
          {/* Shelf ID chip overlaps the circle it belongs to, so the pairing
              is unambiguous even when rows sit close together. */}
          <span
            className={cn(
              "-mt-2 rounded-md border-2 px-1 py-px font-mono font-bold leading-none tracking-tight tabular-nums shadow-sm",
              chip
            )}
            style={{ fontSize: binFontSize }}
          >
            {tray.binId === "—" ? "—" : tray.binId.slice(-5)}
          </span>
        </li>
      ))}
    </ul>
  );
}
