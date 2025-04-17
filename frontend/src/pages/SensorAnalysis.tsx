import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface SensorDataPoint {
  timestamp: string;
  value: number | null;
  isError?: boolean;
  errorMessage?: string;
}

interface SensorHistory {
  temperature: SensorDataPoint[];
  humidity: SensorDataPoint[];
  co2: SensorDataPoint[];
  presence: SensorDataPoint[];
  power: SensorDataPoint[];
}

const TIME_RANGES = {
  "1hour": 60,
  "6hours": 360,
  "1day": 1440,
  "1week": 10080,
};

const THRESHOLDS = {
  temperature: { min: 18, max: 28 }, // °C
  humidity: { min: 30, max: 60 }, // %
  co2: { min: 400, max: 1000 }, // ppm
  presence: { min: 0, max: 2 }, // 0, 1, 2 (no presence, partial, full)
  power: { min: 0, max: 100 }, // %
};

const CHART_COLORS = {
  temperature: "#8B5CF6", // Purple
  humidity: "#33C3F0",    // Blue
  co2: "#1EAEDB",         // Teal
  presence: "#0EA5E9",    // Sky blue
  power: "#33C3F0",       // Changed from gray to blue (same as humidity)
  error: "#ea384c"        // Red (for errors)
};

const SensorAnalysis = () => {
  const { floorNumber, roomNumber } = useParams();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<string>("1day");
  const [sensorHistory, setSensorHistory] = useState<SensorHistory>({
    temperature: [],
    humidity: [],
    co2: [],
    presence: [],
    power: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSensorHistory = async () => {
      setLoading(true);
      try {
        const minutes = TIME_RANGES[timeRange as keyof typeof TIME_RANGES];
        const cutoffDate = new Date();
        cutoffDate.setMinutes(cutoffDate.getMinutes() - minutes);

        const floorNum = parseInt(floorNumber || "0", 10);
        const roomNum = parseInt(roomNumber || "0", 10);

        console.log(`Fetching data for floor ${floorNum}, room ${roomNum} from ${cutoffDate.toISOString()}`);

        const { data: sensorData, error: sensorError } = await supabase
          .from('sensors_data')
          .select('*')
          .eq('floor', floorNum)
          .eq('room', roomNum)
          .gte('time', cutoffDate.toISOString())
          .order('time', { ascending: true });

        if (sensorError) {
          console.error("Error fetching sensor data:", sensorError);
          return;
        }

        console.log(`Retrieved ${sensorData?.length || 0} data points`);
        
        if (sensorData && sensorData.length > 0) {
          console.log("Data sample:", sensorData.slice(0, 3));
        }

        const temperatureHistory = sensorData?.map(item => {
          const isError = item.temperature !== null && 
            (item.temperature < THRESHOLDS.temperature.min || item.temperature > THRESHOLDS.temperature.max);
          
          return {
            timestamp: formatTimestamp(item.time),
            value: item.temperature,
            isError,
            errorMessage: isError ? 
              `Temperature out of range: ${item.temperature}°C (normal range: ${THRESHOLDS.temperature.min}-${THRESHOLDS.temperature.max}°C)` : 
              undefined
          };
        }) || [];

        const humidityHistory = sensorData?.map(item => {
          const isError = item.humidity !== null && 
            (item.humidity < THRESHOLDS.humidity.min || item.humidity > THRESHOLDS.humidity.max);
          
          return {
            timestamp: formatTimestamp(item.time),
            value: item.humidity,
            isError,
            errorMessage: isError ? 
              `Humidity out of range: ${item.humidity}% (normal range: ${THRESHOLDS.humidity.min}-${THRESHOLDS.humidity.max}%)` : 
              undefined
          };
        }) || [];

        const co2History = sensorData?.map(item => {
          const isError = item.co2 !== null && 
            (item.co2 < THRESHOLDS.co2.min || item.co2 > THRESHOLDS.co2.max);
          
          return {
            timestamp: formatTimestamp(item.time),
            value: item.co2,
            isError,
            errorMessage: isError ? 
              `CO2 out of range: ${item.co2} ppm (normal range: ${THRESHOLDS.co2.min}-${THRESHOLDS.co2.max} ppm)` : 
              undefined
          };
        }) || [];

        const presenceHistory = sensorData?.map(item => {
          const isError = item.presence !== null && 
            (item.presence < THRESHOLDS.presence.min || item.presence > THRESHOLDS.presence.max);
          
          return {
            timestamp: formatTimestamp(item.time),
            value: item.presence,
            isError,
            errorMessage: isError ? 
              `Presence value invalid: ${item.presence} (valid values: 0-2)` : 
              undefined
          };
        }) || [];

        const powerHistory = sensorData?.map(item => {
          const isError = item.power !== null && 
            (item.power < THRESHOLDS.power.min || item.power > THRESHOLDS.power.max);
          
          return {
            timestamp: formatTimestamp(item.time),
            value: item.power,
            isError,
            errorMessage: isError ? 
              `Power out of range: ${item.power}% (normal range: ${THRESHOLDS.power.min}-${THRESHOLDS.power.max}%)` : 
              undefined
          };
        }) || [];
        
        console.log("Fetched data points:", {
          temperature: temperatureHistory.length,
          humidity: humidityHistory.length,
          co2: co2History.length,
          presence: presenceHistory.length,
          power: powerHistory.length
        });
        
        setSensorHistory({
          temperature: temperatureHistory,
          humidity: humidityHistory,
          co2: co2History,
          presence: presenceHistory,
          power: powerHistory,
        });
      } catch (error) {
        console.error("Error fetching sensor history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSensorHistory();
  }, [floorNumber, roomNumber, timeRange]);

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const bangkokOffset = 7 * 60;
      const localOffset = date.getTimezoneOffset();
      const totalOffset = localOffset + bangkokOffset;
      const bangkokDate = new Date(date.getTime() + totalOffset * 60 * 1000);
      
      if (timeRange === "1hour") {
        return format(bangkokDate, 'HH:mm:ss');
      } else if (timeRange === "6hours" || timeRange === "1day") {
        return format(bangkokDate, 'HH:mm');
      } else {
        return format(bangkokDate, 'MM-dd HH:mm');
      }
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid date";
    }
  };

  const formatChartData = (data: SensorDataPoint[]) => {
    return data.map(point => ({
      time: point.timestamp,
      value: point.value,
      isError: point.isError,
      errorMessage: point.errorMessage
    }));
  };

  const CustomizedDot = ({ cx, cy, value, payload, stroke }: any) => {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (payload && payload.isError) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill={CHART_COLORS.error} 
          stroke="white" 
          strokeWidth={2}
        />
      );
    }
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={4}
        fill={stroke} 
      />
    );
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex items-center justify-center gap-4 mt-2">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.value}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: CHART_COLORS.error }}
          />
          <span>Error</span>
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-md">
          <p className="font-semibold">{`Time: ${label}`}</p>
          <p className="text-sm">{`Value: ${payload[0].value !== null ? payload[0].value : 'No data'}`}</p>
          {dataPoint.isError && (
            <p className="text-sm text-red-500 font-medium mt-1">{dataPoint.errorMessage}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate(-1)}
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            Sensor Analysis - Floor {floorNumber}, Room {roomNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Time Range:</span>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1hour">Last 1 hour</SelectItem>
              <SelectItem value="6hours">Last 6 hours</SelectItem>
              <SelectItem value="1day">Last 1 day</SelectItem>
              <SelectItem value="1week">Last 1 week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Temperature History (°C)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <p>Loading temperature data...</p>
              </div>
            ) : sensorHistory.temperature.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(sensorHistory.temperature)} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Line 
                    type="linear" 
                    dataKey="value" 
                    name="Temperature" 
                    stroke={CHART_COLORS.temperature}
                    dot={<CustomizedDot />}
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p>No temperature data available for the selected time range</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Humidity History (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <p>Loading humidity data...</p>
              </div>
            ) : sensorHistory.humidity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(sensorHistory.humidity)} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Line 
                    type="linear" 
                    dataKey="value" 
                    name="Humidity" 
                    stroke={CHART_COLORS.humidity}
                    dot={<CustomizedDot />}
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p>No humidity data available for the selected time range</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CO2 History (ppm)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <p>Loading CO2 data...</p>
              </div>
            ) : sensorHistory.co2.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(sensorHistory.co2)} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Line 
                    type="linear" 
                    dataKey="value" 
                    name="CO2" 
                    stroke={CHART_COLORS.co2}
                    dot={<CustomizedDot />}
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p>No CO2 data available for the selected time range</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presence History</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <p>Loading presence data...</p>
              </div>
            ) : sensorHistory.presence.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(sensorHistory.presence)} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={70} />
                  <YAxis domain={[0, 2]} ticks={[0, 1, 2]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Line 
                    type="stepAfter" 
                    dataKey="value" 
                    name="Presence" 
                    stroke={CHART_COLORS.presence}
                    dot={<CustomizedDot />}
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p>No presence data available for the selected time range</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Power Usage History (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <p>Loading power data...</p>
              </div>
            ) : sensorHistory.power.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(sensorHistory.power)} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Line 
                    type="linear" 
                    dataKey="value" 
                    name="Power" 
                    stroke={CHART_COLORS.power}
                    dot={<CustomizedDot />}
                    activeDot={{ r: 8 }} 
                    strokeWidth={0}
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p>No power data available for the selected time range</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SensorAnalysis;
