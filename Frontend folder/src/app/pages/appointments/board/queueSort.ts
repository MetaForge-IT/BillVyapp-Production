import type { Appointment, Walkin, WalkinStatus } from "./boardTypes";

// ─── Timeline ordering ──────────────────────────────────────────────────────
// Most recently updated first — any status/edit bumps `updatedAt` / sortKey
// so the row moves to the top of the Timeline.
export function sortAppointmentQueue(list: Appointment[]): Appointment[] {
  return [...list].sort((a, b) => {
    if (b.sortKey !== a.sortKey) return b.sortKey - a.sortKey;
    return a.time.localeCompare(b.time);
  });
}

export function walkinQueueRank(status: WalkinStatus): number {
  if (status === "in-service") return 1;
  if (status === "done") return 2;
  return 0; // waiting
}

export function sortWalkinQueue(list: Walkin[]): Walkin[] {
  return [...list].sort((a, b) => {
    const rankDiff = walkinQueueRank(a.status) - walkinQueueRank(b.status);
    return rankDiff !== 0 ? rankDiff : a.sortKey - b.sortKey;
  });
}
