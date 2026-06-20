import { appDb } from "../schema";

export async function listPreTripTasksForTrip(tripId: string) {
  return appDb.preTripTasks.where("tripId").equals(tripId).toArray();
}
