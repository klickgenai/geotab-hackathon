/**
 * Comprehensive seed data for FleetShield AI demo.
 * 25 vehicles, 30 drivers with varied risk profiles.
 * 3 "problem" drivers with high risk + burnout signals.
 */

export interface SeedVehicle {
  id: string;
  name: string;
  vin: string;
  licensePlate: string;
  type: string;
  year: number;
  make: string;
  model: string;
  odometer: number;
  activeFrom: string;
  faultCount?: number;
  activeFaultCount?: number;
  fuelTankCapacity?: number;
}

export interface SeedDriver {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  employeeNumber: string;
  pin: string;
  hireDate: string;
  vehicleId: string;
  riskProfile: 'low' | 'moderate' | 'high' | 'critical';
  burnoutRisk: 'low' | 'moderate' | 'high';
  tenureYears: number;
}

export interface SeedSafetyEvent {
  id: string;
  driverId: string;
  vehicleId: string;
  type: SafetyEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dateTime: string;
  latitude: number;
  longitude: number;
  details: string;
}

export type SafetyEventType =
  | 'harsh_braking'
  | 'harsh_acceleration'
  | 'speeding'
  | 'seatbelt'
  | 'distracted_driving'
  | 'drowsy_driving'
  | 'lane_departure'
  | 'tailgating'
  | 'rolling_stop'
  | 'idle_excessive';

export interface SeedTripDay {
  driverId: string;
  vehicleId: string;
  date: string;
  trips: number;
  totalDistance: number; // km
  drivingHours: number;
  idlingMinutes: number;
  maxSpeed: number;
  avgSpeed: number;
  events: number;
  nightDrivingHours: number;
  restHoursBetweenShifts: number;
}

export interface SeedFleetKPI {
  date: string;
  totalDistance: number;
  totalTrips: number;
  totalEvents: number;
  avgSafetyScore: number;
  activeVehicles: number;
  activeDrivers: number;
  fuelConsumed: number;
  idlingPercent: number;
}

// Helper to generate dates
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// --- VEHICLES (populated at runtime by fleet-data-provider) ---
export const seedVehicles: SeedVehicle[] = [];

