from supabase import create_client
from django.conf import settings
import logging
import os

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.supabase_url = os.environ.get('SUPABASE_URL')
        self.supabase_key = os.environ.get('SUPABASE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            print("WARNING: Supabase URL or Key not found in environment variables")
            
        self.supabase = create_client(self.supabase_url, self.supabase_key)

    
    def sync_fault(self, fault):
        """
        Syncs a fault from TimescaleDB to Supabase
        """
        try:
            print(f"Attempting to sync fault {fault.id} to Supabase...")
            time_with_tz = fault.time.strftime('%Y-%m-%dT%H:%M:%S%z')
            fault_data = {
                'id': str(fault.id),
                'time': time_with_tz,
                'floor': fault.floor,
                'room': fault.room,
                'device_type': fault.device_type,
                'fault_flags': fault.fault_flags,
                'severity': fault.severity,
                'resolved': fault.resolved
            }
            
            result = self.supabase.table('equipment_faults').upsert(fault_data).execute()
            logger.info(f"Synced fault {fault.id} to Supabase")
            print(f"Successfully synced fault {fault.id} to Supabase")
            return result
        except Exception as e:
            logger.error(f"Error syncing fault {fault.id} to Supabase: {str(e)}")
            print(f"ERROR syncing fault {fault.id} to Supabase: {str(e)}")
            return None

    def sync_sensor_data(self, sensor_obj):
        """
        Syncs a sensor reading to Supabase.
        Using the same approach as sync_fault that works correctly.
        """
        try:
            print(f"Attempting to sync sensor reading {sensor_obj.sensor_id} at {sensor_obj.time} to Supabase...")
            time_with_tz = sensor_obj.time.strftime('%Y-%m-%dT%H:%M:%S%z')
            sensor_data = {
                'id': str(sensor_obj.id),  
                'time': time_with_tz,
                'sensor_id': sensor_obj.sensor_id,
                'temperature': sensor_obj.temperature,
                'humidity': sensor_obj.humidity,
                'co2': sensor_obj.co2,
                'power': sensor_obj.power,
                'presence': sensor_obj.presence,
                'sensor_type': sensor_obj.sensor_type,
                'floor': sensor_obj.floor,
                'room': sensor_obj.room
            }
            result = self.supabase.table('sensors_data').upsert(sensor_data).execute()
            logger.info(f"Synced sensor reading {sensor_obj.sensor_id} at {sensor_obj.time} to Supabase")
            print(f"Successfully synced sensor reading {sensor_obj.sensor_id} at {sensor_obj.time} to Supabase")
            return result
        except Exception as e:
            logger.error(f"Error syncing sensor reading {sensor_obj.sensor_id} at {sensor_obj.time} to Supabase: {e}")
            print(f"ERROR syncing sensor reading {sensor_obj.sensor_id} at {sensor_obj.time} to Supabase: {str(e)}")
            return None