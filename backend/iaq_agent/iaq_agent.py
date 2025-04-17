import pika
import time
import random
import json
import csv
import os

def connect_to_rabbitmq():
    rabbitmq_user = os.getenv('RABBITMQ_USER')
    rabbitmq_pass = os.getenv('RABBITMQ_PASS')
    rabbitmq_host = os.getenv('RABBITMQ_HOST')
    rabbitmq_port = int(os.getenv('RABBITMQ_PORT'))
    
    credentials = pika.PlainCredentials(rabbitmq_user, rabbitmq_pass)
    parameters = pika.ConnectionParameters(rabbitmq_host, rabbitmq_port, '/', credentials)
    for attempt in range(5):
        try:
            return pika.BlockingConnection(parameters)
        except pika.exceptions.AMQPConnectionError:
            now = int(time.time())
            print(f"{now} - Connection failed, retrying ({attempt + 1}/5)...", flush=True)
            time.sleep(2)
    raise Exception("Failed to connect to RabbitMQ after 5 attempts")

def main():
    # CSV setup - use environment variable with fallback
    csv_file_path = os.getenv('CSV_PATH', '/app/data/iaq_data.csv')  
    os.makedirs(os.path.dirname(csv_file_path), exist_ok=True)  
    
    # Initialize CSV file if it doesn’t exist
    if not os.path.exists(csv_file_path):
        with open(csv_file_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['timestamp', 'floor', 'room', 'temperature', 'humidity', 'co2'])
    
    # Open CSV file in append mode
    csv_file = open(csv_file_path, 'a', newline='')
    csv_writer = csv.writer(csv_file)
    print(f"CSV_PATH from environment: {os.getenv('CSV_PATH')}")
    print(f"Using csv_file_path: {csv_file_path}")

    # RabbitMQ setup
    connection = connect_to_rabbitmq()
    channel = connection.channel()
    channel.exchange_declare(exchange='hotel_sensors', exchange_type='topic')

    current_minute = None
    faulty_slot = None
    send_count = 0

    try:
        while True:
            timestamp = int(time.time())
            minute = timestamp // 60  

            if minute != current_minute:
                current_minute = minute
                faulty_slot = random.randint(0, 11)
                send_count = 0
                print(f"New minute {current_minute}, faulty slot is {faulty_slot}")

            floor = random.choice([f"floor{i}" for i in range(1, 4)])
            room = random.choice([f"room{i}" for i in range(1, 6)])
            routing_key = f"{floor}.{room}.iaq"

            is_faulty = (send_count == faulty_slot)

            if not is_faulty:
                data = {
                    'timestamp': timestamp,
                    'temperature': round(random.uniform(24.5, 33.0), 1),
                    'humidity': round(random.uniform(41.1, 51.5), 1),
                    'co2': round(random.uniform(464.0, 689.5), 1)
                }
            else:
                # Faulty data
                if random.choice([True, False]):
                    # All zeros
                    data = {
                        'timestamp': timestamp,
                        'temperature': 0.0,
                        'humidity': 0.0,
                        'co2': 0.0
                    }
                else:
                    # Out-of-range or partial zeros
                    temp = 0.0 if random.random() < 0.3 else round(random.uniform(40.0, 60.0), 1)
                    hum = 0.0 if random.random() < 0.3 else round(random.uniform(80.0, 100.0), 1)
                    co2 = 0.0 if random.random() < 0.3 else round(random.uniform(0.0, 1000.0), 1)
                    data = {
                        'timestamp': timestamp,
                        'temperature': temp,
                        'humidity': hum,
                        'co2': co2
                    }
            
            # Write to CSV
            csv_writer.writerow([timestamp, floor, room, data['temperature'], data['humidity'], data['co2']])
            csv_file.flush()

            # Publish to RabbitMQ
            payload = json.dumps(data)
            channel.basic_publish(exchange='hotel_sensors', routing_key=routing_key, body=payload.encode())
            print(f"{timestamp} - Sent to {routing_key}: {payload} {'(faulty)' if is_faulty else ''}", flush=True)

            send_count += 1

            time.sleep(5)
    
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        csv_file.close()
        connection.close()

if __name__ == "__main__":
    main()