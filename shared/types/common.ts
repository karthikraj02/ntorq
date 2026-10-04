/**
 * Fields shared by every record that is created offline on the phone and
 * synchronised to the server. `id` is a client-generated UUID so records can
 * be created without a network round trip.
 */
export interface SyncableDTO {
  id: string;
  createdAt: string;
  /** Client-side modification time. Last-write-wins uses this value. */
  updatedAt: string;
  /** Set when the record was deleted; kept so deletions can be synchronised. */
  deletedAt: string | null;
}

/** Calendar date without a time zone, formatted YYYY-MM-DD. */
export type IsoDate = string;
