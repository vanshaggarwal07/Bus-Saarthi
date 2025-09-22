import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Bus, AlertTriangle, Coffee, Power, AlertCircle, Loader2, Wifi, MapPin,User } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef } from "react";

interface Bus {
  id: string;
  number: string;
 source: { name: string; };
  destination: { name: string; };
  status: string;
  lastUpdated: string;
  isActive: boolean;
  currentLocation: {
    lat: number;
    lng: number;
  };
  driver?: {
    id: string;
    name: string;
  };
  recentLocations?: { coordinates: [number, number]; ts: string }[];
}
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export default function DriverPortal() {
  const [driverId, setDriverId] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const [currentBus, setCurrentBus] = useState<Bus | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
 
const [isJourneyActive, setIsJourneyActive] = useState(false);
const [locationSource, setLocationSource] = useState<'gps' | 'cell' | null>(null);
const journeyWatchId = useRef<number | null>(null);
  const [emergencyStatus, setEmergencyStatus] = useState<{
    isActive: boolean;
    message: string;
    time: string | null;
  }>({ isActive: false, message: '', time: null });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mock authentication - in a real app, this would be an API call
  const authenticateDriver = async (driverId: string, busNumber: string) => {
    setIsLoading(true);
    setError("");
    
    try {
      if (!driverId || !busNumber) {
        setError("Driver ID and Bus Number are required.");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:5000/buses/search/bus/${encodeURIComponent(busNumber)}`);
      
      if (response.status === 404) {
        setError("Bus not found. Please check the bus number.");
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch bus details from the server.');
      }
      
      const data = await response.json();
      const busFromServer = data?.bus ?? data;
      
      // Future enhancement: you could verify driverId against busFromServer.driverName or a driverId field.
       const normalizedBus: Bus = {
        id: busFromServer._id || busFromServer.id || String(busFromServer.busNumber || busFromServer.number || busNumber || ''),
        number: busFromServer.busNumber || busFromServer.number || busFromServer.busNo || busNumber,
        source: { name: busFromServer.source?.name || busFromServer.sourceName || (busFromServer.route?.source && busFromServer.route.source.name) || 'N/A' },
        destination: { name: busFromServer.destination?.name || busFromServer.destinationName || (busFromServer.route?.destination && busFromServer.route.destination.name) || 'N/A' },
        status: busFromServer.status || busFromServer.statusText || 'unknown',
        lastUpdated: busFromServer.updatedAt || busFromServer.lastUpdated || new Date().toISOString(),
        isActive: typeof busFromServer.isActive === 'boolean' ? busFromServer.isActive : true,
        currentLocation: (busFromServer.coordinates && Array.isArray(busFromServer.coordinates))
          ? { lat: Number(busFromServer.coordinates[1]), lng: Number(busFromServer.coordinates[0]) }
          : (busFromServer.currentLocation || null),
        driver: busFromServer.driver || (busFromServer.driverName ? { id: '', name: busFromServer.driverName } : undefined),
      recentLocations: Array.isArray(busFromServer.recentLocations)
         ? busFromServer.recentLocations.slice(-50)
         : (busFromServer.coordinates && Array.isArray(busFromServer.coordinates)
           ? [{ coordinates: [Number(busFromServer.coordinates[0]), Number(busFromServer.coordinates[1])], ts: (busFromServer.updatedAt || new Date().toISOString()) }]
           : [])
      };

      setIsAuthenticated(true);
      setCurrentBus(normalizedBus);

    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || "An error occurred during sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  // const startLocationTracking = () => {


  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    // Request location permission and start tracking
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setIsLocationActive(true);
        
        // In a real app, send this location to your backend
        updateBusLocation(latitude, longitude);
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationError("Unable to retrieve your location");
        setIsLocationActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  };

  const stopLocationTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (journeyWatchId.current !== null) {
    navigator.geolocation.clearWatch(journeyWatchId.current);
    journeyWatchId.current = null;
  }

  setIsLocationActive(false);
  setLocation(null);
  };

 const handleLogout = () => {
  // ensure any active watchers are cleared and optionally stop journey on server
  // stopLocationTracking();

  // If a journey was active, stop it on server (fire-and-forget)
  // if (isJourneyActive) {
  //   // don't await here to avoid blocking UI
  //   handleStopJourney().catch(err => console.warn('handleStopJourney on logout failed:', err));
  // }

  setIsAuthenticated(false);
  setDriverId("");
  setBusNumber("");
  // setCurrentBus(null);
  setIsOnBreak(false);
  setEmergencyStatus({ isActive: false, message: '', time: null });

  // ensure UI shows location cleared
  setIsLocationActive(false);
  setLocation(null);
};
// ...existing code...
// update cleanup effect at bottom to clear both watchers
useEffect(() => {
  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    if (journeyWatchId.current !== null) {
      navigator.geolocation.clearWatch(journeyWatchId.current);
      journeyWatchId.current = null;
    }
  };
}, [watchId]);

  // In-file helper: reliably send location to server
 // ...existing code...
  // { changed code }
  // Replace the old sendLocation implementation (approx lines 170-200)
  const sendLocation = async (lat: number, lng: number) => {
    const busIdToSend = busNumber || currentBus?.number || currentBus?.number || 'UNKNOWN';
    const payload = {
      busNumber: busIdToSend,
      coordinates: [Number(lng), Number(lat)], // Map/server expects [lng, lat]
      timestamp: new Date().toISOString()
    };

    // Update local UI state immediately so icon / timeline respond without waiting for server
    setLocation({ lat, lng });
    setIsLocationActive(true);
    if (currentBus) {
      const prevRecent = Array.isArray(currentBus.recentLocations) ? currentBus.recentLocations : [];
      const newEntry = { coordinates: [Number(lng), Number(lat)] as [number, number], ts: payload.timestamp };
      const newRecent = [...prevRecent.slice(-49), newEntry];

      setCurrentBus({
        ...currentBus,
        currentLocation: { lat: Number(lat), lng: Number(lng) },
        lastUpdated: payload.timestamp,
        recentLocations: newRecent
     });
    }

    // Try send once; retry once on network failure
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(`${API_URL}/buses/update-location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await res.text().catch(() => '');
        let json;
        try { json = text ? JSON.parse(text) : null; } catch(e) { json = text; }

        if (res.ok) {
          console.debug('sendLocation success', json ?? res.status);
          return { ok: true, body: json ?? null };
        } else {
          console.warn(`sendLocation attempt ${attempt} failed`, res.status, json);
          // if server error 5xx try again once
          if (res.status >= 500 && attempt === 1) {
            await new Promise(r => setTimeout(r, 300)); // short delay before retry
            continue;
          }
          return { ok: false, status: res.status, body: json ?? text };
        }
      } catch (err) {
        console.error(`sendLocation network error attempt ${attempt}:`, err);
        if (attempt === 2) return { ok: false, error: String(err) };
        await new Promise(r => setTimeout(r, 300));
      }
    }
  };
  // { changed code }

  // Replace GPS watch start callback (approx lines 230-260) so it calls sendLocation each tick
  const handleSelectGPS = () => {
    if (!isJourneyActive) {
      toast({ title: "Journey not started", description: "Please start the journey before enabling GPS.", variant: "destructive" });
      return;
    }

    if (journeyWatchId.current !== null) {
      console.log('GPS watch already active:', journeyWatchId.current);
      setLocationSource('gps');
      return;
    }

    setLocationSource('gps');

    journeyWatchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        console.debug('watchPosition', { latitude, longitude, timestamp: position.timestamp });

        // update local UI and send to server
        setLocation({ lat: latitude, lng: longitude });
        setIsLocationActive(true);

        // send to server but don't block UI
        sendLocation(latitude, longitude).then((result) => {
          if (!result?.ok) {
            console.warn('sendLocation failed result:', result);
          }
        }).catch(err => console.error('sendLocation unexpected error', err));
      },
      (error) => {
        console.error('watchPosition error', error);
        setLocationError("Unable to retrieve your location");
        setIsLocationActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    console.log('GPS watch started id=', journeyWatchId.current);
  };
  // { changed code }
// ...existing code...

  // Update current bus location locally and send to server
  const updateBusLocation = (lat: number, lng: number) => {
    console.log(`Updating bus location to: ${lat}, ${lng}`);
    if (currentBus) {
      setCurrentBus({
        ...currentBus,
        currentLocation: { lat, lng },
        lastUpdated: new Date().toISOString()
      });
    }
    // Always send location to server on each update
    sendLocation(lat, lng);
  };

  // cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (journeyWatchId.current !== null) {
        navigator.geolocation.clearWatch(journeyWatchId.current);
        journeyWatchId.current = null;
      }
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // const handleLogout = () => {
  //   stopLocationTracking();
  //   setIsAuthenticated(false);
  //   setDriverId("");
  //   setBusNumber("");
  //   setLocation(null);
  //   setCurrentBus(null);
  //   setIsOnBreak(false);
  //   setEmergencyStatus({ isActive: false, message: '', time: null });
  // };

  const handleReportIssue = async () => {
    if (!currentBus) return;
    
    const issue = prompt('Please describe the issue:');
    if (!issue) return;
    
    setIsLoading(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Issue Reported",
        description: "Your issue has been reported to the operations team.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error reporting issue:', error);
      toast({
        title: "Error",
        description: "Failed to report issue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBreak = async () => {
    if (!currentBus) return;
    
    const newBreakState = !isOnBreak;
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
        timestamp: new Date().toISOString()
     
      
      setIsOnBreak(newBreakState);
      toast({
        title: newBreakState ? "Break Started" : "Break Ended",
        description: newBreakState 
          ? "Your break has started. You will not receive new assignments." 
          : "You are back on duty.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating break status:', error);
      toast({
        title: "Error",
        description: "Failed to update break status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergency = async () => {
    if (!currentBus) return;
    
    if (emergencyStatus.isActive) {
      setEmergencyStatus({ isActive: false, message: '', time: null });
      toast({
        title: "Emergency Resolved",
        description: "Emergency status has been deactivated.",
        variant: "default",
      });
      return;
    }
    
    const emergencyType = prompt('Select emergency type:\n1. Medical Emergency\n2. Mechanical Failure\n3. Security Threat\n4. Other');
    
    if (!emergencyType) return;
    
    const messages = {
      '1': 'Medical Emergency - Immediate assistance required',
      '2': 'Mechanical Failure - Vehicle needs attention',
      '3': 'Security Threat - Urgent assistance needed',
      '4': 'Emergency - Immediate assistance required'
    };
    
    const message = messages[emergencyType as keyof typeof messages] || 'Emergency - Assistance required';
    const time = new Date().toLocaleTimeString();
    
    // In a real app, this would trigger an API call to notify the operations team
    console.log('EMERGENCY ALERT:', { bus: currentBus.number, message, time });
    
    setEmergencyStatus({ isActive: true, message, time });
    
    // Flash the screen red to indicate emergency mode
    document.body.style.animation = 'emergencyFlash 1s 3';
    setTimeout(() => {
      document.body.style.animation = '';
    }, 3000);
    
    toast({
      title: "🚨 Emergency Alert Sent",
      description: "Help is on the way. Stay calm and follow emergency procedures.",
      variant: "destructive",
      duration: 10000,
    });
  };

  const endShift = async () => {
    if (!currentBus || !confirm('Are you sure you want to end your shift? This will log you out.')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, this would be an API call
      // await fetch('/api/shift/end', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     driverId,
      //     busId: currentBus.id,
      //     endTime: new Date().toISOString(),
      //     endLocation: location
      //   })
      // });
      
      toast({
        title: "Shift Ended",
        description: "Thank you for your service today!",
        variant: "default",
      });
      
      handleLogout();
    } catch (error) {
      console.error('Error ending shift:', error);
      toast({
        title: "Error",
        description: "Failed to end shift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  const getCurrentLocation = () => {
    // Clear any existing location tracking
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    if (locationSource === 'cell') {
      // Simulate cell tower location (less accurate)
      const mockLocations = [
        { lat: 30.7333 + (Math.random() * 0.02 - 0.01), lng: 76.7794 + (Math.random() * 0.02 - 0.01) }, // Chandigarh area
        { lat: 31.6340 + (Math.random() * 0.02 - 0.01), lng: 74.8723 + (Math.random() * 0.02 - 0.01) }, // Amritsar area
        { lat: 31.3260 + (Math.random() * 0.02 - 0.01), lng: 75.5762 + (Math.random() * 0.02 - 0.01) }, // Jalandhar area
        { lat: 30.9010 + (Math.random() * 0.02 - 0.01), lng: 75.8573 + (Math.random() * 0.02 - 0.01) }, // Ludhiana area
      ];
      
      const randomLocation = mockLocations[Math.floor(Math.random() * mockLocations.length)];
      
      // Set initial location
      setLocation({
        lat: randomLocation.lat,
        lng: randomLocation.lng
      });
      setIsLocationActive(true);
      
      // Simulate less frequent updates for cell tower
      const interval = setInterval(() => {
        const updatedLocation = {
          lat: randomLocation.lat + (Math.random() * 0.01 - 0.005),
          lng: randomLocation.lng + (Math.random() * 0.01 - 0.005)
        };
        setLocation(updatedLocation);
        updateBusLocation(updatedLocation.lat, updatedLocation.lng);
      }, 10000); // Update every 10 seconds
      
      // Cleanup function
      return () => clearInterval(interval);
    }
    
    // Proceed with GPS if not using cell tower
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocationActive(false);
      return;
    }

    // Request location permission and start tracking
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setIsLocationActive(true);
        
        // In a real app, send this location to your backend
        updateBusLocation(latitude, longitude);
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationError("Unable to retrieve your location");
        setIsLocationActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  };
const handleStartJourney = async () => {
  if (!busNumber) {
    toast({
      title: "Bus number required",
      description: "Please enter your bus number before starting.",
      variant: "destructive",
    });
    return;
  }
  setIsLoading(true);
  try {
    const res = await fetch('http://localhost:5000/buses/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ busNumber, isActive: true, status: 'On Time' }),
    });
    if (!res.ok) throw new Error('Server responded with an error');

    setIsJourneyActive(true);
    setLocationSource(null); // Reset source selection
    toast({
      title: "Journey Started",
      description: "You can now enable location tracking.",
    });
  } catch (err) {
    console.error("Failed to start journey", err);
    toast({
      title: "Error Starting Journey",
      description: "Could not update bus status. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
// const handleSelectGPS = () => {
//   if (!isJourneyActive) {
//     toast({
//       title: "Journey not started",
//       description: "Please start the journey before enabling GPS.",
//       variant: "destructive",
//     });
//     return;
//   }
//   // Ask for location permission and start tracking
//   journeyWatchId.current = navigator.geolocation.watchPosition(
//     (position) => {
//     const latitude = position.coords.latitude;
//       const longitude = position.coords.longitude;
//       setLocation({ lat: latitude, lng: longitude });
//       setIsLocationActive(true);
//       fetch("http://localhost:5000/buses/update-location", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//         busNumber: busNumber || "UNKNOWN", coordinates: [longitude, latitude]
//         }),
//       });
//     },
//     (error) => {
//       console.error('watchPosition error', error);
//       setLocationError("Unable to retrieve your location");
//       setIsLocationActive(false);
//     },
//     { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
//   );
// };

// --- Select Cell Tower (simulate) ---
const handleSelectCell = () => {
      if (!isJourneyActive) {
      toast({
        title: "Journey not started",
        description: "Please start the journey before enabling location updates.",
        variant: "destructive",
      });
      return;
    }
  setLocationSource('cell');
  // Simulate cell tower location (no permission needed)
  const mockLocation = {
    lat: 28.736656 + (Math.random() * 0.01 - 0.005),
    lng: 77.108955 + (Math.random() * 0.01 - 0.005),
  };
  setLocation(mockLocation);
  setIsLocationActive(true);
  fetch("http://localhost:5000/buses/update-location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
       busNumber: busNumber || "UNKNOWN",
      coordinates: [mockLocation.lng, mockLocation.lat],
    }),
  });
};
  // --- Stop Journey Handler ---
 const handleStopJourney = async () => {
  setIsLoading(true);
  try {
    const res = await fetch('http://localhost:5000/buses/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ busNumber, isActive: false, status: 'Inactive' }),
    });
    if (!res.ok) throw new Error('Server responded with an error');

    setIsJourneyActive(false);
    setLocationSource(null);
    setIsLocationActive(false);
    setLocation(null);
    if (journeyWatchId.current !== null) {
      navigator.geolocation.clearWatch(journeyWatchId.current);
      journeyWatchId.current = null;
    }
    toast({
      title: "Journey Stopped",
      description: "Location tracking is now off.",
    });
  } catch (err) {
    console.error("Failed to stop journey", err);
    toast({
      title: "Error Stopping Journey",
      description: "Could not update bus status. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
  // Clean up the geolocation watcher when the component unmounts
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Driver Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                authenticateDriver(driverId, busNumber);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="driverId">Driver ID</Label>
                <Input
                  id="driverId"
                  type="text"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  placeholder="Enter your driver ID"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="busNumber">Bus Number</Label>
                <Input
                  id="busNumber"
                  type="text"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  placeholder="Enter bus number"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Driver Portal</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${isLocationActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isLocationActive ? 'Location Active' : 'Location Inactive'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Location Tracking</CardTitle>
              </CardHeader>
              <CardContent>
               <div className="mb-6 space-y-2">
  <p className="text-sm font-medium text-gray-700">Location Source</p>
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={handleSelectGPS}
      disabled={!isJourneyActive}
      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
        locationSource === 'gps'
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200'
      } ${!isJourneyActive ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <MapPin className={`h-8 w-8 mb-2 ${
        locationSource === 'gps' ? 'text-blue-600' : 'text-gray-500'
      }`} />
      <span className="font-medium">GPS Location</span>
      {locationSource === 'gps' && (
        <span className="text-xs text-blue-600 font-medium mt-1">Active</span>
      )}
    </button>
    <button
      type="button"
      onClick={handleSelectCell}
      disabled={!isJourneyActive}
      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
        locationSource === 'cell'
          ? 'border-green-600 bg-green-50'
          : 'border-gray-200'
      } ${!isJourneyActive ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Wifi className={`h-8 w-8 mb-2 ${
        locationSource === 'cell' ? 'text-green-600' : 'text-gray-500'
      }`} />
      <span className="font-medium">Cell Tower</span>
      {locationSource === 'cell' && (
        <span className="text-xs text-green-600 font-medium mt-1">Active</span>
      )}
    </button>
  </div>
  <div className="flex gap-4 mt-4">
    <Button 
      onClick={handleStartJourney} 
      disabled={isJourneyActive || !busNumber}
      className="bg-blue-600 text-white"
    >
      Start Journey
    </Button>
    <Button 
      onClick={handleStopJourney} 
      disabled={!isJourneyActive}
      className="bg-gray-300 text-gray-800"
    >
      Stop Journey
    </Button>
  </div>
</div>
                
                {location ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Latitude</p>
                        <p className="text-lg font-mono">{location.lat.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Longitude</p>
                        <p className="text-lg font-mono">{location.lng.toFixed(6)}</p>
                      </div>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">
                        Using {locationSource === 'gps' ? 'GPS' : 'Cell Tower'} for location tracking.
                        {locationSource === 'gps' 
                          ? ' High accuracy GPS location is active.' 
                          : ' Approximate location based on cell towers.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Waiting for location data...</p>
                  </div>
                )}
                {locationError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    {locationError}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bus Information</CardTitle>
              </CardHeader>
              <CardContent>
                {currentBus ? (
                  <div className="space-y-4">
                   <div>
                     <p className="text-sm font-medium text-gray-500">Bus Number</p>
                     <p className="text-lg font-semibold">{currentBus?.number ?? 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-gray-500">Route</p>
                     <p>{currentBus?.source?.name ?? 'N/A'} → {currentBus?.destination?.name ?? 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-sm font-medium text-gray-500">Driver</p>
                      <p>{currentBus?.driver?.name ?? 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <div className="flex items-center">
                        <span className={`inline-block h-2 w-2 rounded-full mr-2 ${
                          currentBus?.status === 'active' ? 'bg-green-500' :
                          currentBus?.status === 'inactive' ? 'bg-gray-400' : 'bg-yellow-500'
                        }`}></span>
                        <span className="capitalize">{currentBus?.status ?? 'unknown'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Updated</p>
                      <p>{currentBus?.lastUpdated ? new Date(currentBus.lastUpdated).toLocaleTimeString() : 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No bus assigned / data unavailable.</div>
                )}
              </CardContent>

            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Quick Actions</span>
                  {emergencyStatus.isActive && (
                    <span className="flex items-center text-sm font-normal text-red-600 animate-pulse">
                      <AlertCircle className="h-4 w-4 mr-1" /> EMERGENCY
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant={emergencyStatus.isActive ? "destructive" : "outline"}
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleEmergency}
                  disabled={!isLocationActive || isLoading}
                >
                  {isLoading && emergencyStatus.isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {emergencyStatus.isActive ? 'Emergency Active' : 'Emergency'}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleReportIssue}
                  disabled={!isLocationActive || isLoading}
                >
                  <AlertCircle className="h-4 w-4" />
                  Report Issue
                </Button>
                
                <Button 
                  variant={isOnBreak ? 'secondary' : 'outline'}
                  className="w-full flex items-center justify-center gap-2"
                  onClick={toggleBreak}
                  disabled={!isLocationActive || isLoading}
                >
                  <Coffee className="h-4 w-4" />
                  {isOnBreak ? 'End Break' : 'Start Break'}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={endShift}
                  disabled={isLoading}
                >
                  <Power className="h-4 w-4" />
                  End Shift
                </Button>
                
                {emergencyStatus.isActive && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                    <div className="font-medium">Emergency Active</div>
                    <div>{emergencyStatus.message}</div>
                    <div className="text-xs opacity-75 mt-1">Reported at: {emergencyStatus.time}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