export function generateStaticVehicles(): SeedVehicle[] {
  return [
    { id: 'v1', name: 'Unit 101', vin: '1HGBH41JXMN109186', licensePlate: 'FL-2847', type: 'Class 8 Tractor', year: 2022, make: 'Freightliner', model: 'Cascadia', odometer: 245000, activeFrom: '2022-03-15' },
    { id: 'v2', name: 'Unit 102', vin: '2HGBH41JXMN109187', licensePlate: 'FL-2848', type: 'Class 8 Tractor', year: 2023, make: 'Kenworth', model: 'T680', odometer: 178000, activeFrom: '2023-01-10' },
    { id: 'v3', name: 'Unit 103', vin: '3HGBH41JXMN109188', licensePlate: 'FL-2849', type: 'Class 8 Tractor', year: 2021, make: 'Peterbilt', model: '579', odometer: 312000, activeFrom: '2021-06-20' },
    { id: 'v4', name: 'Unit 104', vin: '4HGBH41JXMN109189', licensePlate: 'FL-2850', type: 'Class 8 Tractor', year: 2022, make: 'Volvo', model: 'VNL 860', odometer: 267000, activeFrom: '2022-08-01' },
    { id: 'v5', name: 'Unit 105', vin: '5HGBH41JXMN109190', licensePlate: 'FL-2851', type: 'Class 8 Tractor', year: 2023, make: 'International', model: 'LT', odometer: 145000, activeFrom: '2023-04-15' },
    { id: 'v6', name: 'Unit 106', vin: '6HGBH41JXMN109191', licensePlate: 'FL-2852', type: 'Class 6 Box', year: 2022, make: 'Freightliner', model: 'M2 106', odometer: 198000, activeFrom: '2022-02-28' },
    { id: 'v7', name: 'Unit 107', vin: '7HGBH41JXMN109192', licensePlate: 'FL-2853', type: 'Class 6 Box', year: 2021, make: 'Hino', model: '338', odometer: 289000, activeFrom: '2021-09-12' },
    { id: 'v8', name: 'Unit 108', vin: '8HGBH41JXMN109193', licensePlate: 'FL-2854', type: 'Class 8 Tractor', year: 2024, make: 'Kenworth', model: 'W990', odometer: 67000, activeFrom: '2024-01-05' },
    { id: 'v9', name: 'Unit 109', vin: '9HGBH41JXMN109194', licensePlate: 'FL-2855', type: 'Class 8 Tractor', year: 2022, make: 'Mack', model: 'Anthem', odometer: 234000, activeFrom: '2022-05-20' },
    { id: 'v10', name: 'Unit 110', vin: '10HGBH41JXMN10919', licensePlate: 'FL-2856', type: 'Class 8 Tractor', year: 2023, make: 'Freightliner', model: 'Cascadia', odometer: 156000, activeFrom: '2023-02-14' },
    { id: 'v11', name: 'Unit 111', vin: '11HGBH41JXMN10920', licensePlate: 'FL-2857', type: 'Class 5 Van', year: 2023, make: 'Ford', model: 'F-550', odometer: 123000, activeFrom: '2023-03-01' },
    { id: 'v12', name: 'Unit 112', vin: '12HGBH41JXMN10921', licensePlate: 'FL-2858', type: 'Class 8 Tractor', year: 2021, make: 'Peterbilt', model: '389', odometer: 345000, activeFrom: '2021-04-10' },
    { id: 'v13', name: 'Unit 113', vin: '13HGBH41JXMN10922', licensePlate: 'FL-2859', type: 'Class 8 Tractor', year: 2022, make: 'Volvo', model: 'VNR 640', odometer: 278000, activeFrom: '2022-07-22' },
    { id: 'v14', name: 'Unit 114', vin: '14HGBH41JXMN10923', licensePlate: 'FL-2860', type: 'Class 6 Box', year: 2023, make: 'Isuzu', model: 'FTR', odometer: 98000, activeFrom: '2023-06-15' },
    { id: 'v15', name: 'Unit 115', vin: '15HGBH41JXMN10924', licensePlate: 'FL-2861', type: 'Class 8 Tractor', year: 2022, make: 'Kenworth', model: 'T680', odometer: 289000, activeFrom: '2022-01-08' },
    { id: 'v16', name: 'Unit 116', vin: '16HGBH41JXMN10925', licensePlate: 'FL-2862', type: 'Class 8 Tractor', year: 2024, make: 'Freightliner', model: 'Cascadia', odometer: 45000, activeFrom: '2024-03-20' },
    { id: 'v17', name: 'Unit 117', vin: '17HGBH41JXMN10926', licensePlate: 'FL-2863', type: 'Class 5 Van', year: 2022, make: 'Ram', model: '5500', odometer: 167000, activeFrom: '2022-11-01' },
    { id: 'v18', name: 'Unit 118', vin: '18HGBH41JXMN10927', licensePlate: 'FL-2864', type: 'Class 8 Tractor', year: 2023, make: 'International', model: 'LT', odometer: 134000, activeFrom: '2023-05-10' },
    { id: 'v19', name: 'Unit 119', vin: '19HGBH41JXMN10928', licensePlate: 'FL-2865', type: 'Class 8 Tractor', year: 2021, make: 'Mack', model: 'Pinnacle', odometer: 356000, activeFrom: '2021-02-15' },
    { id: 'v20', name: 'Unit 120', vin: '20HGBH41JXMN10929', licensePlate: 'FL-2866', type: 'Class 8 Tractor', year: 2022, make: 'Peterbilt', model: '579', odometer: 245000, activeFrom: '2022-09-05' },
    { id: 'v21', name: 'Unit 121', vin: '21HGBH41JXMN10930', licensePlate: 'FL-2867', type: 'Class 6 Box', year: 2023, make: 'Hino', model: 'L6', odometer: 89000, activeFrom: '2023-08-12' },
    { id: 'v22', name: 'Unit 122', vin: '22HGBH41JXMN10931', licensePlate: 'FL-2868', type: 'Class 8 Tractor', year: 2022, make: 'Volvo', model: 'VNL 760', odometer: 267000, activeFrom: '2022-04-18' },
    { id: 'v23', name: 'Unit 123', vin: '23HGBH41JXMN10932', licensePlate: 'FL-2869', type: 'Class 8 Tractor', year: 2024, make: 'Kenworth', model: 'T880', odometer: 34000, activeFrom: '2024-06-01' },
    { id: 'v24', name: 'Unit 124', vin: '24HGBH41JXMN10933', licensePlate: 'FL-2870', type: 'Class 5 Van', year: 2023, make: 'Ford', model: 'E-450', odometer: 112000, activeFrom: '2023-10-20' },
    { id: 'v25', name: 'Unit 125', vin: '25HGBH41JXMN10934', licensePlate: 'FL-2871', type: 'Class 8 Tractor', year: 2022, make: 'Freightliner', model: 'Cascadia', odometer: 298000, activeFrom: '2022-06-30' },
  ];
}

