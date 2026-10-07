import { STATIONS_PER_SIDE, type OrderType, type PigeonHole, type Side, type TrackerList } from "./tracker-types";
import { LEAPMILE_API_TOKEN, LEAPMILE_BASE_URL } from "./leapmile.config";

export type { PigeonHole, Side, TrackerList };

type OrderMetadata = {
  type?: string | null;
  qty?: number | null;
  badge?: string | null;
  item_id?: string | null;
  list_id?: string | null;
  list_status?: string | null;
  operator_id?: string | null;
};

export type OrderRecord = {
  metadata?: OrderMetadata | null;
  comment?: string[] | null;
  id: number;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: number | null;
  bin_id: string | null;
  tray_status: string | null;
  station_id: string | null;
  station_friendly_name: string | null;
  auto_complete_time: number | null;
};

const lastSuccessfulOrders = new Map<string, OrderRecord[]>();

const ORDER_QUERIES = {
  inProgress: "tray_status=inprogress&status=active&order_by_field=created_at&order_by_type=ASC",
  ready: "tray_status=tray_ready_to_use&status=active&order_by_field=updated_at&order_by_type=ASC",
  pickReady: "tray_status=completed&status=inactive&list_status=ready_to_pick&order_by_field=updated_at&order_by_type=ASC",
} as const;

type FeedName = keyof typeof ORDER_QUERIES;
type FeedPayload = { records?: OrderRecord[]; unavailable?: boolean } | null;

function queryParams(query: string) {
  return Object.fromEntries(new URLSearchParams(query));
}

function cachedFeed(name: FeedName) {
  return lastSuccessfulOrders.get(ORDER_QUERIES[name]) ?? [];
}

function resolveFeed(name: FeedName, payload: FeedPayload): OrderRecord[] {
  const query = ORDER_QUERIES[name];
  if (payload?.unavailable) return cachedFeed(name);
  const records = payload?.records ?? [];
  lastSuccessfulOrders.set(query, records);
  return records;
}

/** Fetch all dashboard feeds in one hosted invocation to avoid runtime churn. */
export async function fetchOrderFeeds() {
  const queries = Object.fromEntries(
    Object.entries(ORDER_QUERIES).map(([name, query]) => [name, queryParams(query)]),
  );
  const { data, error } = await supabase.functions.invoke("leapmile-orders", {
    body: { queries },
  });

  if (error) {
    return {
      inProgress: cachedFeed("inProgress"),
      ready: cachedFeed("ready"),
      pickReady: cachedFeed("pickReady"),
    };
  }

  const feeds = (data as { feeds?: Partial<Record<FeedName, FeedPayload>> } | null)?.feeds;
  return {
    inProgress: resolveFeed("inProgress", feeds?.inProgress ?? null),
    ready: resolveFeed("ready", feeds?.ready ?? null),
    pickReady: resolveFeed("pickReady", feeds?.pickReady ?? null),
  };
}

async function getOrders(query: string): Promise<OrderRecord[]> {
  const params = queryParams(query);
  const { data, error } = await supabase.functions.invoke("leapmile-orders", {
    body: { query: params },
  });
  if (error) return lastSuccessfulOrders.get(query) ?? [];

  const payload = data as { records?: OrderRecord[]; unavailable?: boolean } | null;
  if (payload?.unavailable) return lastSuccessfulOrders.get(query) ?? [];

  const records = payload?.records ?? [];
  lastSuccessfulOrders.set(query, records);
  return records;
}

/** Trays still travelling — their lists are IN PROGRESS. */
export function fetchInProgressOrders() {
  return getOrders(ORDER_QUERIES.inProgress);
}

/** Trays that arrived at a station (e.g. "S-01") — READY candidates. */
export function fetchReadyOrders() {
  return getOrders(ORDER_QUERIES.ready);
}

/** Map a valid physical station to the legacy side grid; display uses the original name. */
function locate(order: OrderRecord): { side: Side; station: number } | null {
  const m = /^(?:S-)?(\d{1,2})$/.exec((order.station_friendly_name ?? "").trim());
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= STATIONS_PER_SIDE) return { side: "A", station: n };
  }
  const parts = (order.station_id ?? "").split("-");
  if (parts.length >= 4) {
    const bank = Number(parts[2]);
    const station = Number(parts[3]);
    if (Number.isFinite(bank) && Number.isFinite(station)) {
      const side: Side = bank === 0 ? "A" : "B";
      const n = station === 0 ? 1 : station;
      if (n >= 1 && n <= STATIONS_PER_SIDE) return { side, station: n };
    }
  }
  return null;
}

function emptySides(): Record<Side, boolean[]> {
  return {
    A: Array.from({ length: STATIONS_PER_SIDE }, () => false),
    B: Array.from({ length: STATIONS_PER_SIDE }, () => false),
  };
}

