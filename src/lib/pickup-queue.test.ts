/// <reference types="node" />
import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { createPickupQueue, updatePickupQueue } from "./pickup-queue";
import type { TrackerList } from "./tracker-types";

function pickup(id: number): TrackerList {
  return {
    id: `list-${id}`, listId: String(id), listLetter: "A", operatorId: "",
    kind: "pick", orderType: "pickup", status: "ready",
    createdAt: new Date(id * 1000).toISOString(), deadline: null, station: null,
    reached: 1, total: 1, sides: { A: [], B: [] }, stops: [],
  };
}

describe("Pickup ready waiting order", () => {
  test("created Pickup lists enter the five slots before their bins are ready", () => {
    const queue = createPickupQueue(5);
    const created = { ...pickup(1), status: "inprogress" as const, reached: 0 };
    assert.equal(updatePickupQueue(queue, [created], [])[0]?.status, "inprogress");
    assert.equal(updatePickupQueue(queue, [pickup(1)], [])[0]?.status, "ready");
  });
  test("new created Pickup lists wait until an older ready list reaches a pigeon hole", () => {
    const queue = createPickupQueue(5);
    updatePickupQueue(queue, [1, 2, 3, 4, 5].map(pickup), []);
    const created = { ...pickup(6), status: "inprogress" as const, reached: 0 };
    assert.deepEqual(updatePickupQueue(queue, [created], []).map(l => l?.listId), ["1", "2", "3", "4", "5"]);
    assert.equal(updatePickupQueue(queue, [], [{ letter: "A", listIds: ["1"] }])[0]?.listId, "6");
  });
  test("five older cards stay visible while a sixth new card waits", () => {
    const queue = createPickupQueue(5);
    updatePickupQueue(queue, [1, 2, 3, 4, 5].map(pickup), []);
    assert.deepEqual(updatePickupQueue(queue, [6, 5, 4, 3, 2, 1].map(pickup), []).map(l => l?.listId),
      ["1", "2", "3", "4", "5"]);
    assert.deepEqual([...queue.waiting.keys()], ["list-6"]);
  });
  test("missing old ready records remain visible until reaching a pigeon hole", () => {
    const queue = createPickupQueue(1);
    updatePickupQueue(queue, [pickup(1)], []);
    assert.equal(updatePickupQueue(queue, [pickup(2)], [])[0]?.listId, "1");
    assert.equal(updatePickupQueue(queue, [], [])[0]?.listId, "1");
  });
  test("pigeon-hole arrival releases only that slot and admits the oldest waiting card", () => {
    const queue = createPickupQueue(5);
    updatePickupQueue(queue, [7, 6, 5, 4, 3, 2, 1].map(pickup), []);
    assert.deepEqual(updatePickupQueue(queue, [], [{ letter: "A", listIds: ["2"] }]).map(l => l?.listId),
      ["1", "6", "3", "4", "5"]);
    assert.deepEqual([...queue.waiting.keys()], ["list-7"]);
  });
  test("dispatched cards do not return from a stale ready feed and visible tray data refreshes", () => {
    const queue = createPickupQueue(1);
    updatePickupQueue(queue, [pickup(1), pickup(2)], []);
    updatePickupQueue(queue, [pickup(1), pickup(2)], [{ letter: "A", listIds: ["1"] }]);
    assert.equal(updatePickupQueue(queue, [pickup(1), { ...pickup(2), reached: 2 }], [])[0]?.reached, 2);
    assert.equal(queue.slots[0]?.listId, "2");
  });
});