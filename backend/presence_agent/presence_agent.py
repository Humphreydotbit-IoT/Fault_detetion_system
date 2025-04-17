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
    # CSV setup - open once
    csv_file_path = os.getenv('CSV_PATH', '/app/data/presence_data.csv')  # Default to current dir
    os.makedirs(os.path.dirname(csv_file_path), exist_ok=True)
    if not os.path.exists(csv_file_path):
        with open(csv_file_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['timestamp', 'floor', 'room', 'presence'])
    
    csv_file = open(csv_file_path, 'a', newline='')
    csv_writer = csv.writer(csv_file)

    # RabbitMQ setup
    connection = connect_to_rabbitmq()
    channel = connection.channel()
    channel.exchange_declare(exchange='hotel_sensors', exchange_type='topic')

    floors = [f"floor{i}" for i in range(1, 4)]
    rooms = [f"room{i}" for i in range(1, 6)]

    current_minute = None
    faulty_slot = None
    send_count = 0

    try:
        while True:
            timestamp = int(time.time())
            minute = timestamp // 60  

            # Check if we've entered a new minute
            if minute != current_minute:
                current_minute = minute
                # Randomly select one of the 12 slots (0 to 11) in the minute to be faulty
                faulty_slot = random.randint(0, 11)
                send_count = 0
                print(f"New minute {current_minute}, faulty slot is {faulty_slot}")

            floor = random.choice(floors)
            room = random.choice(rooms)
            routing_key = f"{floor}.{room}.presence"

            # Determine if this is the faulty slot
            is_faulty = (send_count == faulty_slot)

            if is_faulty:
                # Faulty data: not reading
                presence = 3
            else:
                # Normal data
                presence = random.choice([0, 1])
            
            data = {'timestamp': timestamp, 'presence': presence}
            
            csv_writer.writerow([timestamp, floor, room, data['presence']])
            csv_file.flush()
            
            payload = json.dumps(data)
            channel.basic_publish(exchange='hotel_sensors', routing_key=routing_key, body=payload.encode())
            print(f"{timestamp} - Sent to {routing_key}: {payload} {'(faulty)' if is_faulty else ''}", flush=True)

            # Increment send count
            send_count += 1

            # Sleep for 5 seconds
            time.sleep(5)
    
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        csv_file.close()
        connection.close()

if __name__ == "__main__":
    main()