
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FloorRoomCard from "@/components/FloorRoomCard";
import { supabase } from "@/integrations/supabase/client";

interface SensorData {
  id: string;
  sensor_type: string;
  temperature?: number | null;
  humidity?: number | null;
  co2?: number | null;
  power?: number | null;
  presence?: number | null;
  room: number;
  floor: number;
  time: string;
  sensor_id: number;
}

interface CombinedSensorData {
  id: string;
  sensor_type: string;
  temperature?: number | null;
  humidity?: number | null;
  co2?: number | null;
  power?: number | null;
  presence?: number | null;
  room: number;
  floor: number;
  time: string;
}

interface Fault {
  id: string;
  device_type: string;
  severity: number;
  time: string;
  resolved: boolean | null;
  room: number;
  floor: number;
  fault_flags?: number;
}

const Floor = () => {
  const { floorNumber } = useParams();
  const [sensorData, setSensorData] = useState<Record<number, CombinedSensorData>>({});
  const [faults, setFaults] = useState<Record<number, Fault>>({});
  const floor = Number(floorNumber);

  useEffect(() => {
    const fetchLatestSensorData = async () => {
      try {
        // Fetch latest data for each sensor type
        const sensorTypes = ['temperature', 'humidity', 'co2', 'power', 'presence', 'iaq'];
        const rooms = [1, 2, 3, 4, 5];
        const combinedData: Record<number, CombinedSensorData> = {};
        
        // Initialize combined data structure for each room
        rooms.forEach(roomNum => {
          combinedData[roomNum] = {
            id: `combined-${roomNum}`,
            sensor_type: 'combined',
            room: roomNum,
            floor: floor,
            time: new Date().toISOString()
          };
        });

        // Fetch data for each sensor type
        for (const type of sensorTypes) {
          // Special handling for IAQ sensors which contain multiple values
          if (type === 'iaq') {
            const { data, error } = await supabase
              .from('sensors_data')
              .select('*')
              .eq('floor', floor)
              .eq('sensor_type', 'iaq')
              .order('time', { ascending: false });

            if (error) {
              console.error(`Error fetching IAQ sensor data:`, error);
              continue;
            }

            if (data && data.length > 0) {
              // Process IAQ sensor data by room
              for (const roomNum of rooms) {
                // Find the latest IAQ reading for this room
                const latestSensor = data.find(sensor => sensor.room === roomNum);
                
                if (latestSensor) {
                  // Update combined data with IAQ values (temperature, humidity, co2)
                  if (latestSensor.temperature !== null && latestSensor.temperature !== undefined) {
                    combinedData[roomNum].temperature = latestSensor.temperature;
                  }
                  if (latestSensor.humidity !== null && latestSensor.humidity !== undefined) {
                    combinedData[roomNum].humidity = latestSensor.humidity;
                  }
                  if (latestSensor.co2 !== null && latestSensor.co2 !== undefined) {
                    combinedData[roomNum].co2 = latestSensor.co2;
                  }
                  
                  // Update the timestamp if this reading is newer
                  if (new Date(latestSensor.time) > new Date(combinedData[roomNum].time)) {
                    combinedData[roomNum].time = latestSensor.time;
                  }
                }
              }
            }
          } else {
            // Handle other sensor types normally
            const { data, error } = await supabase
              .from('sensors_data')
              .select('*')
              .eq('floor', floor)
              .eq('sensor_type', type)
              .order('time', { ascending: false });

            if (error) {
              console.error(`Error fetching ${type} sensor data:`, error);
              continue;
            }

            if (data && data.length > 0) {
              // Process sensor data by room
              for (const roomNum of rooms) {
                // Find the latest sensor reading for this room and type
                const latestSensor = data.find(sensor => sensor.room === roomNum);
                
                if (latestSensor) {
                  // Update the combined data with this sensor's reading
                  const sensorValue = latestSensor[type];
                  if (sensorValue !== null && sensorValue !== undefined) {
                    combinedData[roomNum][type] = sensorValue;
                    
                    // Update the timestamp if this reading is newer
                    if (new Date(latestSensor.time) > new Date(combinedData[roomNum].time)) {
                      combinedData[roomNum].time = latestSensor.time;
                    }
                  }
                }
              }
            }
          }
        }
        
        // Update state with combined data
        setSensorData(combinedData);
        console.log("Initial sensor data loaded:", combinedData);
      } catch (err) {
        console.error("Error in fetchLatestSensorData:", err);
      }
    };

    const fetchFaults = async () => {
      try {
        const { data: faultsResult, error: faultsError } = await supabase
          .from('equipment_faults')
          .select('*')
          .eq('floor', floor)
          .order('time', { ascending: false });

        if (faultsError) {
          console.error('Error fetching faults:', faultsError);
          return;
        }

        const latestFaultsByRoom: Record<number, Fault> = {};
        faultsResult.forEach((fault) => {
          if (!latestFaultsByRoom[fault.room]) {
            latestFaultsByRoom[fault.room] = fault;
          }
        });
        setFaults(latestFaultsByRoom);
      } catch (err) {
        console.error("Error in fetchFaults:", err);
      }
    };

    // Initial fetch
    fetchLatestSensorData();
    fetchFaults();

    // Set up real-time listeners for sensor data
    const sensorsChannel = supabase
      .channel('floor_sensors_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensors_data',
          filter: `floor=eq.${floor}`
        },
        (payload) => {
          console.log("Real-time sensor update received:", payload);
          const newSensor = payload.new as SensorData;
          
          setSensorData(prev => {
            const updated = { ...prev };
            if (!updated[newSensor.room]) {
              updated[newSensor.room] = {
                id: `combined-${newSensor.room}`,
                sensor_type: 'combined',
                room: newSensor.room,
                floor: newSensor.floor,
                time: newSensor.time
              };
            }
            
            // Handle IAQ sensor updates (contains temperature, humidity, co2)
            if (newSensor.sensor_type === 'iaq') {
              if (newSensor.temperature !== null && newSensor.temperature !== undefined) {
                updated[newSensor.room].temperature = newSensor.temperature;
              }
              if (newSensor.humidity !== null && newSensor.humidity !== undefined) {
                updated[newSensor.room].humidity = newSensor.humidity;
              }
              if (newSensor.co2 !== null && newSensor.co2 !== undefined) {
                updated[newSensor.room].co2 = newSensor.co2;
              }
            } else {
              // Handle other sensor types
              const sensorType = newSensor.sensor_type.toLowerCase();
              if (newSensor[sensorType] !== null && newSensor[sensorType] !== undefined) {
                updated[newSensor.room][sensorType] = newSensor[sensorType];
              }
            }
            
            // Update timestamp if this is a newer reading
            if (new Date(newSensor.time) > new Date(updated[newSensor.room].time)) {
              updated[newSensor.room].time = newSensor.time;
            }
            
            console.log(`Updated sensor data for room ${newSensor.room}, type ${newSensor.sensor_type}:`, updated[newSensor.room]);
            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log(`Sensor channel status: ${status}`);
      });

    // Set up real-time listeners for faults
    const faultsChannel = supabase
      .channel('floor_faults_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'equipment_faults',
          filter: `floor=eq.${floor}`
        },
        (payload) => {
          console.log("Real-time fault update received:", payload);
          fetchFaults();
        }
      )
      .subscribe((status) => {
        console.log(`Faults channel status: ${status}`);
      });

    return () => {
      console.log("Cleaning up real-time subscriptions");
      supabase.removeChannel(sensorsChannel);
      supabase.removeChannel(faultsChannel);
    };
  }, [floor]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Floor {floor}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5].map((room) => {
          const roomSensorData = sensorData[room] || {
            id: `combined-${room}`,
            sensor_type: 'combined',
            room: room,
            floor: floor,
            time: new Date().toISOString()
          };
          const lastFault = faults[room];

          return (
            <FloorRoomCard
              key={room}
              room={room}
              floor={floor}
              sensorData={roomSensorData}
              lastFault={lastFault}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Floor;
