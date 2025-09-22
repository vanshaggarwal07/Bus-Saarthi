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

<script
    src="https://app.wonderchat.io/scripts/wonderchat.js"
    data-name="wonderchat"
    data-address="app.wonderchat.io"
    data-id="cmfu6lco51raa140rdcmzupme"
    data-widget-size="normal"
    data-widget-button-size="normal"
    defer
  ></script>

export default Index;
