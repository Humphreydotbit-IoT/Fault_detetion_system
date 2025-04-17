
import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useSensorStatus } from "@/hooks/useSensorStatus";
import { OfflineSensorsList } from "./OfflineSensorsList";

const SensorStatusOverview = () => {
  const { onlineSensors, offlineSensors } = useSensorStatus();
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {offlineSensors.length > 0 ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          Sensor Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {onlineSensors.length} Sensors Online
          </div>

          {offlineSensors.length > 0 && (
            <OfflineSensorsList
              offlineSensors={offlineSensors}
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SensorStatusOverview;
