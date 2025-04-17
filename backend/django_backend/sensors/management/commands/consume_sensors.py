
import json
import pika
from django.core.management.base import BaseCommand
from datetime import datetime
import pytz
import hashlib
import time
import random
import logging
from django.db import IntegrityError, transaction
from django.db.models import F
from sensors.models import SensorReading
from sensors.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Consumes sensor messages from RabbitMQ and stores them in TimescaleDB and Supabase'

    def connect_rabbitmq(self):
        while True:
            try:
                credentials = pika.PlainCredentials('guest', 'guest')
                connection = pika.BlockingConnection(
                    pika.ConnectionParameters(host='rabbitmq', credentials=credentials)
                )
                return connection
            except Exception as e:
                self.stderr.write(f"RabbitMQ connection failed: {e}, retrying in 5s...")
                time.sleep(5)

    def handle(self, *args, **options):
        self.stdout.write("Starting RabbitMQ sensor consumer...")
        
        rabbitmq_connection = self.connect_rabbitmq()
        channel = rabbitmq_connection.channel()

        channel.exchange_declare(exchange='hotel_sensors', exchange_type='topic')
        channel.queue_declare(queue='sensor_queue', durable=True)
        channel.queue_bind(queue='sensor_queue', exchange='hotel_sensors', routing_key='*.*.*')

        self.stdout.write("Connected to RabbitMQ, waiting for sensor messages...")

        def callback(ch, method, properties, body):
            self.stdout.write(f"Received message: {body}")
            try:
                data = json.loads(body)
                self.stdout.write(f"Parsed data: {data}")
                
                if 'timestamp' not in data:
                    raise ValueError("Missing 'timestamp' field in message")
                timestamp = data['timestamp']
                # Convert Unix timestamp to Asia/Bangkok timezone
                thailand_dt = datetime.fromtimestamp(timestamp, tz=pytz.timezone('Asia/Bangkok'))

                # Parse floor, room, and sensor_type from routing key
                routing_key = method.routing_key
                parts = routing_key.split('.')
                if len(parts) != 3:
                    raise ValueError(f"Invalid routing key format: {routing_key}")
                
                floor_str, room_str, sensor_type = parts
                try:
                    floor = int(floor_str.replace('floor', ''))
                    room = int(room_str.replace('room', ''))
                except ValueError:
                    raise ValueError(f"Could not parse floor/room from: {routing_key}")
                
                valid_sensor_types = {'iaq', 'power', 'presence'}
                if sensor_type not in valid_sensor_types:
                    raise ValueError(f"Invalid sensor_type: {sensor_type}")

                # Generate sensor_id
                sensor_id_str = f"{floor}:{room}:{sensor_type}"
                sensor_id = int(hashlib.sha256(sensor_id_str.encode()).hexdigest(), 16) % 10**10

                # Extract sensor-specific fields
                temperature = data.get('temperature') if sensor_type == 'iaq' else None
                humidity = data.get('humidity') if sensor_type == 'iaq' else None
                co2 = data.get('co2') if sensor_type == 'iaq' else None
                power = data.get('power_kw') if sensor_type == 'power' else None
                presence = data.get('presence') if sensor_type == 'presence' else None

                if presence is not None and presence not in {0, 1, 2, 3}:
                    raise ValueError(f"Invalid presence value: {presence}")

                # Generate a unique ID within 32-bit integer range
                def generate_unique_id(timestamp):
                    # Use last 7 digits of timestamp (max 9999999) plus a random 3-digit number
                    timestamp_part = int(timestamp) % 10000000  # Up to 7 digits
                    random_part = random.randint(0, 999)   # 3 digits
                    # Combine: timestamp_part * 1000 + random_part (max ~9,999,999,999)
                    # Ensure it fits in 32-bit signed int (max 2,147,483,647)
                    unique_id = (timestamp_part * 1000 + random_part) % 2147483647
                    return unique_id if unique_id > 0 else 1  # Ensure non-zero

                # Try to find existing record with these keys
                try:
                    sensor_obj = SensorReading.objects.get(
                        time=thailand_dt,
                        sensor_id=sensor_id
                    )
                    
                    # Update specific fields based on sensor type
                    if sensor_type == 'iaq':
                        sensor_obj.temperature = temperature
                        sensor_obj.humidity = humidity
                        sensor_obj.co2 = co2
                    elif sensor_type == 'power':
                        sensor_obj.power = power
                    elif sensor_type == 'presence':
                        sensor_obj.presence = presence
                    
                    sensor_obj.save()
                    self.stdout.write(f"Updated sensor reading: time={thailand_dt}, floor={floor}, room={room}, sensor_type={sensor_type}, sensor_id={sensor_id}")
                
                except SensorReading.DoesNotExist:
                    # Create new record with explicitly generated ID
                    unique_id = generate_unique_id(timestamp)
                    sensor_obj = SensorReading.objects.create(
                        id=unique_id,
                        time=thailand_dt,
                        sensor_id=sensor_id,
                        temperature=temperature,
                        humidity=humidity,
                        co2=co2,
                        power=power,
                        presence=presence,
                        sensor_type=sensor_type,
                        floor=floor,
                        room=room
                    )
                    self.stdout.write(f"Inserted new sensor reading: time={thailand_dt}, floor={floor}, room={room}, sensor_type={sensor_type}, sensor_id={sensor_id}")

                # Sync to Supabase
                if sensor_obj:
                    print(f"About to sync sensor reading {sensor_obj.id} to Supabase")
                    supabase = SupabaseService()
                    supabase.sync_sensor_data(sensor_obj)
                    print(f"Supabase sync result for floor={floor}, room={room}, sensor_type={sensor_type}: {sensor_obj.id}")

            except Exception as e:
                self.stderr.write(f"Error processing message: {str(e)}")

        channel.basic_consume(queue='sensor_queue', on_message_callback=callback, auto_ack=True)
        self.stdout.write("Sensor consumer started, listening for messages...")
        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            self.stdout.write("Shutting down sensor consumer...")
            rabbitmq_connection.close()
        except Exception as e:
            self.stderr.write(f"Unexpected error in consumer: {e}")
            rabbitmq_connection.close()