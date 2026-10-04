export const CHARACTERISTIC_PROPERTIES = [
  'read',
  'write',
  'writeWithoutResponse',
  'notify',
  'indicate',
] as const;
export type CharacteristicProperty = (typeof CHARACTERISTIC_PROPERTIES)[number];

export interface DiscoveredCharacteristicDTO {
  uuid: string;
  properties: CharacteristicProperty[];
}

export interface DiscoveredServiceDTO {
  uuid: string;
  characteristics: DiscoveredCharacteristicDTO[];
}

export type BluetoothTransport = 'ble' | 'classic' | 'unknown';

export interface BluetoothDeviceDTO {
  id: string;
  scooterId: string;
  name: string | null;
  /** Hardware address; Android may hide or randomise it. */
  address: string | null;
  transport: BluetoothTransport;
  lastRssi: number | null;
  services: DiscoveredServiceDTO[];
  lastConnectedAt: string | null;
}
