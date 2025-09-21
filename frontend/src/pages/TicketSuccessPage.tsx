import { useMemo, useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function TicketSuccessPage() {
  const q = useQuery();
  const { t } = useTranslation('common');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const busNumber = q.get('busNumber') || '';
  const source = q.get('source') || '';
  const destination = q.get('destination') || '';
  const fare = q.get('fare') || '';
  const currency = q.get('currency') || 'INR';
  
  // Generate a random ticket ID
  const ticketId = useMemo(() => {
    return 'TKT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }, []);

  // Generate QR code when component mounts
  useEffect(() => {
    const generateQrCode = async () => {
      try {
        const ticketData = {
          ticketId,
          busNumber,
          from: source,
          to: destination,
          fare: `${currency} ${fare}`,
          timestamp: new Date().toISOString()
        };
        
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(ticketData), {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    
    generateQrCode();
  }, [ticketId, busNumber, source, destination, fare, currency]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" /> {t('success.title')}
            </CardTitle>
            <CardDescription>{t('success.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{t('success.bus')}</div>
              <div className="font-medium">{busNumber}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-sm text-muted-foreground">{t('success.from')}</div>
                <div className="font-medium">{source}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('success.to')}</div>
                <div className="font-medium">{destination}</div>
              </div>
            </div>
            <div className="mt-6 p-4 border rounded-lg flex items-center justify-between">
              <div className="text-muted-foreground">{t('success.paid')}</div>
              <div className="text-xl font-semibold">{currency} {fare}</div>
            </div>
            
            {qrCodeDataUrl && (
              <div className="mt-6 border rounded-lg p-4 flex flex-col items-center">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  {t('success.ticketQR', 'Your Ticket QR Code')}
                </h3>
                <img 
                  src={qrCodeDataUrl} 
                  alt="Ticket QR Code" 
                  className="w-40 h-40 object-contain"
                />
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  {t('success.ticketId', 'Ticket ID')}: {ticketId}
                </p>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link to="/">{t('success.goHome')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/tickets">{t('success.bookAnother')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
