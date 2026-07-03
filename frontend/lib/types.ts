export type DutyStatus = "off_duty" | "sleeper_berth" | "driving" | "on_duty";

export type StopType =
  | "trip_start"
  | "pickup"
  | "dropoff"
  | "fuel"
  | "break"
  | "rest"
  | "restart";

export interface LocationRef {
  name: string;
  lat: number;
  lon: number;
}

export interface LogEntry {
  status: DutyStatus;
  start_hour: number;
  end_hour: number;
  label: string;
  location: string;
}

export interface Remark {
  hour: number;
  location: string;
  note: string;
}

export interface DailyLog {
  date: string;
  day_number: number;
  entries: LogEntry[];
  totals: Record<DutyStatus, number>;
  total_miles: number;
  from_location: string;
  to_location: string;
  remarks: Remark[];
  recap: {
    on_duty_today: number;
    cycle_used: number;
    cycle_available_tomorrow: number;
  };
}

export interface Stop {
  type: StopType;
  label: string;
  mile: number;
  lat: number;
  lon: number;
  location_name: string;
  arrival: string;
  departure: string;
  duration_hours: number;
}

export interface TripSummary {
  total_distance_miles: number;
  driving_hours: number;
  on_duty_hours: number;
  total_trip_hours: number;
  days: number;
  start_time: string;
  end_time: string;
  fuel_stops: number;
  rest_stops: number;
  breaks: number;
  restarts: number;
  cycle_used_input: number;
  locations: {
    current: LocationRef;
    pickup: LocationRef;
    dropoff: LocationRef;
  };
}

export interface TripPlan {
  summary: TripSummary;
  route: {
    geometry: [number, number][];
    distance_miles: number;
    duration_hours: number;
  };
  stops: Stop[];
  logs: DailyLog[];
}

export type LocationInput = string | LocationRef;

export interface TripRequest {
  current_location: LocationInput;
  pickup_location: LocationInput;
  dropoff_location: LocationInput;
  current_cycle_used_hours: number;
  start_time?: string;
}
