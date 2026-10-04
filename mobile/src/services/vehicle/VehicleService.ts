import { initialVehicleState, useVehicleStore } from '@/store/vehicleStore';
import type { CommandResult, TelemetrySnapshot } from '@/types/telemetry';
import { log } from '@/utils/logger';
import type { VehicleSource, VehicleSourceId } from './VehicleSource';

type TelemetryListener = (snapshot: TelemetrySnapshot) => void;

export const OIL_RESET_UNAVAILABLE_MESSAGE =
  'Vehicle-level reset unavailable. The Ntorq Bluetooth protocol has not been verified, so the app cannot reset the instrument-cluster reminder.';

/**
 * The only thing screens talk to for vehicle data.
 *
 *   UI -> VehicleService -> VehicleSource (mock now, Bluetooth in Phase 2)
 */
export class VehicleService {
  private source: VehicleSource | null = null;
  private readonly listeners = new Set<TelemetryListener>();

  constructor(
    private readonly createSource: (id: VehicleSourceId) => VehicleSource,
  ) {}

  async connect(sourceId: VehicleSourceId): Promise<void> {
    const { connection } = useVehicleStore.getState();
    if (connection === 'connecting' || connection === 'connected') return;

    const source = this.createSource(sourceId);
    this.source = source;
    useVehicleStore.setState({
      ...initialVehicleState,
      connection: 'connecting',
      deviceName: source.displayName,
      isSimulated: source.isSimulated,
      capabilities: source.capabilities,
    });
    log.info('vehicle', `Connecting to ${source.displayName}`);

    try {
      await source.start(snapshot => this.handleSnapshot(source, snapshot));
      if (this.source !== source) return; // disconnected while connecting
      useVehicleStore.setState({ connection: 'connected' });
      log.info('vehicle', `Connected to ${source.displayName}`);
    } catch (error) {
      log.error('vehicle', `Connection failed: ${String(error)}`);
      this.source = null;
      useVehicleStore.setState({
        ...initialVehicleState,
        connection: 'error',
        error: 'Could not connect to the scooter. Please try again.',
      });
    }
  }

  async disconnect(): Promise<void> {
    const source = this.source;
    this.source = null;
    if (source) {
      await source
        .stop()
        .catch(error =>
          log.warn('vehicle', `Error while disconnecting: ${String(error)}`),
        );
      log.info('vehicle', `Disconnected from ${source.displayName}`);
    }
    // Clearing the snapshot makes every value show "N/A" instead of a stale number.
    useVehicleStore.setState(initialVehicleState);
  }

  /** Subscribes to every telemetry snapshot (used by ride recording). */
  onTelemetry(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Asks the instrument cluster to reset its oil-change reminder.
   *
   * No reset command has been verified on a real Ntorq, so this never sends
   * anything and always reports NOT_SUPPORTED. It must only start returning
   * SUCCESS after the command has been proven on the rider's own scooter.
   */
  async resetOilReminder(): Promise<CommandResult> {
    const { capabilities } = useVehicleStore.getState();
    if (capabilities.oilReminderReset !== 'verified') {
      return {
        status: 'NOT_SUPPORTED',
        message: OIL_RESET_UNAVAILABLE_MESSAGE,
      };
    }
    return {
      status: 'FAILED',
      message:
        'A verified reset command is marked available but not implemented.',
    };
  }

  private handleSnapshot(source: VehicleSource, snapshot: TelemetrySnapshot) {
    if (this.source !== source) return; // late tick from a stopped source
    useVehicleStore.setState({ snapshot });
    this.listeners.forEach(listener => listener(snapshot));
  }
}
