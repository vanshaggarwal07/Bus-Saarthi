import MapView from '@/components/MapView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function MapPage() {
  const { t } = useTranslation('common');
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4 z-10">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('mapPage.back')}
          </Link>
        </Button>
        <div>
          <h1 className="font-semibold">{t('mapPage.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('mapPage.subtitle')}</p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapView />
      </div>
    </div>
  );
}

