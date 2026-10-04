/** REST collections that the offline sync queue pushes to / pulls from. */
export const SYNC_ENTITIES = [
  'scooters',
  'service-reminders',
  'maintenance',
  'rides',
] as const;

export type SyncEntity = (typeof SYNC_ENTITIES)[number];
