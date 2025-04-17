
from django.core.management.base import BaseCommand
from sensors.models import EquipmentFault
from sensors.supabase_service import SupabaseService
import time

class Command(BaseCommand):
    help = 'Syncs existing equipment faults to Supabase'

    def add_arguments(self, parser):
        parser.add_argument('--batch-size', type=int, default=100, help='Number of faults to sync in each batch')
        parser.add_argument('--limit', type=int, default=None, help='Maximum number of recent faults to sync')

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        limit = options['limit']
        
        self.stdout.write("Starting to sync faults to Supabase...")
        
    
        queryset = EquipmentFault.objects.all().order_by('-time')
        

        if limit:
            queryset = queryset[:limit]
            
        total_faults = len(list(queryset))
        self.stdout.write(f"Found {total_faults} faults to sync")
        
        supabase = SupabaseService()
        
        # Process all faults in the queryset
        for fault in queryset:
            supabase.sync_fault(fault)
            self.stdout.write(f"Synced fault {fault.id}")
            time.sleep(0.1)  # Small delay to avoid rate limiting
        
        self.stdout.write(self.style.SUCCESS(f"Successfully synced {total_faults} faults to Supabase"))