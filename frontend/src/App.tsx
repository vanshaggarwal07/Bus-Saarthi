import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import MapPage from "./pages/MapPage";
import DriverPortal from "./pages/DriverPortal";
import MunicipalPortal from "./pages/MunicipalPortal";
import NotFound from "./pages/NotFound";
import TicketingPage from "./pages/TicketingPage";
import PaymentPage from "./pages/PaymentPage";
import TicketSuccessPage from "./pages/TicketSuccessPage";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/tickets" element={<TicketingPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/tickets/success" element={<TicketSuccessPage />} />
            <Route path="/driver-portal" element={<DriverPortal />} />
            <Route path="/municipal-portal" element={<MunicipalPortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
