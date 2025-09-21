import { Clock, AlertCircle, UserCog, Building2, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t } = useTranslation('common');
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container px-0 flex h-20 items-center justify-between">
        <div className="flex items-center gap-0">
          <img
            src="/bus-saarthi-logo.png"
            alt="Bus Saarthi logo"
            className="w-32 h-32 rounded-lg object-contain"
          />
          <div className="text-left -ml-5">
            <h1 className="text-xl font-bold">{t('appName')}</h1>
            <p className="text-xs text-muted-foreground">{t('appTagline')}</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/map">
              <Clock className="h-4 w-4" />
              {t('nav.liveTracking')}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/tickets">
              <Ticket className="h-4 w-4" />
              {t('nav.tickets')}
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              // Trigger the SOS functionality
              const event = new CustomEvent('triggerSOS');
              window.dispatchEvent(event);
            }}
          >
            <AlertCircle className="h-4 w-4" />
            {t('sos')}
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/driver-portal" className="gap-1">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.driverPortal')}</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/municipal-portal" className="gap-1">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.municipalPortal')}</span>
            </Link>
          </Button>
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}