import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Bus, ArrowLeft, Search, IndianRupee, Clock, MapPin, ChevronUp, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusRouteProgress } from '@/components/BusRouteProgress';
import { BusItem, BusStop } from '@/types/bus';
import { searchBuses, formatDuration } from '@/utils/busUtils';


export default function TicketingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedBuses, setExpandedBuses] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('http://localhost:5000/buses/locations/all');
        if (!res.ok) throw new Error('Failed to fetch locations');
        const data = await res.json();
        setLocations(data.locations || []);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch locations');
      }
    };
    fetchLocations();
  }, []);

  const canSearch = useMemo(() => from.trim().length > 0 && to.trim().length > 0 && from.trim().toLowerCase() !== to.trim().toLowerCase(), [from, to]);

  const toggleBusExpansion = (busId: string) => {
    setExpandedBuses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(busId)) {
        newSet.delete(busId);
      } else {
        newSet.add(busId);
      }
      return newSet;
    });
  };


  const handleSearch = async () => {
    if (!canSearch) {
      console.log('Search disabled - missing required fields');
      return;
    }
    
    console.log('Starting search with:', { from, to });
    setSearching(true);
    setError(null);
    setBuses([]);
    
    try {
      console.log('Calling searchBuses API...');
      const results = await searchBuses(from.trim(), to.trim());
      console.log('Search results:', results);
      
      if (!results || !Array.isArray(results)) {
        throw new Error('Invalid response format from server');
      }
      
      if (results.length === 0) {
        setError('No buses found for this route');
      } else {
        setBuses(results);
      }
    } catch (e: any) {
      console.error('Search error:', e);
      setError(e.message || 'Failed to search buses. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const viewFareAndContinue = async (bus: BusItem) => {
    try {
      const params = new URLSearchParams({ busNumber: bus.busNumber, source: from.trim(), destination: to.trim() }).toString();
      const res = await fetch(`http://localhost:5000/buses/fare?${params}`);
      if (!res.ok) throw new Error('Failed to compute fare');
      const data = await res.json();
      // redirect to payment page with fare details
      const payParams = new URLSearchParams({
        busNumber: data.busNumber,
        source: data.source,
        destination: data.destination,
        fare: String(data.fare),
        currency: data.currency || 'INR'
      });
      navigate(`/payment?${payParams.toString()}`);
    } catch (e: any) {
      setError(e.message || 'Could not fetch fare');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('tickets.back')}
          </Button>
        </div>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" /> {t('tickets.title')}
            </CardTitle>
            <CardDescription>{t('tickets.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <Input list="locations_from" placeholder={t('tickets.fromPlaceholder')} value={from} onChange={(e) => setFrom(e.target.value)} />
                <datalist id="locations_from">
                  {locations.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
              <div className="md:col-span-2">
                <Input list="locations_to" placeholder={t('tickets.toPlaceholder')} value={to} onChange={(e) => setTo(e.target.value)} />
                <datalist id="locations_to">
                  {locations.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
              <div className="md:col-span-2">
                <Button 
                  onClick={handleSearch} 
                  disabled={!canSearch || searching} 
                  className="w-full gap-2"
                >
                  <Search className="h-4 w-4" />
                  {searching ? t('tickets.searching') : t('tickets.search')}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {buses.length === 0 && !searching ? (
            <p className="text-muted-foreground">{t('tickets.noResults')}</p>
          ) : null}

          {buses.map((bus) => {
            const isExpanded = expandedBuses.has(bus._id);
            const hasRouteInfo = bus.stops && bus.stops.length > 0;
            
            return (
              <Card key={bus._id} className="border shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Bus {bus.busNumber}</CardTitle>
                      <div className="space-y-1 mt-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {bus.source?.name} → {bus.destination?.name}
                          </span>
                          {bus.status === 'delayed' && bus.delayMinutes && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {bus.delayMinutes} min delay
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            <span>{bus.departureTime || 'N/A'} - {bus.arrivalTime || 'N/A'}</span>
                          </div>
                          {bus.duration && (
                            <div className="flex items-center">
                              <span className="mr-1">•</span>
                              <span>{formatDuration(bus.duration)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Departs at</div>
                        <div className="font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {bus.departureTime || 'N/A'}
                        </div>
                      </div>
                      {hasRouteInfo && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-2"
                          onClick={() => toggleBusExpansion(bus._id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" /> Hide Route
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 mr-1" /> Show Route
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && hasRouteInfo && (
                  <CardContent className="pt-0">
                    <div className="mt-2 border-t pt-4">
                      <BusRouteProgress 
                        stops={bus.stops || []}
                        currentLocation={bus.currentLocation}
                        nextStop={bus.nextStopInfo?.name}
                        etaToNextStop={bus.nextStopInfo?.eta}
                        delayMinutes={bus.delayMinutes}
                        status={bus.status}
                      />
                    </div>
                  </CardContent>
                )}

                <CardFooter className="flex justify-between items-center pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    {bus.stops?.filter(s => s.status === 'completed').length || 0} of {bus.stops?.length || 0} stops completed
                  </div>
                  <Button 
                    onClick={() => viewFareAndContinue(bus)} 
                    className="gap-2"
                    variant="outline"
                  >
                    <IndianRupee className="h-4 w-4" /> {t('tickets.viewFare')}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
