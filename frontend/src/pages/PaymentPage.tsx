import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IndianRupee, CheckCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PaymentPage() {
  const q = useQuery();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const busNumber = q.get('busNumber') || '';
  const source = q.get('source') || '';
  const destination = q.get('destination') || '';
  const fare = q.get('fare') || '';
  const currency = q.get('currency') || 'INR';

  const onPay = async () => {
    // Simulated payment then persist booking
    await new Promise(r => setTimeout(r, 800));
    try {
      await fetch('http://localhost:5000/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busNumber,
          source,
          destination,
          fare: Number(fare) || 0,
          currency,
          seats: 1,
          status: 'paid'
        })
      });
    } catch (e) {
      // non-blocking; still navigate to success
    }
    navigate(`/tickets/success?busNumber=${encodeURIComponent(busNumber)}&source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&fare=${encodeURIComponent(fare)}&currency=${encodeURIComponent(currency)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> {t('tickets.back')}
        </Button>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" /> {t('payment.title')}
            </CardTitle>
            <CardDescription>{t('payment.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{t('payment.bus')}</div>
              <div className="font-medium">{busNumber || 'N/A'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-sm text-muted-foreground">{t('payment.from')}</div>
                <div className="font-medium">{source || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('payment.to')}</div>
                <div className="font-medium">{destination || 'N/A'}</div>
              </div>
            </div>
            <div className="mt-6 p-4 border rounded-lg flex items-center justify-between">
              <div className="text-muted-foreground">{t('payment.totalFare')}</div>
              <div className="text-xl font-semibold">{currency} {fare || '0.00'}</div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => navigate('/tickets')}>
                {t('payment.change')}
              </Button>
              <Button onClick={onPay} className="gap-2">
                {t('payment.proceed')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
