
import { format } from "date-fns";
import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CircleOff } from "lucide-react";
import { SensorStatus } from "@/hooks/useSensorStatus";

interface OfflineSensorsListProps {
  offlineSensors: SensorStatus[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_OFFLINE_SENSORS_TO_SHOW = 3;

export const OfflineSensorsList = ({ offlineSensors, open, onOpenChange }: OfflineSensorsListProps) => {
  const formatOfflineTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const limitedOfflineSensors = offlineSensors.slice(0, MAX_OFFLINE_SENSORS_TO_SHOW);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 text-red-600 cursor-pointer hover:underline">
          <CircleOff className="h-4 w-4" />
          <Badge variant="destructive">{offlineSensors.length} Sensors Offline</Badge>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold">Offline Sensors</h4>
            <button 
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-3 mt-2">
            {limitedOfflineSensors.map((sensor) => (
              <div 
                key={sensor.sensor_id}
                className="flex flex-col p-2 border border-red-200 rounded bg-red-50"
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {sensor.sensor_type} (Floor {sensor.floor}, Room {sensor.room})
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  Last seen: {formatOfflineTime(sensor.last_seen)}
                </span>
              </div>
            ))}
            
            {offlineSensors.length > MAX_OFFLINE_SENSORS_TO_SHOW && (
              <div className="text-sm text-gray-500 italic">
                + {offlineSensors.length - MAX_OFFLINE_SENSORS_TO_SHOW} more offline sensors...
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
