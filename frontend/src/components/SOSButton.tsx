import { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

const SOSButton = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const emergencyNumber = '100'; // Indian Police Emergency Number

  const handleEmergencyCall = useCallback(() => {
    // In a real app, you would implement actual emergency call functionality
    // This is a simulation that would trigger the call
    console.log('Calling emergency services...');
    window.alert(`EMERGENCY: Calling ${emergencyNumber} and notifying emergency contacts`);
    
    // Reset the state
    setIsActive(false);
    setShowConfirmation(false);
    setCountdown(5);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && isActive) {
      handleEmergencyCall();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown, isActive, handleEmergencyCall]);

  const handleSOSClick = () => {
    setShowConfirmation(true);
    setIsActive(true);
  };

  const cancelEmergency = () => {
    setIsActive(false);
    setShowConfirmation(false);
    setCountdown(5);
  };

  useEffect(() => {
    const handleSOSEvent = () => {
      handleSOSClick();
    };

    window.addEventListener('triggerSOS', handleSOSEvent);
    return () => {
      window.removeEventListener('triggerSOS', handleSOSEvent);
    };
  }, [handleSOSClick]);

  return (
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-destructive flex items-center gap-2">
            <AlertCircle className="h-6 w-6" />
            Emergency SOS
          </DialogTitle>
          <DialogDescription>
            Emergency services will be contacted in {countdown} seconds if not cancelled.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="text-center mb-4">
            <p className="text-lg font-medium mb-2">Calling emergency services in:</p>
            <p className="text-4xl font-bold text-destructive mb-4">{countdown}</p>
            <Progress value={100 - (countdown * 20)} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            If this was pressed accidentally, please click Cancel below.
          </p>
        </div>
        
        <DialogFooter className="sm:justify-center">
          <Button
            variant="outline"
            onClick={cancelEmergency}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel Emergency
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SOSButton;
