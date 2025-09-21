import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import LiveTrackingDemo from '@/components/LiveTrackingDemo';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <LiveTrackingDemo />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
