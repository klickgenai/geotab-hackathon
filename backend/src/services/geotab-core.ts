/**
 * Geotab Core API (JSON-RPC) Wrapper
 * Provides typed methods for common Geotab API calls.
 */

import { geotabAuth } from './geotab-auth.js';

interface RpcRequest {
  method: string;
  params: Record<string, unknown>;
}

export class GeotabCore {
  protected async call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const sessionCreds = await geotabAuth.getSessionCredentials();
    const apiUrl = await geotabAuth.getApiUrl();

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        params: { ...params, credentials: sessionCreds },
      }),
    });

    if (!res.ok) throw new Error(`Geotab API ${method} failed: ${res.status}`);
    const data = await res.json() as { result: T; error?: { message: string } };
    if (data.error) throw new Error(`Geotab ${method}: ${data.error.message}`);
    return data.result as T;
  }

  protected async multiCall(calls: RpcRequest[]): Promise<unknown[]> {
    const sessionCreds = await geotabAuth.getSessionCredentials();
    const apiUrl = await geotabAuth.getApiUrl();

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'ExecuteMultiCall',
        params: {
          calls: calls.map((c) => ({
            method: c.method,
            params: { ...c.params },
          })),
          credentials: sessionCreds,
        },
      }),
    });

    if (!res.ok) throw new Error(`Geotab MultiCall failed: ${res.status}`);
    const data = await res.json() as { result: unknown[]; error?: { message: string } };
    if (data.error) throw new Error(`Geotab MultiCall: ${data.error.message}`);
    return data.result;
  }

  async getDevices(search?: Record<string, unknown>): Promise<GeotabDevice[]> {
    return this.call<GeotabDevice[]>('Get', {
      typeName: 'Device',
      search: search || {},
    });
  }

  async getUsers(search?: Record<string, unknown>): Promise<GeotabUser[]> {
    return this.call<GeotabUser[]>('Get', {
      typeName: 'User',
      search: search || {},
    });
  }

  async getTrips(deviceId: string, fromDate: string, toDate: string): Promise<GeotabTrip[]> {
    return this.call<GeotabTrip[]>('Get', {
      typeName: 'Trip',
      search: {
        deviceSearch: { id: deviceId },
        fromDate,
        toDate,
      },
    });
  }

  async getExceptionEvents(
    fromDate: string,
    toDate: string,
    ruleId?: string,
    deviceId?: string,
  ): Promise<GeotabExceptionEvent[]> {
    const search: Record<string, unknown> = { fromDate, toDate };
    if (ruleId) search.ruleSearch = { id: ruleId };
    if (deviceId) search.deviceSearch = { id: deviceId };
    return this.call<GeotabExceptionEvent[]>('Get', {
      typeName: 'ExceptionEvent',
      search,
    });
  }

  async getStatusData(
    deviceId: string,
    diagnosticId: string,
    fromDate: string,
    toDate: string,
  ): Promise<GeotabStatusData[]> {
    return this.call<GeotabStatusData[]>('Get', {
      typeName: 'StatusData',
      search: {
        deviceSearch: { id: deviceId },
        diagnosticSearch: { id: diagnosticId },
        fromDate,
        toDate,
      },
    });
  }

  async getFaultData(
    deviceId: string,
    fromDate: string,
    toDate: string,
  ): Promise<GeotabFaultData[]> {
    return this.call<GeotabFaultData[]>('Get', {
      typeName: 'FaultData',
      search: {
        deviceSearch: { id: deviceId },
        fromDate,
        toDate,
      },
    });
  }

  /** Fetch fault data across the entire fleet (no device filter) */
  async getFaultDataFleet(
    fromDate: string,
    toDate: string,
  ): Promise<GeotabFaultData[]> {
    return this.call<GeotabFaultData[]>('Get', {
      typeName: 'FaultData',
      search: { fromDate, toDate },
    });
  }

  async getRules(): Promise<GeotabRule[]> {
    return this.call<GeotabRule[]>('Get', { typeName: 'Rule' });
  }

  async getDiagnostics(search?: Record<string, unknown>): Promise<GeotabDiagnostic[]> {
    return this.call<GeotabDiagnostic[]>('Get', {
      typeName: 'Diagnostic',
      search: search || {},
    });
  }

  /** Batch-fetch trips for multiple devices using MultiCall */
  async getAllTrips(
    deviceIds: string[],
    fromDate: string,
    toDate: string,
  ): Promise<GeotabTrip[]> {
    if (deviceIds.length === 0) return [];

    // MultiCall has a practical limit; batch in groups of 10
    const batchSize = 10;
    const allTrips: GeotabTrip[] = [];

    for (let i = 0; i < deviceIds.length; i += batchSize) {
      const batch = deviceIds.slice(i, i + batchSize);
      const calls: RpcRequest[] = batch.map((deviceId) => ({
        method: 'Get',
        params: {
          typeName: 'Trip',
          search: {
            deviceSearch: { id: deviceId },
            fromDate,
            toDate,
          },
        },
      }));

      const results = await this.multiCall(calls);
      for (const result of results) {
        if (Array.isArray(result)) {
          allTrips.push(...(result as GeotabTrip[]));
        }
      }
    }

    return allTrips;
  }

  /** Fetch fleet snapshot: devices + users + recent exception events in one MultiCall */
  async getFleetSnapshot(days: number = 30): Promise<{
    devices: GeotabDevice[];
    users: GeotabUser[];
    exceptionEvents: GeotabExceptionEvent[];
  }> {
    const toDate = new Date().toISOString();
    const fromDate = new Date(Date.now() - days * 86400000).toISOString();

    const results = await this.multiCall([
      { method: 'Get', params: { typeName: 'Device', search: {} } },
      { method: 'Get', params: { typeName: 'User', search: {} } },
      {
        method: 'Get',
        params: {
          typeName: 'ExceptionEvent',
          search: { fromDate, toDate },
        },
      },
    ]);

    return {
      devices: results[0] as GeotabDevice[],
      users: results[1] as GeotabUser[],
      exceptionEvents: results[2] as GeotabExceptionEvent[],
    };
  }

  /** Fetch real-time device status for all devices */
  async getDeviceStatusInfo(): Promise<GeotabDeviceStatus[]> {
    return this.call<GeotabDeviceStatus[]>('Get', {
      typeName: 'DeviceStatusInfo',
      search: {},
    });
  }

  /** Fetch GPS breadcrumb log records for a specific device */
  async getLogRecords(deviceId: string, fromDate: string, toDate: string): Promise<GeotabLogRecord[]> {
    return this.call<GeotabLogRecord[]>('Get', {
      typeName: 'LogRecord',
      search: {
        deviceSearch: { id: deviceId },
        fromDate,
        toDate,
      },
    });
  }
}

