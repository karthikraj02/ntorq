export type PacketDirection = 'RX' | 'TX';

export interface CapturedPacketDTO {
  /** ISO-8601 with millisecond precision. */
  timestamp: string;
  direction: PacketDirection;
  serviceUuid: string | null;
  characteristicUuid: string;
  hex: string;
  base64: string;
  length: number;
  rssi: number | null;
}

export interface ProtocolCaptureDTO {
  id: string;
  scooterId: string;
  name: string;
  deviceName: string | null;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  packets: CapturedPacketDTO[];
  createdAt: string;
}

export interface ProtocolCaptureSummaryDTO
  extends Omit<ProtocolCaptureDTO, 'packets'> {
  packetCount: number;
}
