import {
  buildLists,
  buildPigeonHoles,
  fetchOrderFeeds,
} from "./tracker.server";

export async function getTrackerLists() {
  const { inProgress, ready, pickReady } = await fetchOrderFeeds();
  const lists = buildLists(inProgress, ready);
  const pigeonHoles = buildPigeonHoles(pickReady);
  return { lists, pigeonHoles, live: lists.length > 0 || pigeonHoles.length > 0 };
}
