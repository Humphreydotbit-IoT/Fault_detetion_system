import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartPie, ChartBar, AlertTriangle, Activity, ShieldAlert, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getFaultDescription } from "@/utils/faultUtils";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useToast } from "@/components/ui/use-toast";

interface FaultData {
  device_type: string;
  severity: number;
  time: string;
  resolved: boolean | null;
  fault_flags?: number;
  floor?: number;
  room?: number;
  id?: string;
}

const TIME_RANGES = {
  "30min": 30,
  "1hour": 60,
  "1day": 24 * 60,
};

const Analysis = () => {
  const [timeRange, setTimeRange] = useState<string>("1day");
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();
  
  const { data: faultsData, isLoading: faultsLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["faults-analysis", timeRange],
    queryFn: async () => {
      setIsCalculating(true);
      try {
        let query = supabase
          .from("equipment_faults")
          .select("*")
          .order("time", { ascending: false });
        
        const minutes = TIME_RANGES[timeRange as keyof typeof TIME_RANGES];
        const cutoffDate = new Date();
        cutoffDate.setMinutes(cutoffDate.getMinutes() - minutes);
        query = query.gte("time", cutoffDate.toISOString());
        
        const { data, error } = await query;

        if (error) {
          console.error("Error fetching faults data:", error);
          toast({
            title: "Data fetch error",
            description: "Unable to load fault analysis data. Please try again.",
            variant: "destructive"
          });
          return [];
        }
        
        return data as FaultData[];
      } catch (error) {
        console.error("Error in fetch operation:", error);
        return [];
      } finally {
        setTimeout(() => setIsCalculating(false), 500);
      }
    },
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    staleTime: 55000
  });

  const handleManualRefresh = () => {
    setIsCalculating(true);
    refetch().then(() => {
      setTimeout(() => setIsCalculating(false), 500);
      toast({
        title: "Data refreshed",
        description: "Fault analysis data has been updated."
      });
    });
  };

  const faultsByType = React.useMemo(() => {
    if (!faultsData || faultsData.length === 0) return [];
    
    const counts = faultsData.reduce((acc: Record<string, number>, item) => {
      acc[item.device_type] = (acc[item.device_type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts).map(([type, count]) => ({
      name: type,
      value: count
    }));
  }, [faultsData]);

  const faultsBySeverity = React.useMemo(() => {
    if (!faultsData || faultsData.length === 0) return [];
    
    const counts = faultsData.reduce((acc: Record<string, number>, item) => {
      const severity = item.severity === 1 ? "Low" : item.severity === 2 ? "Medium" : "High";
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts).map(([severity, count]) => ({
      name: severity,
      value: count
    }));
  }, [faultsData]);

  const faultsByLocation = React.useMemo(() => {
    if (!faultsData || faultsData.length === 0) return [];

    const locations: Record<string, number> = {};
    
    faultsData.forEach(fault => {
      if (fault.floor !== undefined && fault.room !== undefined) {
        const locationKey = `Floor ${fault.floor}, Room ${fault.room}`;
        locations[locationKey] = (locations[locationKey] || 0) + 1;
      }
    });
    
    return Object.entries(locations)
      .map(([location, count]) => ({ name: location, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [faultsData]);

  const faultResolutionRate = React.useMemo(() => {
    if (!faultsData || faultsData.length === 0) return 0;
    
    const resolvedCount = faultsData.filter(fault => fault.resolved).length;
    return Math.round((resolvedCount / faultsData.length) * 100);
  }, [faultsData]);

  const topFaultTypes = React.useMemo(() => {
    if (!faultsData || faultsData.length === 0) return [];
    
    const faultTypeCounts: Record<string, number> = {};
    
    faultsData.forEach(fault => {
      if (fault.fault_flags) {
        const descriptions = getFaultDescription(fault.fault_flags);
        descriptions.forEach(desc => {
          faultTypeCounts[desc] = (faultTypeCounts[desc] || 0) + 1;
        });
      }
    });
    
    return Object.entries(faultTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [faultsData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const getTimeRangeDescription = () => {
    const minutes = TIME_RANGES[timeRange as keyof typeof TIME_RANGES];
    if (minutes === 30) return "last 30 minutes";
    if (minutes === 60) return "last hour";
    if (minutes === 24 * 60) return "last 24 hours";
    return `last ${minutes} minutes`;
  };

  const formatLastUpdatedTime = () => {
    if (!dataUpdatedAt) return "Never";
    const date = new Date(dataUpdatedAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (faultsLoading && !faultsData) {
    return (
      <div className="container py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-3xl font-bold">Building Analysis</h1>
        </div>
        <div className="h-[80vh] flex items-center justify-center flex-col gap-4">
          <div className="animate-spin">
            <RefreshCw size={40} className="text-primary" />
          </div>
          <p className="text-lg text-muted-foreground">Loading fault analysis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-bold">Building Analysis</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 sm:mt-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isCalculating}
              className="flex items-center gap-1"
            >
              <RefreshCw size={16} className={isCalculating ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>
            <span className="text-xs text-muted-foreground">
              Last update: {formatLastUpdatedTime()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock size={16} /> Time range:
            </span>
            <Select value={timeRange} onValueChange={setTimeRange} disabled={isCalculating}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30min">Last 30 minutes</SelectItem>
                <SelectItem value="1hour">Last hour</SelectItem>
                <SelectItem value="1day">Last 24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {isCalculating ? (
        <div className="h-[calc(100vh-200px)] flex items-center justify-center flex-col gap-4">
          <div className="animate-spin">
            <RefreshCw size={40} className="text-primary" />
          </div>
          <p className="text-lg text-muted-foreground">Calculating fault statistics...</p>
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
                <span>Fault Analysis Summary</span>
              </CardTitle>
              <CardDescription>
                Overview of equipment fault statistics for {getTimeRangeDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-100 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-800">
                    {faultsData?.length || 0}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Total Faults</div>
                </div>
                <div className="bg-slate-100 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-800">
                    {faultsData?.filter(f => !f.resolved).length || 0}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Active Faults</div>
                </div>
                <div className="bg-slate-100 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-800">
                    {faultResolutionRate}%
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Resolution Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartPie className="h-5 w-5" />
                  <span>Faults by Device Type</span>
                </CardTitle>
                <CardDescription>
                  Distribution of equipment faults by device type
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ChartContainer config={{}}>
                  <PieChart>
                    <Pie
                      data={faultsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {faultsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartBar className="h-5 w-5" />
                  <span>Faults by Severity</span>
                </CardTitle>
                <CardDescription>
                  Distribution of equipment faults by severity level
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ChartContainer config={{}}>
                  <BarChart data={faultsBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#82ca9d" name="Number of Faults" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                Based on {faultsData?.length || 0} equipment faults from {getTimeRangeDescription()}
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  <span>Top Fault Locations</span>
                </CardTitle>
                <CardDescription>
                  Areas with the highest number of fault occurrences
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ChartContainer config={{}}>
                  <BarChart
                    layout="vertical"
                    data={faultsByLocation}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#FF8042" name="Number of Faults" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Most Common Fault Types</span>
                </CardTitle>
                <CardDescription>
                  The most frequently occurring fault conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fault Type</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topFaultTypes.length > 0 ? (
                      topFaultTypes.map((fault, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{fault.type}</TableCell>
                          <TableCell className="text-right">{fault.count}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                          No fault data available for the selected time range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Analysis;
