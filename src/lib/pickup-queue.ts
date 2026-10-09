import type { PigeonHole, TrackerList } from "./tracker-types";

export type PickupQueue = {
  slots: (TrackerList | null)[];
  waiting: Map<string, TrackerList>;
  dispatched: Set<string>;
};

export function createPickupQueue(size: number): PickupQueue {
  return { slots: Array(size).fill(null), waiting: new Map(), dispatched: new Set() };
}

/** A missing ready record is not completion: only the pigeon-hole feed releases a card. */
export function updatePickupQueue(
  queue: PickupQueue,
  incoming: TrackerList[],
  holes: PigeonHole[],
): (TrackerList | null)[] {
  for (const hole of holes) {
    for (const id of hole.listIds) queue.dispatched.add(id.trim());
  }
  const ready = incoming
    .filter((list) => list.orderType === "pickup" && list.status === "ready")
    .sort((a, b) => {
      const time = (list: TrackerList) => {
        const value = Date.parse(list.createdAt ?? "");
        return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
      };
      return time(a) - time(b) || a.listId.localeCompare(b.listId, undefined, { numeric: true });
    });
  const byId = new Map(ready.map((list) => [list.id, list]));
  queue.slots = queue.slots.map((list) => {
    if (!list || queue.dispatched.has(list.listId.trim())) return null;
    return byId.get(list.id) ?? list;
  });
  const placed = new Set(queue.slots.flatMap((list) => list ? [list.id] : []));
  for (const list of ready) {
    if (!placed.has(list.id) && !queue.dispatched.has(list.listId.trim())) {
      queue.waiting.set(list.id, list);
    }
  }
  for (const [id, list] of queue.waiting) {
    if (queue.dispatched.has(list.listId.trim())) queue.waiting.delete(id);
  }
  for (const [id, list] of queue.waiting) {
    const free = queue.slots.indexOf(null);
    if (free === -1) break;
    queue.slots[free] = list;
    queue.waiting.delete(id);
  }
  return queue.slots;
}