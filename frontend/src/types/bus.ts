export interface Location {
  name: string;
  coords?: [number, number];
}

export interface BusStop extends Location {
  scheduledTime?: string;
  actualTime?: string;
  status: 'completed' | 'current' | 'upcoming' | 'delayed' | 'stopped';
  delayMinutes?: number;
  eta?: string;
}

export interface RouteProfile {
  totalDistance: number;
  mapboxDuration: number;
  stopDistances: number[];
  stopETAs: number[];
}

export interface NextStopInfo {
  name: string;
  eta: string;
  distance: number;
}

export interface BusItem {
  _id: string;
  busNumber: string;
  source?: Location;
  destination?: Location;
  departureTime?: string;
  arrivalTime?: string;
  status: 'on_time' | 'delayed' | 'stopped' | 'completed';
  stops: BusStop[];
  delayMinutes?: number;
  currentStopIndex?: number;
  currentLocation?: {
    coordinates: [number, number];
    lastUpdated: string;
  };
  routeProfile?: RouteProfile;
  nextStopInfo?: NextStopInfo;
}
