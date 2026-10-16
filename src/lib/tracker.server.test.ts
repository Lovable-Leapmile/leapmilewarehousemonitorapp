import { test } from "node:test";
import { strict as assert } from "node:assert";
import { buildLists, type OrderRecord } from "./tracker.server";

function tray(id: number, type = "pickup"): OrderRecord {
  return {
    id, metadata: { list_id: "100001", type }, status: "active",
    created_at: "2026-10-16T09:00:00Z", updated_at: "2026-10-16T09:01:00Z",
    user_id: null, bin_id: `G0-ROB-R01-00-0${id}`, tray_status: "inprogress",
    station_id: null, station_friendly_name: `S-0${id}`, auto_complete_time: null,
  };
}

test("Pickup cards contain coming and ready bins with their own arrival state", () => {
  const [list] = buildLists([tray(2)], [tray(1)]);
  assert.equal(list?.status, "inprogress");
  assert.deepEqual(list?.stops?.map(stop => [stop.binId, stop.arrived]), [
    ["G0-ROB-R01-00-01", true], ["G0-ROB-R01-00-02", false],
  ]);
  assert.equal(list?.reached, 1);
  assert.equal(list?.total, 2);
});

test("Pickup bins become ready within the same list when they arrive", () => {
  const [list] = buildLists([], [tray(1), tray(2)]);
  assert.equal(list?.status, "ready");
  assert.deepEqual(list?.stops?.map(stop => stop.arrived), [true, true]);
});

test("Putaway station display still excludes coming bins", () => {
  const [list] = buildLists([tray(2, "putaway")], [tray(1, "putaway")]);
  assert.deepEqual(list?.stops?.map(stop => stop.orderId), [1]);
});