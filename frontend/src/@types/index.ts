export interface Bus {
  id: string;
  number: string;
  type: string;
  status: 'active' | 'inactive' | 'maintenance';
  capacity: number;
  currentRoute?: {
    from: string;
    to: string;
    distance: number;
  };
  currentLocation?: {
    lat: number;
    lng: number;
  };
  lastUpdated: Date;
  driverId?: string;
  routeId?: string;
}
// frontend/src/@types/index.ts
export interface Location {
    name: string;
    coords: [number, number]; // [latitude, longitude]
}

export interface IBus {
    _id: string; // From MongoDB
    busNumber: string;
    source: Location;
    destination: Location;
    stops: Location[];
    coordinates: [number, number]; // Current position [longitude, latitude]
    routeGeometry?: {
        coordinates: [number, number][]; // Full route path
    };
    status: string;
    driverName: string;
}
export interface Driver {
  id: string;
  _id?: string; // Server often sends _id
  name: string;
  licenseNumber: string;
  contact: string;
  email?: string;
  // Corrected the status enum to match the UI
  status: 'on_duty' | 'on_break' | 'off_duty'; 
  // Added assignedBus to reflect populated data from the server
  assignedBus?:  | null; 
  // Added updatedAt as it's used in the table
  updatedAt: string | Date; 
}

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
  distanceFromStart: number;
  estimatedTimeFromStart: string;
}

export interface Route {
  id: string;
  name: string;
  from: string;
  to: string;
  distance: number;
  estimatedTime: string; // e.g., '2h 30m'
  status: 'active' | 'inactive';
  stops: RouteStop[];
  activeBuses: string[];
  assignedBuses: string[];
  lastUpdated?: Date;
}

export interface BusManagementProps {
  buses: Bus[];
  onBusesChange: (buses: Bus[]) => void;
}

export interface RouteManagementProps {
  buses: Bus[];
  onBusesUpdate: (buses: Bus[]) => void;
}

export interface DriverManagementProps {
  buses: Bus[];
  onDriverUpdate: (driver: Driver) => void;
  onBusesUpdate: (buses: Bus[]) => void;
}
