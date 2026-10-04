import { MockVehicleSource } from './MockVehicleSource';
import { VehicleService } from './VehicleService';
import type { VehicleSource, VehicleSourceId } from './VehicleSource';

function createSource(id: VehicleSourceId): VehicleSource {
  switch (id) {
    case 'mock':
      return new MockVehicleSource();
  }
}

/** App-wide vehicle service. Add new sources (Bluetooth) to `createSource`. */
export const vehicleService = new VehicleService(createSource);
