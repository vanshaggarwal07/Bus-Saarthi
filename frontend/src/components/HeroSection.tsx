import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Search, Navigation, Bus, Ticket, Clock, Mic, MicOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/punjab-bus-hero.jpg';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export default function HeroSection() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const handleVoiceSearch = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setActiveInput(null);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'en-IN';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      // Clean the transcript by removing trailing full stops
      const cleanTranscript = transcript.replace(/\.+$/, '');
      
      // Try to extract source and destination from the spoken text
      const match = cleanTranscript.match(/(?:from|between)\s+(.+?)\s+(?:to|and|&|,)\s+(.+)/i) || 
                   cleanTranscript.match(/(.+?)\s+to\s+(.+)/i);
      
      if (match) {
        // If the pattern matches (e.g., "from X to Y")
        // Remove any trailing punctuation from both source and destination
        const source = match[1].trim().replace(/[.,;:!?]+$/, '');
        const destination = match[2].trim().replace(/[.,;:!?]+$/, '');
        setFrom(source);
        setTo(destination);
      } else {
        // If no clear pattern, we'll just not update the fields
        // The user can try again if needed
      }
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      alert('Error with speech recognition. Please try again.');
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
      setActiveInput(null);
    };
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      // Visual feedback is already provided by the button's state and styling
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      alert('Error accessing microphone. Please check permissions.');
    }
  }, [isListening]);

  return (
    <section className="relative overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt={t('appName')}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-secondary/80" />
      </div>

      {/* Content */}
      <div className="relative container pt-4 md:pt-12 pb-12">
        <div className="max-w-2xl text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                {t('hero.title.line1')}
              </span>
              <span className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-md -z-10"></span>
            </span>
            <span className="block mt-2 relative">
              <span className="relative z-10 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                {t('hero.title.line2')}
              </span>
              <span className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-md -z-10"></span>
              <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg -z-20"></span>
            </span>
          </h1>
          <p className="text-lg md:text-xl mb-8 text-white/90 animate-fade-in">
            {t('hero.subtitle')}
          </p>

          {/* Search Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 animate-fade-in">
            <Tabs defaultValue="route" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/10 mb-4">
                <TabsTrigger value="route" className="text-white data-[state=active]:bg-primary/30 data-[state=active]:text-white">
                  <MapPin className="h-4 w-4 mr-2" />
                  {t('search.tabs.route')}
                </TabsTrigger>
                <TabsTrigger value="pnr" className="text-white data-[state=active]:bg-primary/30 data-[state=active]:text-white">
                  <Ticket className="h-4 w-4 mr-2" />
                  {t('search.tabs.pnr')}
                </TabsTrigger>
                <TabsTrigger value="bus" className="text-white data-[state=active]:bg-primary/30 data-[state=active]:text-white">
                  <Bus className="h-4 w-4 mr-2" />
                  {t('search.tabs.bus')}
                </TabsTrigger>
              </TabsList>

              {/* Route Search */}
 <TabsContent value="route" className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <div className="relative">
            <Input 
              value={from} 
              onChange={e => setFrom(e.target.value)} 
              placeholder={t('search.route.from')} 
              className="pl-10" 
            />
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="relative">
          <div className="relative">
            <Input 
              value={to} 
              onChange={e => setTo(e.target.value)} 
              placeholder={t('search.route.to')} 
              className="pl-10" 
            />
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          size="lg" 
          className="flex-1 gap-2" 
          onClick={() => {
            if (!from || !to) return;
            navigate(`/map?source=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`);
          }}
        >
          <Search className="h-4 w-4" /> {t('search.route.cta')}
        </Button>
        <Button 
          type="button"
          variant={isListening ? 'destructive' : 'default'}
          size="lg"
          className={`gap-2 ${isListening ? 'bg-destructive hover:bg-destructive/90' : ''}`}
          onClick={handleVoiceSearch}
          aria-label={isListening ? 'Stop listening' : 'Search by voice'}
        >
          {isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      </div>
    </TabsContent>

              {/* Bus Number Search */}
    <TabsContent value="bus" className="space-y-4 slate-700">
      <div className="relative">
        <Input value={busNumber} onChange={e => setBusNumber(e.target.value)} placeholder={t('search.bus.placeholder')} className="pl-10 ..." />
      </div>
      <Button size="lg" className="w-full ..." onClick={() => {
        if (!busNumber) return;
        navigate(`/map?bus=${encodeURIComponent(busNumber)}`);
      }}>
        <Search className="h-4 w-4" /> {t('search.bus.cta')}
      </Button>
    </TabsContent>
 

              {/* PNR Search */}
              <TabsContent value="pnr" className="space-y-4">
                <div className="relative">
                  <Ticket className="absolute left-3 top-3 h-4 w-4 text-white/70" />
                  <Input 
                    type="number"
                    placeholder={t('search.pnr.placeholder')} 
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70"
                  />
                </div>
                <Button size="lg" className="w-full bg-white text-primary hover:bg-white/90 gap-2">
                  <Search className="h-4 w-4" />
                  {t('search.pnr.cta')}
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 text-center animate-fade-in">
            <div>
              <div className="text-2xl font-bold">500+</div>
              <div className="text-sm text-white/80">{t('stats.routes')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm text-white/80">{t('stats.liveTracking')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">95%</div>
              <div className="text-sm text-white/80">{t('stats.onTime')}</div>
            </div>
          </div>
          
          {isListening && (
            <div className="mt-4 text-center text-sm text-white/80">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Listening... Speak now
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// This ensures the SpeechRecognition type is available in the global scope
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}