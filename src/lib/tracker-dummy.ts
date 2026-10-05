import { STATIONS_PER_SIDE, type Side, type TrackerList } from "./tracker-types";

function sides(a: number[], b: number[]): Record<Side, boolean[]> {
  const build = (active: number[]) =>
    Array.from({ length: STATIONS_PER_SIDE }, (_, i) => active.includes(STATIONS_PER_SIDE - i));
  return { A: build(a), B: build(b) };
}

type Seed = {
  listId: string;
  operatorId: string;
  kind: TrackerList["kind"];
  status: TrackerList["status"];
  station: string;
  reached: number;
  total: number;
  a: number[];
  b: number[];
};

const SEEDS: Seed[] = [
  // 10 Ready
  { listId: "301780892", operatorId: "Ca.4513943", kind: "pick", status: "ready", station: "S-04", reached: 6, total: 6, a: [1, 4, 6, 9, 12, 14, 17, 20, 23], b: [2, 5, 7, 10, 12, 15, 18, 21, 24] },
  { listId: "301781177", operatorId: "Ca.4513880", kind: "put", status: "ready", station: "S-19", reached: 4, total: 4, a: [19, 23], b: [8, 15] },
  { listId: "301781203", operatorId: "Ca.4514271", kind: "pick", status: "ready", station: "S-02", reached: 7, total: 7, a: [2, 6, 13, 20], b: [5, 18, 24] },
  { listId: "301781512", operatorId: "Ca.4513861", kind: "put", status: "ready", station: "S-09", reached: 5, total: 5, a: [9, 15], b: [1, 11, 20] },
  { listId: "301781729", operatorId: "Ca.4514055", kind: "pick", status: "ready", station: "S-23", reached: 8, total: 8, a: [23, 18, 10], b: [4, 13, 19] },
  { listId: "301780801", operatorId: "Ca.4514201", kind: "put", status: "ready", station: "S-05", reached: 3, total: 3, a: [5, 10], b: [7, 14] },
  { listId: "301780935", operatorId: "Ca.4514117", kind: "pick", status: "ready", station: "S-12", reached: 9, total: 9, a: [12, 3, 21], b: [8, 16] },
  { listId: "301781258", operatorId: "Ca.4514444", kind: "put", status: "ready", station: "S-07", reached: 5, total: 5, a: [7, 15, 22], b: [2, 11] },
  { listId: "301781399", operatorId: "Ca.4513777", kind: "pick", status: "ready", station: "S-17", reached: 6, total: 6, a: [17, 6, 14], b: [3, 19] },
  { listId: "301781555", operatorId: "Ca.4514666", kind: "put", status: "ready", station: "S-21", reached: 4, total: 4, a: [21, 9], b: [5, 13, 24] },

  // 8 In Progress
  { listId: "301780914", operatorId: "Ca.4513927", kind: "put", status: "inprogress", station: "S-11", reached: 3, total: 8, a: [11, 19], b: [6] },
  { listId: "301781046", operatorId: "Ca.4514102", kind: "pick", status: "inprogress", station: "S-07", reached: 5, total: 9, a: [7, 14, 22], b: [3, 16] },
  { listId: "301781338", operatorId: "Ca.4513995", kind: "put", status: "inprogress", station: "S-16", reached: 2, total: 7, a: [16], b: [9] },
  { listId: "301781459", operatorId: "Ca.4514330", kind: "pick", status: "inprogress", station: "S-21", reached: 6, total: 10, a: [21, 12, 3], b: [10, 17, 24] },
  { listId: "301781684", operatorId: "Ca.4514188", kind: "put", status: "inprogress", station: "S-13", reached: 4, total: 11, a: [13, 5], b: [7, 22] },
  { listId: "301780977", operatorId: "Ca.4514302", kind: "pick", status: "inprogress", station: "S-03", reached: 2, total: 6, a: [3, 11], b: [4, 18] },
  { listId: "301781288", operatorId: "Ca.4514220", kind: "put", status: "inprogress", station: "S-20", reached: 7, total: 9, a: [20, 4, 14], b: [2, 10] },
  { listId: "301781633", operatorId: "Ca.4514088", kind: "pick", status: "inprogress", station: "S-08", reached: 3, total: 8, a: [8, 17, 1], b: [6, 19] },
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const DUMMY_LISTS: TrackerList[] = SEEDS.map((s, i) => ({
  id: `dummy-${i}`,
  listId: s.listId,
  listLetter: LETTERS[i % LETTERS.length] ?? "A",
  operatorId: s.operatorId,
  kind: s.kind,

  status: s.status,
  createdAt: null,
  deadline: null,
  station: s.station,
  reached: s.reached,
  total: s.total,
  sides: sides(s.a, s.b),
}));
