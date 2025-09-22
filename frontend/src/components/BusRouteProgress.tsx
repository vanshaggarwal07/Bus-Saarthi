import { Clock, MapPin, CheckCircle, Clock4, AlertTriangle, WifiOff, Bus } from 'lucide-react';

interface StopInfo {
  name: string;
  eta?: string;
  status: 'completed' | 'current' | 'upcoming' | 'delayed' | 'stopped';
  delayMinutes?: number;
  scheduledTime?: string;
}

interface BusRouteProgressProps {
  stops: StopInfo[];
  currentLocation?: {
    coordinates: [number, number];
    lastUpdated: string;
  };
  nextStop?: string;
  etaToNextStop?: string;
  delayMinutes?: number;
  status?: 'on_time' | 'delayed' | 'stopped' | 'completed';
}

export function BusRouteProgress({ 
  stops = [], 
  currentLocation,
  nextStop,
  etaToNextStop,
  delayMinutes = 0,
  status = 'on_time'
}: BusRouteProgressProps) {
  const getStatusIcon = (stopStatus: StopInfo['status']) => {
    switch (stopStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'current':
        return <Bus className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'delayed':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'stopped':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (stopStatus: StopInfo['status']) => {
    switch (stopStatus) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'current':
        return 'bg-blue-50 border-blue-200';
      case 'delayed':
        return 'bg-amber-50 border-amber-200';
      case 'stopped':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-100';
    }
  };

  const getStatusText = (stopStatus: StopInfo['status']) => {
    switch (stopStatus) {
      case 'completed':
        return 'Completed';
      case 'current':
        return 'In Transit';
      case 'delayed':
        return 'Delayed';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Upcoming';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock4 className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium">Route Progress</h3>
        </div>
        {status === 'delayed' && delayMinutes > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {delayMinutes} min delay
          </span>
        )}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-4">
          {stops.map((stop, index) => (
            <div key={index} className="relative pl-10">
              {/* Stop dot and line */}
              <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(stop.status)} border-2 z-10`}>
                {getStatusIcon(stop.status)}
              </div>
              
              {/* Stop details */}
              <div className={`p-3 rounded-lg border ${getStatusColor(stop.status)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{stop.name}</h4>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        stop.status === 'completed' ? 'bg-green-100 text-green-800' :
                        stop.status === 'current' ? 'bg-blue-100 text-blue-800' :
                        stop.status === 'delayed' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusText(stop.status)}
                      </span>
                      {stop.status === 'delayed' && stop.delayMinutes && (
                        <span className="ml-2 text-amber-600 text-xs">
                          {stop.delayMinutes} min late
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {stop.eta && (
                      <div className="flex items-center justify-end text-sm text-gray-500">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        <span>ETA: {stop.eta}</span>
                      </div>
                    )}
                    {stop.scheduledTime && (
                      <div className="text-xs text-gray-400 mt-1">
                        Scheduled: {stop.scheduledTime}
                      </div>
                    )}
                  </div>
                </div>
                
                {stop.status === 'current' && currentLocation && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <div>Last updated: {new Date(currentLocation.lastUpdated).toLocaleTimeString()}</div>
                    {nextStop && (
                      <div className="mt-1">
                        Next stop: <span className="font-medium">{nextStop}</span>
                        {etaToNextStop && (
                          <span className="ml-2">(ETA: {etaToNextStop})</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
