from django.core.management.base import BaseCommand
from sensors.models import SensorReading
from sensors.supabase_service import SupabaseService
import time
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Syncs existing sensor readings to Supabase'

    def add_arguments(self, parser):
        parser.add_argument('--batch-size', type=int, default=100, help='Number of sensor readings to sync in each batch')
        parser.add_argument('--limit', type=int, default=None, help='Maximum number of recent sensor readings to sync')

    def handle(self, *args, **options):
        batch_size = options['batch-size']
        limit = options['limit']
        
        logger.info("Starting to sync sensor readings to Supabase...")
        self.stdout.write("Starting to sync sensor readings to Supabase...")
        
        # Start with the ordered query
        queryset = SensorReading.objects.all().order_by('-time')
        
        # Apply limit if provided
        if limit is not None:
            queryset = queryset[:limit]
            
        total_sensors = queryset.count()
        logger.info(f"Found {total_sensors} sensor readings to sync")
        self.stdout.write(f"Found {total_sensors} sensor readings to sync")
        
        supabase = SupabaseService()
        
        # Process sensor readings using iterator for memory efficiency
        for sensor in queryset.iterator():
            result = supabase.sync_sensor_data(sensor)
            if result:
                logger.info(f"Synced sensor reading {sensor.sensor_id} at {sensor.time}")
                self.stdout.write(f"Synced sensor reading {sensor.sensor_id} at {sensor.time}")
            else:
                logger.warning(f"Failed to sync sensor reading {sensor.sensor_id} at {sensor.time}")
                self.stdout.write(f"Failed to sync sensor reading {sensor.sensor_id} at {sensor.time}")
            time.sleep(0.1)  # Small delay to avoid rate limiting
        
        logger.info(f"Successfully synced {total_sensors} sensor readings to Supabase")
        self.stdout.write(self.style.SUCCESS(f"Successfully synced {total_sensors} sensor readings to Supabase"))