/**
 * Geotab Data Connector (OData) Wrapper
 * Provides access to aggregate KPI data via the OData feed.
 */

import { geotabAuth } from './geotab-auth.js';

const DATA_CONNECTOR_BASE = 'https://data-connector.geotab.com/odata/v1';

export class GeotabDataConnector {
  private getAuthHeader(): string | null {
    const auth = geotabAuth.getDataConnectorAuth();
    if (!auth) return null;
    return 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
  }

  private async query<T>(table: string, params: Record<string, string> = {}): Promise<T[]> {
    const authHeader = this.getAuthHeader();
    if (!authHeader) throw new Error('Geotab credentials not configured for Data Connector');

    const queryParams = new URLSearchParams(params);
    const url = `${DATA_CONNECTOR_BASE}/${table}?${queryParams.toString()}`;

    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Data Connector ${table}: ${res.status} ${body}`);
    }

    const data = await res.json() as { value?: T[] };
    return data.value || [];
  }

  /** Get fleet-wide KPI summary for a date range */
  async getFleetKPIs(fromDate: string, toDate: string): Promise<FleetKPI[]> {
    return this.query<FleetKPI>('DeviceStatusInfo', {
      $filter: `DateTime ge ${fromDate} and DateTime le ${toDate}`,
      $top: '1000',
    });
  }

  /** Get trip summaries with driver + vehicle context */
  async getTripSummaries(fromDate: string, toDate: string, top: number = 500): Promise<TripSummary[]> {
    return this.query<TripSummary>('Trips', {
      $filter: `StartDateTime ge ${fromDate} and StartDateTime le ${toDate}`,
      $orderby: 'StartDateTime desc',
      $top: String(top),
    });
  }

  /** Get fuel usage data */
  async getFuelUsage(fromDate: string, toDate: string): Promise<FuelUsage[]> {
    return this.query<FuelUsage>('FuelUsage', {
      $filter: `DateTime ge ${fromDate} and DateTime le ${toDate}`,
      $top: '1000',
    });
  }

  /** Get exception event summaries (safety events aggregated) */
  async getExceptionSummaries(fromDate: string, toDate: string): Promise<ExceptionSummary[]> {
    return this.query<ExceptionSummary>('ExceptionEvents', {
      $filter: `ActiveFrom ge ${fromDate} and ActiveFrom le ${toDate}`,
      $top: '2000',
    });
  }

  /** Get device info for the fleet */
  async getDeviceInfo(): Promise<DeviceInfo[]> {
    return this.query<DeviceInfo>('Devices', {
      $top: '200',
    });
  }

  /** Get driver info */
  async getDriverInfo(): Promise<DriverInfo[]> {
    return this.query<DriverInfo>('Users', {
      $filter: `IsDriver eq true`,
      $top: '200',
    });
  }
}

// --- Data Connector Types ---

export interface FleetKPI {
  DeviceId: string;
  DateTime: string;
  Latitude?: number;
  Longitude?: number;
  Speed?: number;
  Bearing?: number;
  Odometer?: number;
  IsDeviceCommunicating?: boolean;
  CurrentStateDuration?: string;
}

export interface TripSummary {
  DeviceId: string;
  DriverId?: string;
  StartDateTime: string;
  StopDateTime: string;
  Distance: number;
  DrivingDuration: string;
  IdlingDuration?: string;
  MaximumSpeed?: number;
  AverageSpeed?: number;
  StopCount?: number;
}

export interface FuelUsage {
  DeviceId: string;
  DateTime: string;
  FuelConsumed?: number;
  FuelEconomy?: number;
  IdleFuelConsumed?: number;
  TotalDistance?: number;
}

export interface ExceptionSummary {
  Id: string;
  DeviceId: string;
  DriverId?: string;
  RuleId: string;
  RuleName?: string;
  ActiveFrom: string;
  ActiveTo?: string;
  Duration?: string;
  Distance?: number;
}

export interface DeviceInfo {
  Id: string;
  Name: string;
  SerialNumber?: string;
  VIN?: string;
  LicensePlate?: string;
  DeviceType?: string;
  ActiveFrom?: string;
  ActiveTo?: string;
}

export interface DriverInfo {
  Id: string;
  Name: string;
  FirstName?: string;
  LastName?: string;
  IsDriver: boolean;
}

export const geotabDataConnector = new GeotabDataConnector();
