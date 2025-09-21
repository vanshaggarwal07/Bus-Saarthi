import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Bus, ArrowLeft, Search, IndianRupee } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BusItem {
  _id: string;
  busNumber: string;
  source?: { name: string };
  destination?: { name: string };
  departureTime?: string;
  arrivalTime?: string;
  status?: string;
  stops?: { name: string }[];
}

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

  const searchBuses = async () => {
    if (!canSearch) return;
    setSearching(true);
    setError(null);
    setBuses([]);
    try {
      const params = new URLSearchParams({ source: from.trim(), destination: to.trim() }).toString();
      const res = await fetch(`http://localhost:5000/buses/search/route?${params}`);
      if (!res.ok) throw new Error('Failed to search buses');
      const data = await res.json();
      setBuses(data.buses || []);
    } catch (e: any) {
      setError(e.message || 'Search failed');
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
                <Button onClick={searchBuses} disabled={!canSearch || searching} className="w-full gap-2">
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

          {buses.map((bus) => (
            <Card key={bus._id} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">Bus {bus.busNumber}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('tickets.route')}</div>
                    <div className="font-medium">{bus.source?.name} → {bus.destination?.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('tickets.depart')}</div>
                    <div className="font-medium">{bus.departureTime || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('tickets.arrive')}</div>
                    <div className="font-medium">{bus.arrivalTime || 'N/A'}</div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => viewFareAndContinue(bus)} className="gap-2">
                      <IndianRupee className="h-4 w-4" /> {t('tickets.viewFare')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
