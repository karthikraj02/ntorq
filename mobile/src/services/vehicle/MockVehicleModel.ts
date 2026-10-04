export interface MockVehicleState {
  speedKmh: number;
  rpm: number;
  fuelPercent: number;
  batteryVolts: number;
}

type Phase = 'idle' | 'accelerating' | 'cruising' | 'braking';

const IDLE_RPM = 1500;

/**
 * A made-up riding simulation used only for MOCK mode. Nothing here describes
 * how a real Ntorq behaves; it just produces plausible-looking, changing
 * numbers so the UI can be built and tested without a scooter.
 */
export class MockVehicleModel {
  private phase: Phase = 'idle';
  private phaseLeftSec: number;
  private targetKmh = 0;
  private speedKmh = 0;
  private fuelPercent: number;
  private rpm = IDLE_RPM;
  private batteryVolts = 12.9;

  constructor(private readonly random: () => number = Math.random) {
    this.fuelPercent = 55 + this.random() * 35;
    this.phaseLeftSec = 1 + this.random() * 2;
  }

  private between(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  private enter(phase: Phase): void {
    this.phase = phase;
    switch (phase) {
      case 'idle':
        this.phaseLeftSec = this.between(2, 5);
        break;
      case 'accelerating':
        this.targetKmh = this.between(25, 70);
        break;
      case 'cruising':
        this.phaseLeftSec = this.between(8, 20);
        break;
      case 'braking':
        break;
    }
  }

  step(dtSec: number): MockVehicleState {
    switch (this.phase) {
      case 'idle':
        this.phaseLeftSec -= dtSec;
        if (this.phaseLeftSec <= 0) this.enter('accelerating');
        break;
      case 'accelerating':
        this.speedKmh = Math.min(this.targetKmh, this.speedKmh + 6 * dtSec);
        if (this.speedKmh >= this.targetKmh) this.enter('cruising');
        break;
      case 'cruising':
        this.phaseLeftSec -= dtSec;
        this.speedKmh = Math.max(
          0,
          this.targetKmh + Math.sin(this.phaseLeftSec * 1.3) * 1.5,
        );
        if (this.phaseLeftSec <= 0) this.enter('braking');
        break;
      case 'braking':
        this.speedKmh = Math.max(0, this.speedKmh - 8 * dtSec);
        if (this.speedKmh <= 0) this.enter('idle');
        break;
    }

    this.rpm = this.computeRpm();
    this.batteryVolts = this.computeBattery();
    const distanceKm = (this.speedKmh * dtSec) / 3600;
    this.fuelPercent = Math.max(
      0,
      this.fuelPercent - distanceKm * 0.45 - 0.0005 * dtSec,
    );

    return this.state();
  }

  state(): MockVehicleState {
    return {
      speedKmh: this.speedKmh,
      rpm: this.rpm,
      fuelPercent: this.fuelPercent,
      batteryVolts: this.batteryVolts,
    };
  }

  private computeRpm(): number {
    if (this.speedKmh <= 0.05) return IDLE_RPM + this.between(-40, 40);
    const launch = Math.min(this.speedKmh, 15);
    const cruise = Math.max(this.speedKmh - 15, 0);
    const base = 2800 + launch * 220 - Math.min(cruise, 25) * 18 + cruise * 12;
    return Math.min(9000, base + this.between(-50, 50));
  }

  private computeBattery(): number {
    const charging = this.speedKmh > 0.05 ? 13.9 + this.rpm / 20000 : 13.3;
    return charging + this.between(-0.03, 0.03);
  }
}
