import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Trash2, Edit, X, ArrowRight, Map } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bus as BusType, Route as RouteType, RouteManagementProps } from '@/@types';

interface Stop { name: string; distanceFromStart: number; estimatedTimeFromStart: string; lat: number; lng: number; }

type RouteLocal = RouteType & { stops: Stop[]; assignedBuses: (string|BusType)[] };

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function RouteManagement({ buses: initialBuses, onBusesUpdate }: RouteManagementProps) {
  const [routes, setRoutes] = useState<RouteLocal[]>([]);
  const [buses, setBuses] = useState<BusType[]>(initialBuses || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RouteLocal>>({
    name: '', from: '', to: '', distance: 0, estimatedTime: '', status: 'active', stops: [], assignedBuses: []
  });
  const [currentStop, setCurrentStop] = useState('');
  const [stopDistance, setStopDistance] = useState('');
  const [stopTime, setStopTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch routes and buses
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rRes, bRes] = await Promise.all([
          fetch(`${API_URL}/routes`),
          fetch(`${API_URL}/buses`)
        ]);
        if (!rRes.ok) throw new Error(`routes: ${rRes.status}`);
        if (!bRes.ok) throw new Error(`buses: ${bRes.status}`);
        const rData = await rRes.json();
        const bData = await bRes.json();
        setRoutes(rData.map((r: any) => ({ ...r, id: r._id })));
        const busesList = (bData.buses || bData).map((b: any) => ({ ...b, id: b._id, number: b.busNumber }));
        setBuses(busesList);
        onBusesUpdate?.(busesList);
      } catch (err: any) {
        setError(err.message);
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  // Helpers: create/update/delete via API
  const createRoute = async (payload: any) => {
    const res = await fetch(`${API_URL}/routes`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to create route');
    return res.json();
  };
  const updateRoute = async (id: string, payload: any) => {
    const res = await fetch(`${API_URL}/routes/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to update route');
    return res.json();
  };
  const deleteRoute = async (id: string) => {
    const res = await fetch(`${API_URL}/routes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete route');
    return res.json();
  };

  const handleAddRoute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.from || !formData.to) return;
    try {
      setLoading(true);
      const payload = { ...formData, assignedBuses: formData.assignedBuses || [] };
      const created = await createRoute(payload);
      setRoutes(prev => [...prev, { ...created, id: created._id }]);
      setIsAdding(false);
      setFormData({ name:'', from:'', to:'', distance:0, estimatedTime:'', status:'active', stops:[], assignedBuses:[] });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleUpdateRoute = async (id: string) => {
    try {
      setLoading(true);
      const payload = { ...formData, assignedBuses: formData.assignedBuses || [] };
      const updated = await updateRoute(id, payload);
      setRoutes(prev => prev.map(r => r.id === id ? { ...updated, id: updated._id } : r));
      setEditingId(null);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      setLoading(true);
      await deleteRoute(id);
      setRoutes(prev => prev.filter(r => r.id !== id));
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleAssignBus = async (routeId: string, busId: string) => {
    // toggle bus id in assignedBuses then update on server
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    const assigned = route.assignedBuses?.map(b => typeof b === 'object' ? (b as any)._id || (b as any).id : b) || [];
    const exists = assigned.includes(busId);
    const newAssigned = exists ? assigned.filter(id => id !== busId) : [...assigned, busId];
    try {
      setLoading(true);
      const updated = await updateRoute(routeId, { ...route, assignedBuses: newAssigned });
      setRoutes(prev => prev.map(r => r.id === routeId ? { ...updated, id: updated._id } : r));
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleAddStop = () => {
    if (!currentStop || !stopDistance || !stopTime) return;
    // For demo, set lat/lng to 0; replace with actual values if available
    const newStop: Stop = { name: currentStop, distanceFromStart: parseFloat(stopDistance)||0, estimatedTimeFromStart: stopTime, lat: 0, lng: 0 };
    setFormData(fd => ({ ...fd, stops: [...(fd.stops||[]), newStop] }));
    setCurrentStop(''); setStopDistance(''); setStopTime('');
  };

  // Render (UI mostly unchanged) — ensure Select for bus assignment never uses value=""
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Map className="h-6 w-6" /><CardTitle>Route Management</CardTitle></div>
        <Button size="sm" onClick={() => setIsAdding(true)}><Plus className="h-4 w-4 mr-2" /> Add Route</Button>
      </CardHeader>

      <CardContent>
        {error && <div className="text-red-600">{error}</div>}
        {isAdding && (
          <form onSubmit={handleAddRoute} className="mb-6 p-4 border rounded-lg bg-muted/20">
            {/* form fields (same as before) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div><Label>Route Name</Label><Input value={formData.name||''} onChange={(e)=>setFormData({...formData, name:e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={formData.status||'active'} onValueChange={(v)=>setFormData({...formData, status: v as 'active'|'inactive'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>From</Label><Input value={formData.from||''} onChange={(e)=>setFormData({...formData, from:e.target.value})} /></div>
              <div><Label>To</Label><Input value={formData.to||''} onChange={(e)=>setFormData({...formData, to:e.target.value})} /></div>
              <div><Label>Distance (km)</Label><Input type="number" value={formData.distance||''} onChange={(e)=>setFormData({...formData, distance: parseFloat(e.target.value)||0})} /></div>
              <div><Label>Estimated Time</Label><Input value={formData.estimatedTime||''} onChange={(e)=>setFormData({...formData, estimatedTime: e.target.value})} /></div>
            </div>

            <div className="mb-4">
              <Label>Route Stops</Label>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Stop name" value={currentStop} onChange={(e)=>setCurrentStop(e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Distance" value={stopDistance} onChange={(e)=>setStopDistance(e.target.value)} className="w-24" />
                <Input placeholder="Time" value={stopTime} onChange={(e)=>setStopTime(e.target.value)} className="w-32" />
                <Button type="button" onClick={handleAddStop}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={()=>setIsAdding(false)}>Cancel</Button>
              <Button type="submit">Add Route</Button>
            </div>
          </form>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Buses</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow> :
                routes.map(route => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{route.name}</span>
                        <div className="flex items-center text-xs text-muted-foreground"><span>{route.from}</span><ArrowRight className="h-3 w-3 mx-1" /><span>{route.to}</span></div>
                      </div>
                    </TableCell>
                    <TableCell><div className="text-sm">{(route.stops||[]).length} stops<div className="text-xs text-muted-foreground line-clamp-1">{(route.stops||[]).map(s=>s.name).join(' → ')}</div></div></TableCell>
                    <TableCell><div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> <span>{route.distance} km</span></div><div className="text-xs text-muted-foreground">~{route.estimatedTime}</div></TableCell>
                    <TableCell>
                      <Select value={route.status} onValueChange={(v)=> handleUpdateRoute(route.id).catch(()=>{}) }>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value="__NONE__" onValueChange={(v)=> { if (v !== '__NONE__') handleAssignBus(route.id, v); }}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Assign Bus" /></SelectTrigger>
                        <SelectContent><SelectItem value="__NONE__">Select Bus</SelectItem>{buses.map(b => <SelectItem key={b.id} value={b.id}>{b.number} ({b.status})</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(route.assignedBuses||[]).map((busRef: any) => {
                          const busId = typeof busRef === 'string' ? busRef : (busRef._id || busRef.id);
                          const bus = buses.find(b => b.id === busId);
                          if (!bus) return null;
                          return <span key={busId} className="text-xs bg-muted px-2 py-0.5 rounded-full">{bus.number}</span>;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={()=>{ setEditingId(route.id); setFormData(route); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={()=>handleDeleteRoute(route.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}