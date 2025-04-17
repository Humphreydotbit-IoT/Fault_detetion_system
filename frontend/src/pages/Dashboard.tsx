
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getFaultDescription } from "@/utils/faultUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Fault {
  id: string;
  device_type: string;
  fault_flags: number;
  floor: number;
  room: number;
  severity: number;
  time: string;
  resolved: boolean | null;
  resolved_at?: string | null;
}

const TIME_RANGES = {
  "10min": 10,
  "30min": 30,
  "1hour": 60,
  "1day": 1440,
};

const Dashboard = () => {
  const [activeFaults, setActiveFaults] = useState<Fault[]>([]);
  const [resolvedFaults, setResolvedFaults] = useState<Fault[]>([]);
  const [timeRange, setTimeRange] = useState<string>("1hour");
  const { toast } = useToast();

  useEffect(() => {
    fetchFaults();

    const channel = supabase
      .channel('equipment_faults_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_faults'
        },
        () => {
          fetchFaults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  const fetchFaults = async () => {
    // Active faults query
    const activeResult = await supabase
      .from('equipment_faults')
      .select('*')
      .eq('resolved', false)
      .order('time', { ascending: false })
      .limit(10);
    
    if (!activeResult.error && activeResult.data) {
      setActiveFaults(activeResult.data);
    }
    
    // Resolved faults query with time range filter
    const cutoffDate = new Date();
    const minutes = TIME_RANGES[timeRange as keyof typeof TIME_RANGES];
    cutoffDate.setMinutes(cutoffDate.getMinutes() - minutes);
    
    const resolvedResult = await supabase
      .from('equipment_faults')
      .select('*')
      .eq('resolved', true)
      .gte('resolved_at', cutoffDate.toISOString())
      .order('resolved_at', { ascending: false })
      .limit(10);
    
    if (!resolvedResult.error && resolvedResult.data) {
      setResolvedFaults(resolvedResult.data);
    }
  };

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

  const handleResolve = async (faultId: string) => {
    const now = new Date().toISOString();
    
    try {
      const { data, error } = await supabase
        .from('equipment_faults')
        .update({ 
          resolved: true,
          resolved_at: now
        })
        .eq('id', faultId);
      
      if (error) {
        console.error("Supabase update error:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update fault status: " + error.message
        });
      } else {
        // Update both active and resolved faults
        setActiveFaults(prev => prev.filter(fault => fault.id !== faultId));
        const resolvedFault = activeFaults.find(fault => fault.id === faultId);
        if (resolvedFault) {
          setResolvedFaults(prev => [{...resolvedFault, resolved: true, resolved_at: now}, ...prev]);
        }
        
        toast({
          title: "Success",
          description: "Fault marked as resolved"
        });
      }
    } catch (e) {
      console.error("Exception during update:", e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    }
    <h1 className="text-2xl font-bold mb-6">Active Faults</h1>
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device Type</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Floor</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Fault Type</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeFaults.map((fault) => (
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-8">
        {/* Active Faults Table */}
        <div>
          <h1 className="text-2xl font-bold mb-6">Active Faults</h1>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Fault Type</TableHead>nel('equipment_faults_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_faults'
        },
        () => {
          fetchFaults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chan
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeFaults.map((fault) => (
                  <TableRow key={fault.id}>                    <Dashboard />

                    <TableCell className="font-medium">{fault.device_type}</TableCell>
                    <TableCell>Room {fault.room}</TableCell>
                    <TableCell>Floor {fault.floor}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        fault.severity === 1 ? 'bg-red-100 text-red-800' :
                        fault.severity === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {fault.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        {getFaultDescription(fault.fault_flags).map((desc, i) => (
                          <li key={i}>{desc}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>{formatBangkokTime(fault.time)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleResolve(fault.id)}
                        className="text-red-600 hover:text-red-800 hover:underline"
                      >
                        Active
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {activeFaults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                      No active faults
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Resolved Faults Table */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Recently Resolved Faults</h2>
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
                  <SelectItem value="10min">Last 10 min</SelectItem>
                  <SelectItem value="30min">Last 30 min</SelectItem>
                  <SelectItem value="1hour">Last 1 hour</SelectItem>
                  <SelectItem value="1day">Last 1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Fault Type</TableHead>
                  <TableHead>Resolved At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedFaults.map((fault) => (
                  <TableRow key={fault.id}>
                    <TableCell className="font-medium">{fault.device_type}</TableCell>
                    <TableCell>Room {fault.room}</TableCell>
                    <TableCell>Floor {fault.floor}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        fault.severity === 1 ? 'bg-red-100 text-red-800' :
                        fault.severity === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {fault.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        {getFaultDescription(fault.fault_flags).map((desc, i) => (
                          <li key={i}>{desc}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>
                      {fault.resolved_at ? formatBangkokTime(fault.resolved_at) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600">Resolved</span>
                    </TableCell>
                  </TableRow>
                ))}
                {resolvedFaults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                      No resolved faults in the selected time range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
