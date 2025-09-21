import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, BarChart2, Users, AlertTriangle, Settings, Bus, MapPin, Plus, Lock, User, Building2, BusFront, Map, UserRoundCog, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BusManagement from "@/components/bus/BusManagement";
import DriverManagement from "@/components/bus/DriverManagement";
import { RouteManagement } from "@/components/bus/RouteManagement";
import MapView from "@/components/MapView";
import { useTranslation } from 'react-i18next';

// Mock data types
interface Bus {
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
}

// Extend the Window interface to include the map object
declare global {
  interface Window {
    initMap?: () => void;
  }
}

// Mock authentication - in a real app, this would be handled by a backend service
const MUNICIPAL_USERS = [
  { id: 'admin', password: 'admin123', name: 'Administrator', role: 'admin' },
  { id: 'traffic', password: 'traffic123', name: 'Traffic Control', role: 'traffic' },
  { id: 'support', password: 'support123', name: 'Support Staff', role: 'support' },
];

export default function MunicipalPortal() {
  const { t } = useTranslation('common');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{id: string; name: string; role: string} | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  // Shared state for buses that will be used across all components
  const [buses, setBuses] = useState<Bus[]>(() => {
    // Load from localStorage or use initial mock data
    const savedBuses = localStorage.getItem('municipalBuses');
    return savedBuses ? JSON.parse(savedBuses) : [];
  });
  
  // Track which buses are currently active (have live location updates)
  const [activeBuses, setActiveBuses] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('municipalUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('municipalUser');
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!userId.trim() || !password) {
      setError('Please enter both User ID and Password');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const user = MUNICIPAL_USERS.find(u => u.id === userId && u.password === password);
      
      if (user) {
        const userData = { id: user.id, name: user.name, role: user.role };
        setUser(userData);
        localStorage.setItem('municipalUser', JSON.stringify(userData));
        setIsLoggedIn(true);
      } else {
        setError('Invalid credentials. Please try again.');
      }
      
      setIsLoading(false);
    }, 800); // Simulate network delay
  };
  
  const handleLogout = () => {
    localStorage.removeItem('municipalUser');
    setIsLoggedIn(false);
    setUser(null);
    setUserId('');
    setPassword('');
  };

  // Save buses to localStorage whenever they change
  useEffect(() => {
    if (buses.length > 0) {
      localStorage.setItem('municipalBuses', JSON.stringify(buses));
    }
  }, [buses]);

  // Simulate live bus location updates
  useEffect(() => {
    if (buses.length === 0) return;
    
    // Only simulate updates for active buses
    const activeBuses = buses.filter(bus => bus.status === 'active');
    if (activeBuses.length === 0) return;
    
    const interval = setInterval(() => {
      setBuses(currentBuses => 
        currentBuses.map(bus => {
          if (bus.status !== 'active') return bus;
          
          // Add some random movement to simulate real-time updates
          const latOffset = (Math.random() - 0.5) * 0.01;
          const lngOffset = (Math.random() - 0.5) * 0.01;
          
          return {
            ...bus,
            currentLocation: bus.currentRoute ? {
              lat: (bus.currentLocation?.lat || 31.6340) + latOffset,
              lng: (bus.currentLocation?.lng || 74.8723) + lngOffset
            } : bus.currentLocation,
            lastUpdated: new Date()
          };
        })
      );
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [buses.length]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('municipal.login.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('municipal.login.subtitle')}</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('municipal.login.userId')}
                </Label>
                <Input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={t('municipal.login.userIdPlaceholder')}
                  autoComplete="username"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {t('municipal.login.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('municipal.login.passwordPlaceholder')}
                  autoComplete="current-password"
                  required
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-500/10 text-red-600 text-sm rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('municipal.login.submitBusy') : t('municipal.login.submitIdle')}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground mt-4">
                <p>{t('municipal.login.demo')}</p>
                <p className="font-mono text-xs mt-1">
                  admin/admin123, traffic/traffic123, support/support123
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button variant="ghost" asChild className="mb-2 -ml-3">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('municipal.header.back')}
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">{t('municipal.header.title')}</h1>
            <p className="text-muted-foreground">{t('municipal.header.subtitle')}</p>
            {user && (
              <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                <span>{t('municipal.header.loggedInAs')}</span>
                <span className="font-medium text-foreground">{user.name}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{user.role}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="text-destructive hover:text-destructive"
            >
              <Lock className="h-4 w-4 mr-2" />
              {t('municipal.header.logout')}
            </Button>
          </div>
        </div>
        
        <Tabs 
          defaultValue="dashboard" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5 mb-6">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              {t('municipal.tabs.liveMap')}
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              {t('municipal.tabs.dashboard')}
            </TabsTrigger>
            <TabsTrigger value="buses" className="flex items-center gap-2">
              <Bus className="h-4 w-4" />
              {t('municipal.tabs.buses')}
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <UserRoundCog className="h-4 w-4" />
              {t('municipal.tabs.drivers')}
            </TabsTrigger>
            <TabsTrigger value="routes" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('municipal.tabs.routes')}
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              {t('municipal.tabs.reports')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-6 h-[calc(100vh-200px)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" /> {t('municipal.map.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('municipal.map.subtitle')}
                </p>
              </CardHeader>
              <CardContent className="h-[calc(100%-100px)] p-0">
                <div className="h-full w-full">
                  <MapView />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BusFront className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{buses.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {buses.filter(b => b.status === 'active').length} active, {buses.filter(b => b.status === 'maintenance').length} in maintenance
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(buses
                      .filter(b => b.status === 'active' && b.currentRoute)
                      .map(b => `${b.currentRoute?.from}-${b.currentRoute?.to}`)
                    ).size}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {buses.filter(b => b.status === 'active' && b.currentRoute).length} buses on routes
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Map className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    +2 new routes added this month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <UserRoundCog className="h-5 w-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">28</div>
                  <p className="text-xs text-muted-foreground">
                    5 on leave, 23 on duty
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Commonly used actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-24 flex flex-col items-center justify-center gap-2"
                      onClick={() => setActiveTab('buses')}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add New Bus</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-24 flex flex-col items-center justify-center gap-2"
                      onClick={() => setActiveTab('routes')}
                    >
                      <MapPin className="h-5 w-5" />
                      <span>Create Route</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-24 flex flex-col items-center justify-center gap-2"
                      onClick={() => setActiveTab('drivers')}
                    >
                      <User className="h-5 w-5" />
                      <span>Add Driver</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-24 flex flex-col items-center justify-center gap-2"
                      onClick={() => setActiveTab('reports')}
                    >
                      <BarChart2 className="h-5 w-5" />
                      <span>View Reports</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Alerts</CardTitle>
                  <CardDescription>Latest system notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">Bus #PB01AB1234 delayed</p>
                        <p className="text-sm text-muted-foreground">Expected delay of 15 minutes on Route 12</p>
                        <p className="text-xs text-muted-foreground mt-1">10 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Settings className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">Maintenance required</p>
                        <p className="text-sm text-muted-foreground">Bus #PB02CD5678 due for service</p>
                        <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="buses" className="space-y-6">
            <BusManagement buses={buses} onBusesChange={setBuses} />
          </TabsContent>
          
          <TabsContent value="routes" className="space-y-6">
            <RouteManagement buses={buses} onBusesUpdate={setBuses} />
          </TabsContent>
          
          <TabsContent value="drivers" className="space-y-6">
            <DriverManagement 
              buses={buses}
              onDriverUpdate={(driver) => {
                // In a real app, this would update the driver in the backend
                console.log('Driver updated:', driver);
              }}
              onBusesUpdate={setBuses}
            />
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
                <CardDescription>Generate and view system reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 border rounded-lg bg-muted/20 text-center">
                  <BarChart2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <h3 className="font-medium">Reports Dashboard</h3>
                  <p className="text-sm text-muted-foreground">Select a report type to view detailed analytics</p>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button variant="outline" className="flex-col h-auto py-4">
                      <span className="font-medium">Daily Ridership</span>
                      <span className="text-xs text-muted-foreground font-normal mt-1">View daily passenger counts</span>
                    </Button>
                    <Button variant="outline" className="flex-col h-auto py-4">
                      <span className="font-medium">Revenue</span>
                      <span className="text-xs text-muted-foreground font-normal mt-1">Earnings and expenses</span>
                    </Button>
                    <Button variant="outline" className="flex-col h-auto py-4">
                      <span className="font-medium">Maintenance</span>
                      <span className="text-xs text-muted-foreground font-normal mt-1">Vehicle service history</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Live Buses Panel - Fixed at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg">
        <div className="container py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-green-600" />
              <span className="font-medium">Live Buses</span>
              <span className="text-sm text-muted-foreground">
                {buses.filter(b => b.status === 'active').length} active
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide">
              {buses
                .filter(bus => bus.status === 'active')
                .map(bus => (
                  <div 
                    key={bus.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border text-sm whitespace-nowrap"
                  >
                    <div className={`h-2 w-2 rounded-full ${
                      activeBuses.has(bus.id) ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="font-medium">{bus.number}</span>
                    {bus.currentRoute && (
                      <span className="text-muted-foreground text-xs">
                        {bus.currentRoute.from} → {bus.currentRoute.to}
                      </span>
                    )}
                  </div>
                ))
              }
              {buses.filter(b => b.status === 'active').length === 0 && (
                <div className="text-sm text-muted-foreground px-4 py-2">
                  No active buses at the moment
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add some padding to prevent content from being hidden behind the fixed panel */}
      <div className="h-16"></div>
    </div>
  );
}
