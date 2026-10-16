export const STATIONS_PER_SIDE = 24;
export const SIDES = ["A", "B"] as const;
export type Side = (typeof SIDES)[number];

export type ListKind = "pick" | "put";
export type OrderType = "putaway" | "pickup";

export const LIST_KIND_LABEL: Record<ListKind, string> = {
  pick: "Picklist",
  put: "Putlist",
};

export type TrackerList = {
  id: string;
  listId: string;
  operatorId: string;
  /** Assigned list letter shown large on the card, e.g. "A", "B", "C" */
  listLetter: string;
  /** Legacy list kind; never use this to infer the API order type. */
  kind: ListKind;
  /** Live order type from metadata.type, when provided by the API. */
  orderType?: OrderType | null;
  status: "ready" | "inprogress";
  /** Earliest API creation time among trays in this list, used for FIFO queues. */
  createdAt: string | null;

  /** absolute deadline epoch-ms — only for status "ready" */
  deadline: number | null;
  /** station friendly name where the shelf arrived, e.g. "S-03" */
  station: string | null;
  /** shelves that already reached a station — only for status "inprogress" */
  reached: number;
  total: number;
  /** length 24 per side, index 0 = station 24 … index 23 = station 01 */
  sides: Record<Side, boolean[]>;
  /** Pickup includes coming trays too; preserve each tray's station, bin and arrival state. */
  stops?: { orderId: number; station: number | null; stationName: string; binId: string; arrived?: boolean }[];
};

export type PigeonHole = { letter: string; listIds: string[] };
