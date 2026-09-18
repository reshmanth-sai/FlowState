/**
 * Web Bluetooth (BLE) Integration for Consumer Wearable Heart Rate Monitors
 * Complies with the standard Bluetooth Heart Rate Profile (Service UUID: 0x180D, Characteristic: 0x2A37).
 */

export interface BLEHeartRateData {
  heartRate: number;
  rrIntervals?: number[];
  energyExpended?: number;
  contactDetected?: boolean;
}

export class WebBluetoothHeartRate {
  private device: any = null;
  private server: any = null;
  private characteristic: any = null;
  public isConnected: boolean = false;
  public deviceName: string = '';

  async connect(onHeartRate: (data: BLEHeartRateData) => void): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      throw new Error('Web Bluetooth API is not supported in this browser. Use Chrome or Edge.');
    }

    try {
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      });

      this.deviceName = this.device.name || 'Bluetooth Heart Rate Monitor';
      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService('heart_rate');
      this.characteristic = await service.getCharacteristic('heart_rate_measurement');

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const parsed = this.parseHeartRate(value);
        onHeartRate(parsed);
      });

      this.isConnected = true;
      this.device.addEventListener('gattserverdisconnected', () => {
        this.isConnected = false;
      });

      return true;
    } catch (err: any) {
      this.isConnected = false;
      throw err;
    }
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
  }

  private parseHeartRate(data: DataView): BLEHeartRateData {
    const flags = data.getUint8(0);
    const rate16Bits = flags & 0x1;
    let heartRate: number;

    if (rate16Bits) {
      heartRate = data.getUint16(1, /*littleEndian=*/ true);
    } else {
      heartRate = data.getUint8(1);
    }

    return { heartRate };
  }
}

export const bleHeartRate = new WebBluetoothHeartRate();
