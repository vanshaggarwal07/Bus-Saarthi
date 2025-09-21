import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Plus, Trash2, Edit, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Driver as DriverType, Bus as BusType } from '@/@types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Define a more specific type for the form data
type DriverFormData = Omit<Partial<DriverType>, 'assignedBus'> & {
  assignedBusId: string | null;
};

export default function DriverManagement() {
  const [drivers, setDrivers] = useState<DriverType[]>([]);
  const [buses, setBuses] = useState<BusType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    licenseNumber: '',
    contact: '',
    email: '',
    status: 'off_duty',
    assignedBusId: null,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [driversRes, busesRes] = await Promise.all([
        fetch(`${API_URL}/drivers`),
        fetch(`${API_URL}/buses`),
      ]);

      if (!driversRes.ok) throw new Error(`Failed to fetch drivers: ${driversRes.statusText}`);
      if (!busesRes.ok) throw new Error(`Failed to fetch buses: ${busesRes.statusText}`);

      const driversData = await driversRes.json();
      const busesData = await busesRes.json();
      
      setDrivers(driversData.map((d: any) => ({ ...d, id: d._id })));
      setBuses((busesData.buses || busesData).map((b: any) => ({ ...b, id: b._id, number: b.busNumber })));

    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const url = editingId ? `${API_URL}/drivers/${editingId}` : `${API_URL}/drivers`;
    const method = editingId ? 'PUT' : 'POST';

    // Prepare payload, ensuring backend receives 'assignedBus' key with the ID
    const payload = {
      ...formData,
      assignedBus: formData.assignedBusId || null,
    };
    delete (payload as any).assignedBusId; // Clean up the temporary form field

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to save driver`);
      }
      
       const savedDriver = await res.json();
      // Add this console.log for debugging. Check the browser console (F12) after saving.
      console.log('Server response after save:', savedDriver);

      // FIX: Instead of re-fetching all data, update the local state directly
      // with the response from the server for a faster and more reliable UI update.
      if (editingId) {
        // If editing, find and replace the driver in the list
        setDrivers(prev => prev.map(d => d.id === editingId ? { ...savedDriver, id: savedDriver._id } : d));
      } else {
        // If adding, add the new driver to the top of the list
        setDrivers(prev => [{ ...savedDriver, id: savedDriver._id }, ...prev]);
      }
      
      setDialogOpen(false);
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (driver: DriverType) => {
    setEditingId(driver.id);
    setFormData({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      contact: driver.contact,
      email: driver.email || '',
      status: driver.status,
      // Correctly get the ID from the populated 'assignedBus' object
      assignedBusId: (driver.assignedBus as any)?._id || null,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      const res = await fetch(`${API_URL}/drivers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete driver');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status?: DriverType['status']) => {
    if (!status) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Unknown</span>;
    }
    const styles: Record<string, string> = {
      on_duty: 'bg-orange-100 text-orange-800',
      on_break: 'bg-blue-100 text-blue-800',
      off_duty: 'bg-green-100 text-green-800',
    };
    const style = styles[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${style}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Driver Management</CardTitle>
              <CardDescription>Manage drivers and monitor their assigned routes</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingId(null);
                  setFormData({ name: '', licenseNumber: '', contact: '', email: '', status: 'off_duty', assignedBusId: null });
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Driver
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                  <DialogDescription>Fill in the details below. Click save when you're done.</DialogDescription>
                </DialogHeader>
                <form id="driver-form" onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter driver's full name" required /></div>
                    <div className="space-y-2"><Label htmlFor="licenseNumber">License Number</Label><Input id="licenseNumber" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange} placeholder="Enter license number" required /></div>
                    <div className="space-y-2"><Label htmlFor="contact">Contact Number</Label><Input id="contact" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="Enter contact number" required /></div>
                    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email address" /></div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData(p => ({...p, status: value as DriverType['status']}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_duty">On Duty</SelectItem><SelectItem value="on_break">On Break</SelectItem><SelectItem value="off_duty">Off Duty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign Bus</Label>
                      {/* Correctly bind the Select to formData.assignedBusId */}
                     {/* Use a non-empty sentinel value for "Not Assigned" to satisfy Radix Select */}
                      <Select
                        value={formData.assignedBusId ?? '__NONE__'}
                        onValueChange={(value) => setFormData(p => ({ ...p, assignedBusId: value === '__NONE__' ? null : value }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Not Assigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NONE__">Not Assigned</SelectItem>
                          {buses.map(bus => <SelectItem key={bus.id} value={bus.id}>{bus.number}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </form>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                  <Button type="submit" form="driver-form" disabled={loading}>{editingId ? 'Save Changes' : 'Add Driver'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}

      <Card>
        <CardHeader><CardTitle>Driver List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Driver</TableHead><TableHead>Status</TableHead><TableHead>Assigned Bus</TableHead><TableHead>Route</TableHead><TableHead>Last Updated</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
              : drivers.map(driver => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium flex items-center gap-2"><User className="h-4 w-4 text-gray-500" />{driver.name}</TableCell>
                  <TableCell>{getStatusBadge(driver.status)}</TableCell>
                  {/* Correctly display data from the populated 'assignedBus' object */}
                  <TableCell>{(driver.assignedBus as any)?.busNumber || 'Not assigned'}</TableCell>
                  <TableCell>{(driver.assignedBus as any)?.source?.name ? `${(driver.assignedBus as any).source.name} to ${(driver.assignedBus as any).destination.name}` : 'N/A'}</TableCell>
                  <TableCell>{driver.updatedAt ? new Date(driver.updatedAt).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(driver)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(driver.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}