// --- DRIVERS (populated at runtime by fleet-data-provider) ---
export const seedDrivers: SeedDriver[] = [];

export function generateStaticDrivers(): SeedDriver[] {
  return [
    { id: 'd1', firstName: 'James', lastName: 'Wilson', name: 'James Wilson', employeeNumber: '241', pin: '1847', hireDate: '2019-03-15', vehicleId: 'v1', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 7 },
    { id: 'd2', firstName: 'Sarah', lastName: 'Chen', name: 'Sarah Chen', employeeNumber: '318', pin: '2956', hireDate: '2020-08-20', vehicleId: 'v2', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 5 },
    { id: 'd3', firstName: 'Marcus', lastName: 'Rivera', name: 'Marcus Rivera', employeeNumber: '405', pin: '7234', hireDate: '2023-11-01', vehicleId: 'v3', riskProfile: 'critical', burnoutRisk: 'high', tenureYears: 1 },
    { id: 'd4', firstName: 'Emily', lastName: 'Davis', name: 'Emily Davis', employeeNumber: '127', pin: '4081', hireDate: '2021-02-10', vehicleId: 'v4', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 5 },
    { id: 'd5', firstName: 'Robert', lastName: 'Kim', name: 'Robert Kim', employeeNumber: '562', pin: '3619', hireDate: '2018-06-05', vehicleId: 'v5', riskProfile: 'low', burnoutRisk: 'moderate', tenureYears: 8 },
    { id: 'd6', firstName: 'Lisa', lastName: 'Martinez', name: 'Lisa Martinez', employeeNumber: '293', pin: '8472', hireDate: '2022-04-12', vehicleId: 'v6', riskProfile: 'moderate', burnoutRisk: 'low', tenureYears: 4 },
    { id: 'd7', firstName: 'Jake', lastName: 'Thompson', name: 'Jake Thompson', employeeNumber: '714', pin: '5190', hireDate: '2024-02-15', vehicleId: 'v7', riskProfile: 'high', burnoutRisk: 'high', tenureYears: 1 },
    { id: 'd8', firstName: 'Maria', lastName: 'Gonzalez', name: 'Maria Gonzalez', employeeNumber: '186', pin: '6328', hireDate: '2020-11-20', vehicleId: 'v8', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 5 },
    { id: 'd9', firstName: 'David', lastName: 'Lee', name: 'David Lee', employeeNumber: '439', pin: '2745', hireDate: '2019-07-30', vehicleId: 'v9', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 6 },
    { id: 'd10', firstName: 'Amanda', lastName: 'Brown', name: 'Amanda Brown', employeeNumber: '651', pin: '9013', hireDate: '2021-09-15', vehicleId: 'v10', riskProfile: 'moderate', burnoutRisk: 'moderate', tenureYears: 4 },
    { id: 'd11', firstName: 'Michael', lastName: 'Taylor', name: 'Michael Taylor', employeeNumber: '378', pin: '4567', hireDate: '2022-01-08', vehicleId: 'v11', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 4 },
    { id: 'd12', firstName: 'Derek', lastName: 'Shaw', name: 'Derek Shaw', employeeNumber: '802', pin: '1382', hireDate: '2024-06-01', vehicleId: 'v12', riskProfile: 'high', burnoutRisk: 'high', tenureYears: 0.5 },
    { id: 'd13', firstName: 'Rachel', lastName: 'White', name: 'Rachel White', employeeNumber: '215', pin: '7896', hireDate: '2020-03-22', vehicleId: 'v13', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 6 },
    { id: 'd14', firstName: 'Carlos', lastName: 'Hernandez', name: 'Carlos Hernandez', employeeNumber: '547', pin: '3041', hireDate: '2021-12-05', vehicleId: 'v14', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 4 },
    { id: 'd15', firstName: 'Jennifer', lastName: 'Clark', name: 'Jennifer Clark', employeeNumber: '163', pin: '6754', hireDate: '2019-10-18', vehicleId: 'v15', riskProfile: 'moderate', burnoutRisk: 'moderate', tenureYears: 6 },
    { id: 'd16', firstName: 'Thomas', lastName: 'Wright', name: 'Thomas Wright', employeeNumber: '429', pin: '8215', hireDate: '2023-03-20', vehicleId: 'v16', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 3 },
    { id: 'd17', firstName: 'Nicole', lastName: 'Adams', name: 'Nicole Adams', employeeNumber: '681', pin: '5937', hireDate: '2022-07-14', vehicleId: 'v17', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 4 },
    { id: 'd18', firstName: 'Brian', lastName: 'Hall', name: 'Brian Hall', employeeNumber: '356', pin: '2468', hireDate: '2020-05-28', vehicleId: 'v18', riskProfile: 'moderate', burnoutRisk: 'low', tenureYears: 6 },
    { id: 'd19', firstName: 'Stephanie', lastName: 'Young', name: 'Stephanie Young', employeeNumber: '194', pin: '7103', hireDate: '2021-08-10', vehicleId: 'v19', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 5 },
    { id: 'd20', firstName: 'Kevin', lastName: 'King', name: 'Kevin King', employeeNumber: '723', pin: '4826', hireDate: '2023-01-15', vehicleId: 'v20', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 3 },
    { id: 'd21', firstName: 'Laura', lastName: 'Scott', name: 'Laura Scott', employeeNumber: '467', pin: '9351', hireDate: '2022-10-05', vehicleId: 'v21', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 3 },
    { id: 'd22', firstName: 'Andrew', lastName: 'Green', name: 'Andrew Green', employeeNumber: '582', pin: '1679', hireDate: '2019-04-22', vehicleId: 'v22', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 7 },
    { id: 'd23', firstName: 'Michelle', lastName: 'Baker', name: 'Michelle Baker', employeeNumber: '839', pin: '5204', hireDate: '2024-01-10', vehicleId: 'v23', riskProfile: 'moderate', burnoutRisk: 'low', tenureYears: 2 },
    { id: 'd24', firstName: 'Daniel', lastName: 'Nelson', name: 'Daniel Nelson', employeeNumber: '310', pin: '8647', hireDate: '2021-06-18', vehicleId: 'v24', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 5 },
    { id: 'd25', firstName: 'Angela', lastName: 'Carter', name: 'Angela Carter', employeeNumber: '745', pin: '3982', hireDate: '2020-12-01', vehicleId: 'v25', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 5 },
    { id: 'd26', firstName: 'Ryan', lastName: 'Mitchell', name: 'Ryan Mitchell', employeeNumber: '158', pin: '6215', hireDate: '2023-09-15', vehicleId: 'v1', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 2 },
    { id: 'd27', firstName: 'Patricia', lastName: 'Roberts', name: 'Patricia Roberts', employeeNumber: '624', pin: '4738', hireDate: '2022-03-28', vehicleId: 'v5', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 4 },
    { id: 'd28', firstName: 'Eric', lastName: 'Turner', name: 'Eric Turner', employeeNumber: '491', pin: '1053', hireDate: '2024-04-05', vehicleId: 'v10', riskProfile: 'moderate', burnoutRisk: 'moderate', tenureYears: 1 },
    { id: 'd29', firstName: 'Diana', lastName: 'Phillips', name: 'Diana Phillips', employeeNumber: '276', pin: '8491', hireDate: '2021-11-12', vehicleId: 'v15', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 4 },
    { id: 'd30', firstName: 'Samuel', lastName: 'Campbell', name: 'Samuel Campbell', employeeNumber: '853', pin: '2176', hireDate: '2023-07-22', vehicleId: 'v20', riskProfile: 'low', burnoutRisk: 'low', tenureYears: 2 },
  ];
}

