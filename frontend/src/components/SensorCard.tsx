
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplet, Wind, Gauge, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SensorCardProps {
  sensor: {
    id: string;
    sensor_type: string;
    floor: number;
    room: number;
    time: string;
    temperature?: number | null;
    humidity?: number | null;
    co2?: number | null;
    power?: number | null;
    presence?: number | null;
  };
}

const SensorCard = ({ sensor }: SensorCardProps) => {
  const getSensorIcon = (sensorType: string) => {
    switch (sensorType.toLowerCase()) {
      case "temperature":
        return <Thermometer className="h-5 w-5" />;
      case "humidity":
        return <Droplet className="h-5 w-5" />;
      case "co2":
        return <Wind className="h-5 w-5" />;
      case "power":
        return <Gauge className="h-5 w-5" />;
      case "presence":
        return <UserCheck className="h-5 w-5" />;
      default:
        return <Gauge className="h-5 w-5" />;
    }
  };

  const getSensorValue = (sensor: SensorCardProps["sensor"]) => {
    if (sensor.temperature !== null && sensor.temperature !== undefined) {
      return `${sensor.temperature.toFixed(1)}°C`;
    }
    if (sensor.humidity !== null && sensor.humidity !== undefined) {
      return `${sensor.humidity.toFixed(1)}%`;
    }
    if (sensor.co2 !== null && sensor.co2 !== undefined) {
      return `${sensor.co2.toFixed(0)} ppm`;
    }
    if (sensor.power !== null && sensor.power !== undefined) {
      return `${sensor.power.toFixed(1)} kW`;
    }
    if (sensor.presence !== null && sensor.presence !== undefined) {
      return sensor.presence === 1 ? "Occupied" : "Empty";
    }
    return "Offline";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Room {sensor.room}, Floor {sensor.floor}
        </CardTitle>
        <div className="rounded-full p-1 bg-blue-100 text-blue-800">
          {getSensorIcon(sensor.sensor_type)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-semibold">{sensor.sensor_type}</div>
        <div className="text-2xl font-bold my-2">{getSensorValue(sensor)}</div>
        <CardDescription>
          Updated {formatDistanceToNow(new Date(sensor.time))} ago
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export default SensorCard;
