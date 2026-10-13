import { EventSource } from "eventsource";
import { backend } from "@/lib/pocketbase";

export async function subscribeToOrderCreates(onCreate: () => void) {
  if (typeof globalThis.EventSource === "undefined") {
    Object.assign(globalThis, { EventSource });
  }
  const pb = await backend();
  return pb.collection("orders").subscribe("*", ({ action }) => {
    if (action === "create") onCreate();
  });
}