// --- SAFETY EVENTS (populated at runtime by fleet-data-provider) ---
export const seedSafetyEvents: SeedSafetyEvent[] = [];

export function generateStaticSafetyEvents(): SeedSafetyEvent[] {
  // Need drivers to generate events - use static drivers as reference
  const drivers = generateStaticDrivers();
  return _generateSafetyEventsFromDrivers(drivers);
}

function _generateSafetyEventsFromDrivers(drivers: SeedDriver[]): SeedSafetyEvent[] {
  const events: SeedSafetyEvent[] = [];
  const types: SafetyEventType[] = [
    'harsh_braking', 'harsh_acceleration', 'speeding', 'seatbelt',
    'distracted_driving', 'drowsy_driving', 'lane_departure', 'tailgating',
    'rolling_stop', 'idle_excessive',
  ];

  let eventId = 1;

  for (const driver of drivers) {
    // Events per day based on risk profile
    const eventsPerDay = driver.riskProfile === 'critical' ? 3.5
      : driver.riskProfile === 'high' ? 2.2
      : driver.riskProfile === 'moderate' ? 0.8
      : 0.3;

    for (let day = 0; day < 90; day++) {
      const numEvents = Math.floor(eventsPerDay + (Math.random() - 0.3));
      for (let e = 0; e < numEvents; e++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const severity = driver.riskProfile === 'critical'
          ? (['medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 3)]
          : driver.riskProfile === 'high'
          ? (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)]
          : (['low', 'medium'] as const)[Math.floor(Math.random() * 2)];

        events.push({
          id: `se${eventId++}`,
          driverId: driver.id,
          vehicleId: driver.vehicleId,
          type,
          severity,
          dateTime: new Date(Date.now() - day * 86400000 - Math.random() * 86400000).toISOString(),
          latitude: 33.7 + Math.random() * 5,
          longitude: -84.4 + Math.random() * 10,
          details: `${type.replace(/_/g, ' ')} event detected`,
        });
      }
    }
  }

  return events.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

// --- DAILY TRIP SUMMARIES (populated at runtime by fleet-data-provider) ---
export const seedTripDays: SeedTripDay[] = [];

export function generateStaticTripDays(): SeedTripDay[] {
  const drivers = generateStaticDrivers();
  return _generateTripDaysFromDrivers(drivers);
}

function _generateTripDaysFromDrivers(drivers: SeedDriver[]): SeedTripDay[] {
  const tripDays: SeedTripDay[] = [];

  for (const driver of drivers) {
    for (let day = 0; day < 90; day++) {
      const isBurnout = driver.burnoutRisk === 'high';
      const isHighRisk = driver.riskProfile === 'high' || driver.riskProfile === 'critical';

      if (!isBurnout && Math.random() < 0.15) continue;
      if (isBurnout && Math.random() < 0.03) continue;

      const drivingHours = isBurnout
        ? (day % 2 === 0 ? 12.5 : 9) + Math.random() * 2
        : randomBetween(6, 10);

      const restHours = isBurnout
        ? 5 + Math.random() * 1.5
        : randomBetween(9, 14);

      const nightHours = isBurnout
        ? 1 + (day < 10 ? 2.5 : day < 20 ? 1.5 : 0.5) + Math.random() * 0.3
        : randomBetween(0, 1.5);

      tripDays.push({
        driverId: driver.id,
        vehicleId: driver.vehicleId,
        date: daysAgo(day),
        trips: Math.floor(randomBetween(2, 6)),
        totalDistance: randomBetween(200, 650),
        drivingHours,
        idlingMinutes: randomBetween(15, isHighRisk ? 90 : 45),
        maxSpeed: randomBetween(isHighRisk ? 100 : 85, isHighRisk ? 130 : 105),
        avgSpeed: randomBetween(55, 80),
        events: isHighRisk ? Math.floor(randomBetween(1, 5)) : Math.floor(randomBetween(0, 2)),
        nightDrivingHours: nightHours,
        restHoursBetweenShifts: restHours,
      });
    }
  }

  return tripDays;
}

// --- FLEET KPIs (populated at runtime by fleet-data-provider) ---
export const seedFleetKPIs: SeedFleetKPI[] = [];

export function generateStaticFleetKPIs(): SeedFleetKPI[] {
  const kpis: SeedFleetKPI[] = [];

  for (let day = 0; day < 90; day++) {
    const activeVehicles = Math.floor(randomBetween(20, 25));
    const activeDrivers = Math.floor(randomBetween(22, 28));

    kpis.push({
      date: daysAgo(day),
      totalDistance: randomBetween(8000, 14000),
      totalTrips: Math.floor(randomBetween(80, 140)),
      totalEvents: Math.floor(randomBetween(25, 65)),
      avgSafetyScore: randomBetween(68, 82),
      activeVehicles,
      activeDrivers,
      fuelConsumed: randomBetween(3200, 5800),
      idlingPercent: randomBetween(8, 18),
    });
  }

  return kpis;
}

// --- Helper: Get driver stats ---
export function getDriverStats(driverId: string) {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return null;

  const events30 = seedSafetyEvents.filter(
    (e) => e.driverId === driverId && new Date(e.dateTime) > new Date(Date.now() - 30 * 86400000),
  );

  const trips30 = seedTripDays.filter(
    (t) => t.driverId === driverId && new Date(t.date) > new Date(Date.now() - 30 * 86400000),
  );

  const totalDistance = trips30.reduce((sum, t) => sum + t.totalDistance, 0);
  const totalHours = trips30.reduce((sum, t) => sum + t.drivingHours, 0);
  const avgDailyHours = trips30.length > 0 ? totalHours / trips30.length : 0;
  const avgRestHours = trips30.length > 0 ? trips30.reduce((s, t) => s + t.restHoursBetweenShifts, 0) / trips30.length : 0;
  const nightHours = trips30.reduce((sum, t) => sum + t.nightDrivingHours, 0);

  const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  events30.forEach((e) => severityCounts[e.severity]++);

  const eventTypeCounts: Record<string, number> = {};
  events30.forEach((e) => {
    eventTypeCounts[e.type] = (eventTypeCounts[e.type] || 0) + 1;
  });

  return {
    driver,
    period: '30 days',
    totalEvents: events30.length,
    severityCounts,
    eventTypeCounts,
    totalDistance: Math.round(totalDistance),
    totalTrips: trips30.reduce((s, t) => s + t.trips, 0),
    totalDrivingHours: Math.round(totalHours),
    avgDailyHours: Math.round(avgDailyHours * 10) / 10,
    avgRestHours: Math.round(avgRestHours * 10) / 10,
    nightDrivingHours: Math.round(nightHours * 10) / 10,
    maxSpeed: Math.max(...trips30.map((t) => t.maxSpeed), 0),
    avgIdlingMinutes: trips30.length > 0 ? Math.round(trips30.reduce((s, t) => s + t.idlingMinutes, 0) / trips30.length) : 0,
    daysWorked: trips30.length,
  };
}

// --- Helper: Get fleet summary ---
export function getFleetSummary() {
  const kpis30 = seedFleetKPIs.filter(
    (k) => new Date(k.date) > new Date(Date.now() - 30 * 86400000),
  );

  const events30 = seedSafetyEvents.filter(
    (e) => new Date(e.dateTime) > new Date(Date.now() - 30 * 86400000),
  );

  const totalDistance = kpis30.reduce((s, k) => s + k.totalDistance, 0);
  const totalTrips = kpis30.reduce((s, k) => s + k.totalTrips, 0);
  const totalEvents = events30.length;
  const avgSafetyScore = kpis30.length > 0
    ? Math.round(kpis30.reduce((s, k) => s + k.avgSafetyScore, 0) / kpis30.length * 10) / 10
    : 0;

  const riskDistribution = {
    low: seedDrivers.filter((d) => d.riskProfile === 'low').length,
    moderate: seedDrivers.filter((d) => d.riskProfile === 'moderate').length,
    high: seedDrivers.filter((d) => d.riskProfile === 'high').length,
    critical: seedDrivers.filter((d) => d.riskProfile === 'critical').length,
  };

  return {
    period: '30 days',
    totalVehicles: seedVehicles.length,
    totalDrivers: seedDrivers.length,
    activeVehicles: Math.round(kpis30.reduce((s, k) => s + k.activeVehicles, 0) / Math.max(kpis30.length, 1)),
    activeDrivers: Math.round(kpis30.reduce((s, k) => s + k.activeDrivers, 0) / Math.max(kpis30.length, 1)),
    totalDistance: Math.round(totalDistance),
    totalTrips,
    totalSafetyEvents: totalEvents,
    avgSafetyScore,
    eventsPerMile: totalDistance > 0 ? Math.round(totalEvents / (totalDistance * 0.621371) * 10000) / 10000 : 0,
    eventsPerThousandMiles: totalDistance > 0 ? Math.round(totalEvents / (totalDistance * 0.621371) * 1000 * 100) / 100 : 0,
    fuelConsumed: Math.round(kpis30.reduce((s, k) => s + k.fuelConsumed, 0)),
    avgIdlingPercent: kpis30.length > 0 ? Math.round(kpis30.reduce((s, k) => s + k.idlingPercent, 0) / kpis30.length * 10) / 10 : 0,
    riskDistribution,
    topRiskDrivers: seedDrivers
      .filter((d) => d.riskProfile === 'high' || d.riskProfile === 'critical')
      .map((d) => ({ id: d.id, name: d.name, risk: d.riskProfile })),
  };
}
