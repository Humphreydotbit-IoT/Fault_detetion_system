import json
import pika
from django.core.management.base import BaseCommand
from sensors.models import EquipmentFault
from datetime import datetime
import pytz
import random
from sensors.supabase_service import SupabaseService
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_project.settings')
django.setup()
# Fault bit definitions
FAULT_SENSOR_NOT_WORKING = 1      # Bit 0 (IAQ: all zeros)
FAULT_CALIBRATION_ERROR = 2       # Bit 1 (IAQ: partial zeros)
FAULT_TEMP_HIGH = 4               # Bit 2
FAULT_HUM_HIGH = 8                # Bit 3
FAULT_CO2_LOW = 16                # Bit 4
FAULT_CO2_HIGH = 32               # Bit 5
FAULT_POWER_NOT_WORKING = 64      # Bit 6 (Power: 0.0 kW)
FAULT_POWER_SPIKE = 128           # Bit 7 (Power: >45.0 kW)
FAULT_PRESENCE_NOT_READING = 256  # Bit 8 (Presence: 3)

# Device type bit ranges
IAQ_FAULTS = (FAULT_SENSOR_NOT_WORKING | FAULT_CALIBRATION_ERROR | FAULT_TEMP_HIGH |
              FAULT_HUM_HIGH | FAULT_CO2_LOW | FAULT_CO2_HIGH)  # Bits 0-5
POWER_FAULTS = (FAULT_POWER_NOT_WORKING | FAULT_POWER_SPIKE)    # Bits 6-7
PRESENCE_FAULTS = FAULT_PRESENCE_NOT_READING                    # Bit 8

class Command(BaseCommand):
    help = 'Consumes fault messages from RabbitMQ and stores them in TimescaleDB'

    def handle(self, *args, **options):
        self.stdout.write("Starting RabbitMQ fault consumer...")
        
        credentials = pika.PlainCredentials('guest', 'guest')
        rabbitmq_connection = pika.BlockingConnection(
            pika.ConnectionParameters(host='rabbitmq', credentials=credentials)
        )
        channel = rabbitmq_connection.channel()

        channel.exchange_declare(exchange='fault_notifications', exchange_type='topic')
        channel.queue_declare(queue='fault_queue', durable=True)
        channel.queue_bind(queue='fault_queue', exchange='fault_notifications', routing_key='*.room*.fault')

        self.stdout.write("Connected to RabbitMQ, waiting for fault messages...")

        def callback(ch, method, properties, body):
            self.stdout.write(f"Received message: {body}")
            try:
                data = json.loads(body)
                self.stdout.write(f"Parsed data: {data}")
                
                if 'timestamp' not in data or 'fault_flags' not in data:
                    raise ValueError("Missing 'timestamp' or 'fault_flags' field in message")
                
                # Convert Unix timestamp to Asia/Bangkok
                fault_time = datetime.fromtimestamp(data['timestamp'], tz=pytz.timezone('Asia/Bangkok'))

                # Parse floor and room from routing key (e.g., floor2.room3.fault)
                routing_key = method.routing_key
                floor_str, room_str, _ = routing_key.split('.')
                floor = int(floor_str.replace('floor', ''))
                room = int(room_str.replace('room', ''))

                # Split fault_flags into device-specific faults
                fault_flags = data['fault_flags']
                iaq_flags = fault_flags & IAQ_FAULTS
                power_flags = fault_flags & POWER_FAULTS
                presence_flags = fault_flags & PRESENCE_FAULTS

                # Define severity based on fault_flags
                def calculate_severity(flags):
                    severity_map = {
                        FAULT_SENSOR_NOT_WORKING: 2,  # Bit 0
                        FAULT_CALIBRATION_ERROR: 2,   # Bit 1
                        FAULT_TEMP_HIGH: 2,           # Bit 2
                        FAULT_HUM_HIGH: 2,            # Bit 3
                        FAULT_CO2_LOW: 1,             # Bit 4
                        FAULT_CO2_HIGH: 2,            # Bit 5
                        FAULT_POWER_NOT_WORKING: 3,   # Bit 6
                        FAULT_POWER_SPIKE: 3,         # Bit 7
                        FAULT_PRESENCE_NOT_READING: 2 # Bit 8
                    }
                    max_severity = 0
                    for fault, severity in severity_map.items():
                        if flags & fault:
                            max_severity = max(max_severity, severity)
                    return max_severity or 1  # Default to 1 if no flags

                # Generate a unique ID within 32-bit integer range
                def generate_unique_id(timestamp):
                    # Use last 7 digits of timestamp (max 9999999) plus a random 3-digit number
                    timestamp_part = timestamp % 10000000  # Up to 7 digits
                    random_part = random.randint(0, 999)   # 3 digits
                    # Combine: timestamp_part * 1000 + random_part (max ~9,999,999,999)
                    # Ensure it fits in 32-bit signed int (max 2,147,483,647)
                    unique_id = (timestamp_part * 1000 + random_part) % 2147483647
                    return unique_id if unique_id > 0 else 1  # Ensure non-zero

                # Insert faults using ORM
                if iaq_flags:
                    severity = calculate_severity(iaq_flags)
                    fault_obj, created = EquipmentFault.objects.get_or_create(
                        time=fault_time,
                        floor=floor,
                        room=room,
                        device_type='iaq',
                        defaults={
                            'id': generate_unique_id(data['timestamp']),
                            'fault_flags': iaq_flags,
                            'severity': severity,
                            'resolved': False
                        }
                    )
                    self.stdout.write(f"Inserted IAQ fault: time={fault_time}, floor={floor}, room={room}, fault_flags={iaq_flags}")
                    print(f"About to sync fault {fault_obj.id} to Supabase")
                    supabase = SupabaseService()
                    supabase.sync_fault(fault_obj)
                    print(f"Supabase sync result: {fault_obj.id}")

                if power_flags:
                    severity = calculate_severity(power_flags)
                    fault_obj, created = EquipmentFault.objects.get_or_create(
                        time=fault_time,
                        floor=floor,
                        room=room,
                        device_type='power',
                        defaults={
                            'id': generate_unique_id(data['timestamp']),
                            'fault_flags': power_flags,
                            'severity': severity,
                            'resolved': False
                        }
                    )
                    self.stdout.write(f"Inserted Power fault: time={fault_time}, floor={floor}, room={room}, fault_flags={power_flags}")
                    print(f"About to sync fault {fault_obj.id} to Supabase")
                    supabase = SupabaseService()
                    supabase.sync_fault(fault_obj)
                    print(f"Supabase sync result: {fault_obj.id}")

                if presence_flags:
                    severity = calculate_severity(presence_flags)
                    fault_obj, created = EquipmentFault.objects.get_or_create(
                        time=fault_time,
                        floor=floor,
                        room=room,
                        device_type='presence',
                        defaults={
                            'id': generate_unique_id(data['timestamp']),
                            'fault_flags': presence_flags,
                            'severity': severity,
                            'resolved': False
                        }
                    )
                    self.stdout.write(f"Inserted Presence fault: time={fault_time}, floor={floor}, room={room}, fault_flags={presence_flags}")
                    print(f"About to sync fault {fault_obj.id} to Supabase")
                    supabase = SupabaseService()
                    supabase.sync_fault(fault_obj)
                    print(f"Supabase sync result: {fault_obj.id}")
            except Exception as e:
                self.stderr.write(f"Error processing message: {str(e)}")

        channel.basic_consume(queue='fault_queue', on_message_callback=callback, auto_ack=True)
        self.stdout.write("Fault consumer started, listening for messages...")
        channel.start_consuming()