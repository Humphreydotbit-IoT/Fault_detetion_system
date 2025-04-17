import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Thermometer, Droplet, Wind, Gauge, UserCheck, AlertCircle, CircleOff, ActivitySquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FAULT_TYPES, getFaultDescription } from "@/utils/faultUtils";

interface SensorData {
  temperature?: number | null;
  humidity?: number | null;
  co2?: number | null;
  power?: number | null;
  presence?: number | null;
  time: string;
}

interface Fault {
  device_type: string;
  severity: number;
  time: string;
  resolved: boolean | null;
  fault_flags?: number;
}

interface FloorRoomCardProps {
  room: number;
  floor: number;
  sensorData: SensorData;
  lastFault?: Fault;
}

const FloorRoomCard = ({ room, floor, sensorData, lastFault }: FloorRoomCardProps) => {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>(sensorData.time);
  
  useEffect(() => {
    setLastUpdateTime(sensorData.time);
    console.log(`Room ${room} received updated sensor data:`, sensorData);
  }, [sensorData, room]);

  const formatBangkokTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const bangkokOffset = 7 * 60;
      const localOffset = date.getTimezoneOffset();
      const totalOffset = localOffset + bangkokOffset;
      const bangkokDate = new Date(date.getTime() + totalOffset * 60 * 1000);
      return format(bangkokDate, 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const getIconColor = (faultType: number): string => {
    if (!lastFault || !lastFault.fault_flags) return "text-green-500";
    return (lastFault.fault_flags & faultType) !== 0 ? "text-red-500" : "text-green-500";
  };

  const isSensorOffline = (faultType: number): boolean => {
    return lastFault?.fault_flags ? (lastFault.fault_flags & faultType) !== 0 : false;
  };

  const getFaultDescriptionForType = (faultType: number): string => {
    if (!lastFault || !lastFault.fault_flags) return "";
    const faults = getFaultDescription(lastFault.fault_flags & faultType);
    return faults.join(', ');
  };

  const hasAnomalies = lastFault && !lastFault.resolved;

  const renderSensorInfo = (
    icon: React.ReactNode,
    currentValue: number | null | undefined,
    unit: string,
    lastUpdated: string,
    label: string,
    faultType: number
  ) => {
    const isOffline = isSensorOffline(faultType);
    const iconColor = isOffline ? "text-red-500" : "text-green-500";
    
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
            <div className={iconColor}>{isOffline ? <CircleOff className="h-4 w-4" /> : icon}</div>
            <span className={isOffline ? "text-red-500" : ""}>
              {isOffline 
                ? 'Offline'
                : (currentValue !== null && currentValue !== undefined 
                    ? `${currentValue.toFixed(unit === 'ppm' ? 0 : 1)}${unit}` 
                    : 'Unknown')}
            </span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="space-y-2">
            <h4 className="font-semibold">{label}</h4>
            <p className="text-sm text-muted-foreground">
              {isOffline
                ? `Fault detected: ${formatBangkokTime(lastFault!.time)}`
                : `Last updated: ${formatBangkokTime(lastUpdated)}`
              }
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const renderPresenceInfo = (
    icon: React.ReactNode,
    currentValue: number | null | undefined,
    lastUpdated: string,
    label: string
  ) => {
    const isOffline = isSensorOffline(FAULT_TYPES.PRESENCE_NOT_READING);
    const iconColor = isOffline ? "text-red-500" : "text-green-500";
    
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
            <div className={iconColor}>{isOffline ? <CircleOff className="h-4 w-4" /> : icon}</div>
            <span className={isOffline ? "text-red-500" : ""}>
              {isOffline 
                ? 'Offline'
                : (currentValue === 1 
                    ? 'Occupied' 
                    : currentValue === 0 
                      ? 'Empty' 
                      : 'Unknown')}
            </span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="space-y-2">
            <h4 className="font-semibold">{label}</h4>
            <p className="text-sm text-muted-foreground">
              {isOffline
                ? `Fault detected: ${formatBangkokTime(lastFault!.time)}`
                : `Last online: ${formatBangkokTime(lastUpdated)}`
              }
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="relative">
        <CardTitle>Room {room}</CardTitle>
        <CardDescription>
          Floor {floor}
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {formatBangkokTime(lastUpdateTime)}
          </div>
        </CardDescription>
        
        <Link 
          to={`/analysis/room/${floor}/${room}`}
          className={`absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors ${hasAnomalies ? 'text-purple-600' : 'text-gray-400'}`}
          title="View Room Analytics"
        >
          <ActivitySquare 
            className={`h-5 w-5 ${hasAnomalies ? 'animate-pulse' : ''}`}
          />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {renderSensorInfo(
            <Thermometer className="h-4 w-4" />,
            sensorData.temperature,
            '°C',
            sensorData.time,
            'Temperature',
            FAULT_TYPES.SENSOR_NOT_WORKING | FAULT_TYPES.TEMP_HIGH
          )}
          {renderSensorInfo(
            <Droplet className="h-4 w-4" />,
            sensorData.humidity,
            '%',
            sensorData.time,
            'Humidity',
            FAULT_TYPES.SENSOR_NOT_WORKING | FAULT_TYPES.HUM_HIGH
          )}
          {renderSensorInfo(
            <Wind className="h-4 w-4" />,
            sensorData.co2,
            'ppm',
            sensorData.time,
            'CO2',
            FAULT_TYPES.SENSOR_NOT_WORKING | FAULT_TYPES.CO2_LOW | FAULT_TYPES.CO2_HIGH
          )}
          {renderSensorInfo(
            <Gauge className="h-4 w-4" />,
            sensorData.power,
            'kW',
            sensorData.time,
            'Power',
            FAULT_TYPES.POWER_NOT_WORKING | FAULT_TYPES.POWER_SPIKE
          )}
          {renderPresenceInfo(
            <UserCheck className="h-4 w-4" />,
            sensorData.presence,
            sensorData.time,
            'Presence'
          )}
        </div>

        {lastFault && !lastFault.resolved && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Fault</div>
              <div className="flex flex-col gap-2">
                {getFaultDescription(lastFault.fault_flags || 0).map((fault, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">{fault}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                Detected: {formatBangkokTime(lastFault.time)}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FloorRoomCard;
