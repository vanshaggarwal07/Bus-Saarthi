import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MapPin, 
  Clock, 
  Route, 
  Smartphone, 
  Wifi, 
  Shield 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const features = [
  {
    icon: MapPin,
    titleKey: 'features.items.gps.title',
    descKey: 'features.items.gps.desc',
    color: 'text-primary'
  },
  {
    icon: Clock,
    titleKey: 'features.items.eta.title',
    descKey: 'features.items.eta.desc',
    color: 'text-accent'
  },
  {
    icon: Route,
    titleKey: 'features.items.route.title',
    descKey: 'features.items.route.desc',
    color: 'text-secondary'
  },
  {
    icon: Smartphone,
    titleKey: 'features.items.mobile.title',
    descKey: 'features.items.mobile.desc',
    color: 'text-primary'
  },
  {
    icon: Wifi,
    titleKey: 'features.items.bandwidth.title',
    descKey: 'features.items.bandwidth.desc',
    color: 'text-accent'
  },
  {
    icon: Shield,
    titleKey: 'features.items.reliable.title',
    descKey: 'features.items.reliable.desc',
    color: 'text-secondary'
  }
];

export default function FeaturesSection() {
  const { t } = useTranslation('common');
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="card-hover border-0 shadow-card">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl">{t(feature.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t(feature.descKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}