import { BusItem, BusStop } from '@/types/bus';

export const formatDuration = (minutes: number): string => {
  if (!minutes && minutes !== 0) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'current':
      return 'bg-blue-100 text-blue-800';
    case 'delayed':
      return 'bg-amber-100 text-amber-800';
    case 'stopped':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const processBusData = (bus: any): BusItem => {
  // Calculate stop statuses based on currentStopIndex
  const processedStops: BusStop[] = [];
  const allStops = [
    { ...bus.source, scheduledTime: bus.departureTime },
    ...(bus.stops || []),
    { ...bus.destination, scheduledTime: bus.arrivalTime }
  ].filter(Boolean);
  
  // Calculate total duration in minutes if we have both departure and arrival times
  let duration: number | undefined;
  if (bus.departureTime && bus.arrivalTime) {
    const depTime = new Date(bus.departureTime);
    const arrTime = new Date(bus.arrivalTime);
    if (!isNaN(depTime.getTime()) && !isNaN(arrTime.getTime())) {
      duration = (arrTime.getTime() - depTime.getTime()) / (1000 * 60); // Convert ms to minutes
    }
  }

  allStops.forEach((stop, index) => {
    const isCompleted = bus.currentStopIndex > index;
    const isCurrent = bus.currentStopIndex === index;
    
    processedStops.push({
      name: stop.name,
      coords: stop.coords,
      scheduledTime: stop.scheduledTime,
      status: isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming',
      delayMinutes: isCurrent ? bus.delayMinutes : undefined,
      eta: bus.routeProfile?.stopETAs?.[index] 
        ? formatDuration(bus.routeProfile.stopETAs[index]) 
        : undefined
    });
  });

  return {
    ...bus,
    stops: processedStops,
    departureTime: bus.departureTime,
    arrivalTime: bus.arrivalTime,
    duration: duration || bus.duration,
    nextStopInfo: bus.nextStop ? {
      name: bus.nextStop,
      eta: formatDuration(bus.routeProfile?.stopETAs?.[(bus.currentStopIndex || 0) + 1] || 0),
      distance: bus.routeProfile?.stopDistances?.[(bus.currentStopIndex || 0) + 1] || 0
    } : undefined
  };
};

export const searchBuses = async (source: string, destination: string) => {
  try {
    const params = new URLSearchParams({ source, destination }).toString();
    const apiUrl = `http://localhost:5000/buses/search/route?${params}`;
    console.log('API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch buses: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    
    if (!data.buses) {
      throw new Error('Invalid response format: missing buses array');
    }
    
    return data.buses.map(processBusData);
  } catch (error) {
    console.error('Error searching buses:', error);
    throw error;
  }
};