// --- Geotab Types ---

export interface GeotabDevice {
  id: string;
  name: string;
  serialNumber?: string;
  vehicleIdentificationNumber?: string;
  licensePlate?: string;
  comment?: string;
  activeFrom?: string;
  activeTo?: string;
  deviceType?: string;
  groups?: { id: string }[];
  engineType?: { id: string };
  odometer?: number;
  fuelTankCapacity?: number;
}

export interface GeotabUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  isDriver?: boolean;
  driverGroups?: { id: string }[];
  keys?: { serialNumber: string; driverKeyType?: string }[];
}

export interface GeotabTrip {
  id: string;
  device: { id: string };
  driver?: { id: string };
  dateTime: string;
  start: string;
  stop: string;
  distance: number;
  drivingDuration: string;
  idlingDuration?: string;
  stopDuration?: string;
  maximumSpeed?: number;
  averageSpeed?: number;
  speedRange1?: number;
  speedRange2?: number;
  speedRange3?: number;
}

export interface GeotabExceptionEvent {
  id: string;
  rule: { id: string; name?: string };
  device: { id: string };
  driver?: { id: string };
  activeFrom: string;
  activeTo?: string;
  duration?: string;
  distance?: number;
  state?: number;
}

export interface GeotabStatusData {
  id: string;
  device: { id: string };
  diagnostic: { id: string };
  dateTime: string;
  data: number;
}

export interface GeotabFaultData {
  id: string;
  device: { id: string };
  diagnostic: { id: string };
  dateTime: string;
  failureMode?: { id: string };
  controller?: { id: string };
  count?: number;
  faultState?: string;
}

export interface GeotabRule {
  id: string;
  name: string;
  comment?: string;
  baseType?: string;
}

export interface GeotabDiagnostic {
  id: string;
  name: string;
  code?: number;
  source?: string;
  unitOfMeasure?: string;
}

export interface GeotabDeviceStatus {
  bearing: number;
  currentStateDuration: string;
  dateTime: string;
  device: { id: string };
  driver?: { id: string } | string;
  groups?: { id: string }[];
  isDeviceCommunicating: boolean;
  isDriving: boolean;
  latitude: number;
  longitude: number;
  speed: number;
}

export interface GeotabLogRecord {
  dateTime: string;
  device: { id: string };
  latitude: number;
  longitude: number;
  speed: number;
}

export const geotabCore = new GeotabCore();
