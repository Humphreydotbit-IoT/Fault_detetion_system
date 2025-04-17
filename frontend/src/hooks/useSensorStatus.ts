
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SensorStatus {
  sensor_id: number;
  sensor_type: string;
  floor: number;
  room: number;
  last_seen: string;
  status: 'online' | 'offline';
}

const OFFLINE_THRESHOLD_MINUTES = 5;

export const useSensorStatus = () => {
  const [sensorStatuses, setSensorStatuses] = useState<SensorStatus[]>([]);

  const fetchSensorStatuses = async () => {
    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() - OFFLINE_THRESHOLD_MINUTES);

    const { data, error } = await supabase
      .from('sensors_data')
      .select('sensor_id, sensor_type, floor, room, time')
      .order('time', { ascending: false });

    if (error) {
      console.error('Error fetching sensor data:', error);
      return;
    }

    // Process to get latest reading per sensor
    const latestReadings = new Map<number, SensorStatus>();
    data.forEach(reading => {
      if (!latestReadings.has(reading.sensor_id)) {
        const lastSeen = new Date(reading.time);
        latestReadings.set(reading.sensor_id, {
          sensor_id: reading.sensor_id,
          sensor_type: reading.sensor_type,
          floor: reading.floor,
          room: reading.room,
          last_seen: reading.time,
          status: lastSeen > threshold ? 'online' : 'offline'
        });
      }
    });

    setSensorStatuses(Array.from(latestReadings.values()));
  };

  useEffect(() => {
    fetchSensorStatuses();

    const channel = supabase
      .channel('sensor_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensors_data'
        },
        () => {
          fetchSensorStatuses();
        }
      )
      .subscribe();

    const interval = setInterval(fetchSensorStatuses, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const onlineSensors = sensorStatuses.filter(s => s.status === 'online');
  const offlineSensors = sensorStatuses.filter(s => s.status === 'offline');

  return {
    onlineSensors,
    offlineSensors,
    totalSensors: sensorStatuses.length
  };
};
