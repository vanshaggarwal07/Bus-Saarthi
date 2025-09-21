import { Bus, Mail, Phone, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation('common');
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bus className="h-6 w-6" />
              <span className="text-xl font-bold">{t('appName')}</span>
            </div>
            <p className="text-primary-foreground/80 mb-4">{t('footer.about')}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.services')}</h3>
            <ul className="space-y-2 text-primary-foreground/80">
              <li>{t('footer.services.items.tracking')}</li>
              <li>{t('footer.services.items.planning')}</li>
              <li>{t('footer.services.items.eta')}</li>
              <li>{t('footer.services.items.schedules')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.support')}</h3>
            <ul className="space-y-2 text-primary-foreground/80">
              <li>{t('footer.support.items.help')}</li>
              <li>{t('footer.support.items.contact')}</li>
              <li>{t('footer.support.items.report')}</li>
              <li>{t('footer.support.items.feedback')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.contact')}</h3>
            <div className="space-y-2 text-primary-foreground/80">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{t('footer.phone')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{t('footer.email')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{t('footer.location')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}