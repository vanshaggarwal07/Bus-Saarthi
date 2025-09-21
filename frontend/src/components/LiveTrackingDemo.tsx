import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Navigation,
  Circle
} from 'lucide-react';

const mockBuses = [
  {
    id: 'PB-001',
    route: 'Amritsar → Ludhiana',
    status: 'On Time' as const,
    eta: '8 min',
    nextStop: 'Civil Hospital',
    color: 'bg-success'
  },
  {
    id: 'PB-045',
    route: 'Chandigarh → Patiala', 
    status: 'Delayed' as const,
    eta: '12 min',
    nextStop: 'Railway Station',
    color: 'bg-warning'
  },
  {
    id: 'PB-078',
    route: 'Jalandhar → Kapurthala',
    status: 'Arriving' as const,
    eta: '2 min',
    nextStop: 'Bus Stand',
    color: 'bg-primary'
  }
];

export default function LiveTrackingDemo() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Live Bus Tracking
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              See exactly where your bus is and when it will arrive at your stop. 
              Our GPS tracking system provides real-time updates for all Punjab routes.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <Circle className="h-2 w-2 fill-primary text-primary" />
                <span>Live location updates every 30 seconds</span>
              </div>
              <div className="flex items-center gap-3">
                <Circle className="h-2 w-2 fill-primary text-primary" />
                <span>Traffic-adjusted arrival times</span>
              </div>
            </div>

            <Button size="lg" className="gap-2" asChild>
              <Link to="/map">
                <MapPin className="h-4 w-4" />
                View Live Map
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Buses Near You</h3>
            {mockBuses.map((bus) => (
              <Card key={bus.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <Bus className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold">{bus.id}</div>
                        <div className="text-sm text-muted-foreground">{bus.route}</div>
                      </div>
                    </div>
                    <Badge variant={bus.status === 'On Time' ? 'default' : bus.status === 'Delayed' ? 'destructive' : 'secondary'}>
                      {bus.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{bus.eta}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{bus.nextStop}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}