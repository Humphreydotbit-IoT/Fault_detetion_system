
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ThermometerSnowflake, Wrench } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FaultCardProps {
  fault: {
    id: string;
    device_type: string;
    fault_flags: number;
    floor: number;
    room: number;
    severity: number;
    time: string;
    resolved: boolean | null;
  };
}

const FaultCard = ({ fault }: FaultCardProps) => {
  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1:
        return "bg-red-100 text-red-800";
      case 2:
        return "bg-orange-100 text-orange-800";
      case 3:
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "hvac":
        return <ThermometerSnowflake className="h-5 w-5" />;
      case "maintenance":
        return <Wrench className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <Card className={`${fault.resolved ? 'opacity-50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Room {fault.room}, Floor {fault.floor}
        </CardTitle>
        <div className={`rounded-full p-1 ${getSeverityColor(fault.severity)}`}>
          {getDeviceIcon(fault.device_type)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-semibold">{fault.device_type}</div>
        <CardDescription>
          Reported {formatDistanceToNow(new Date(fault.time))} ago
        </CardDescription>
        <div className="mt-2">
          {fault.resolved ? (
            <span className="text-sm text-green-600">Resolved</span>
          ) : (
            <span className="text-sm text-red-600">Active</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FaultCard;
