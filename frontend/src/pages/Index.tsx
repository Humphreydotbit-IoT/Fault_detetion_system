
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import FaultCard from "@/components/FaultCard";
import SensorCard from "@/components/SensorCard";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [faults, setFaults] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch initial faults and sensors
    const fetchData = async () => {
      const [faultsResult, sensorsResult] = await Promise.all([
        supabase
          .from('equipment_faults')
          .select('*')
          .order('time', { ascending: false }),
        supabase
          .from('sensors_data')
          .select('*')
          .order('time', { ascending: false })
      ]);
      
      if (faultsResult.error) {
        console.error('Error fetching faults:', faultsResult.error);
      } else {
        setFaults(faultsResult.data || []);
      }
      
      if (sensorsResult.error) {
        console.error('Error fetching sensors:', sensorsResult.error);
      } else {
        setSensors(sensorsResult.data || []);
      }
    };

    fetchData();

    // Subscribe to real-time updates for both tables
    const faultsChannel = supabase
      .channel('equipment_faults_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_faults'
        },
        async (payload) => {
          const { data } = await supabase
            .from('equipment_faults')
            .select('*')
            .order('time', { ascending: false });
          
          setFaults(data || []);
        }
      )
      .subscribe();

    const sensorsChannel = supabase
      .channel('sensors_data_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensors_data'
        },
        async (payload) => {
          const { data } = await supabase
            .from('sensors_data')
            .select('*')
            .order('time', { ascending: false });
          
          setSensors(data || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(faultsChannel);
      supabase.removeChannel(sensorsChannel);
    };
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">Hotel Device Guardian System</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user.email}</span>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Equipment Faults</h2>
              <p className="text-gray-600">Monitoring active and resolved equipment issues</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faults.map((fault) => (
                <FaultCard key={fault.id} fault={fault} />
              ))}
              {faults.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No equipment faults reported
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Sensor Readings</h2>
              <p className="text-gray-600">Real-time sensor data from rooms</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sensors.map((sensor) => (
                <SensorCard key={sensor.id} sensor={sensor} />
              ))}
              {sensors.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No sensor data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