/** Station 24 is rendered first, station 01 last. */
function slotIndex(station: number) {
  return STATIONS_PER_SIDE - station;
}

function listKey(order: OrderRecord) {
  return (
    order.metadata?.list_id ?? order.comment?.[0] ?? String(order.user_id ?? order.id)
  );
}

function orderType(order: OrderRecord): OrderType | null {
  const type = order.metadata?.type?.toLowerCase();
  return type === "putaway" || type === "pickup" ? type : null;
}

/**
 * Groups both feeds by list id. A list is READY only when none of its trays
 * are still in progress; otherwise it is IN PROGRESS.
 */
export function buildLists(
  inProgress: OrderRecord[],
  ready: OrderRecord[]
): TrackerList[] {
  const groups = new Map<string, { pending: OrderRecord[]; arrived: OrderRecord[] }>();

  const bucket = (key: string) => {
    let g = groups.get(key);
    if (!g) {
      g = { pending: [], arrived: [] };
      groups.set(key, g);
    }
    return g;
  };

  for (const o of inProgress) bucket(listKey(o)).pending.push(o);
  for (const o of ready) bucket(listKey(o)).arrived.push(o);

  const lists: TrackerList[] = [];

  for (const [key, group] of groups) {
    const all = [...group.arrived, ...group.pending];
    const first = all[0];
    if (!first) continue;

    const sides = emptySides();
    const stops: NonNullable<TrackerList["stops"]> = [];
    let station: string | null = null;

    for (const order of group.arrived) {
      const spot = locate(order);
      if (spot) sides[spot.side][slotIndex(spot.station)] = true;
      station ??= order.station_friendly_name ?? null;
      stops.push({
        orderId: order.id,
        station: spot ? spot.station + (spot.side === "B" ? STATIONS_PER_SIDE : 0) : null,
        stationName: order.station_friendly_name?.trim() || "—",
        binId: order.bin_id?.trim() || "—",
      });
    }

    const reached = group.arrived.length;
    const total = all.length;
    const isReady = group.pending.length === 0 && reached > 0;

    const budgetMin = all.find((o) => o.auto_complete_time != null)?.auto_complete_time ?? 5;
    const createdAt = all.reduce<string | null>((earliest, order) => {
      const value = order.created_at;
      if (!value || !Number.isFinite(Date.parse(value))) return earliest;
      if (!earliest || Date.parse(value) < Date.parse(earliest)) return value;
      return earliest;
    }, null);
    let baseMs = 0;
    for (const o of all) {
      const t = Date.parse(o.updated_at ?? "");
      if (Number.isFinite(t) && t > baseMs) baseMs = t;
    }
    const deadline = isReady ? (baseMs > 0 ? baseMs : Date.now()) + budgetMin * 60_000 : null;

    const anchorId = all.reduce((min, o) => Math.min(min, o.id), Number.MAX_SAFE_INTEGER);

    lists.push({
      id: `list-${key}`,
      listId: first.metadata?.list_id ?? first.comment?.[0] ?? String(anchorId).padStart(9, "0"),
      listLetter: first.metadata?.badge ?? "A",
      operatorId: first.metadata?.operator_id ?? first.comment?.[1] ?? "",
      kind: anchorId % 2 === 0 ? "pick" : "put",
      orderType: all.map(orderType).find((type) => type !== null) ?? null,
      status: isReady ? "ready" : "inprogress",
      createdAt,
      deadline,
      station,
      reached,
      total,
      sides,
      stops: stops.sort(
        (a, b) =>
          a.stationName.localeCompare(b.stationName, undefined, {
            numeric: true,
            sensitivity: "base",
          }) || a.orderId - b.orderId
      ),
    });
  }

  return lists.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ready" ? -1 : 1;
    return b.listId.localeCompare(a.listId);
  });
}

/** Completed trays whose list is ready to be picked from the pigeon holes. */
export function fetchPickReadyOrders() {
  return getOrders(ORDER_QUERIES.pickReady);
}

/** One entry per badge (pigeon hole) with the distinct list ids inside it. */
export function buildPigeonHoles(orders: OrderRecord[]): PigeonHole[] {
  const holes = new Map<string, Set<string>>();
  for (const o of orders) {
    const letter = (o.metadata?.badge ?? "").trim().toUpperCase();
    const listId = o.metadata?.list_id ?? "";
    if (!letter || !listId) continue;
    let set = holes.get(letter);
    if (!set) {
      set = new Set<string>();
      holes.set(letter, set);
    }
    set.add(listId);
  }
  return [...holes.entries()]
    .map(([letter, set]) => ({ letter, listIds: [...set] }))
    .sort((a, b) => a.letter.localeCompare(b.letter));
}
