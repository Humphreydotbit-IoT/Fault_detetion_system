
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";
import Dashboard from "@/pages/Dashboard";
import Floor from "@/pages/Floor";
import Analysis from "@/pages/Analysis";
import SensorAnalysis from "@/pages/SensorAnalysis";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Create a new QueryClient instance outside of the component
const queryClient = new QueryClient();

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <>
                    <Navigation />
                    <Dashboard />
                  </>
                }
              />
              <Route
                path="/floor/:floorNumber"
                element={
                  <>
                    <Navigation />
                    <Floor />
                  </>
                }
              />
              <Route
                path="/analysis"
                element={
                  <>
                    <Navigation />
                    <Analysis />
                  </>
                }
              />
              <Route
                path="/analysis/room/:floorNumber/:roomNumber"
                element={
                  <>
                    <Navigation />
                    <SensorAnalysis />
                  </>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
