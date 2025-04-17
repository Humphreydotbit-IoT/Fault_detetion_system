import pika
import json
import time
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

def detect_and_prepare_fault(message, routing_key):
    timestamp = int(time.time())
    floor, room, sensor_type = routing_key.split('.')  # e.g., floor1.room1.iaq|.power|.presence
    
    fault_flags = 0
    fault_labels = []
    fault_details = []
    
    if sensor_type == 'iaq':
        temp = message['temperature']
        hum = message['humidity']
        co2 = message['co2']
        
        if temp == 0 and hum == 0 and co2 == 0:
            fault_flags |= FAULT_SENSOR_NOT_WORKING
            fault_labels.append("Sensor Not Working")
            fault_details.append("all values 0")
            fault_payload = {'timestamp': timestamp, 'fault_flags': fault_flags}
            return f"{timestamp} - FAULT DETECTED at {floor}.{room}: {fault_labels[0]} ({fault_details[0]})", fault_payload, f"{floor}.{room}.fault"
        
        zeros = sum(1 for x in [temp, hum, co2] if x == 0)
        non_zeros = sum(1 for x in [temp, hum, co2] if x != 0)
        if zeros > 0 and non_zeros > 0:
            fault_flags |= FAULT_CALIBRATION_ERROR
            fault_labels.append("Calibration Error")
            fault_details.append(f"temp={temp}, hum={hum}, co2={co2}")
            fault_payload = {'timestamp': timestamp, 'fault_flags': fault_flags}
            return f"{timestamp} - FAULT DETECTED at {floor}.{room}: {fault_labels[0]} ({fault_details[0]})", fault_payload, f"{floor}.{room}.fault"
        
        conditions = [
            (temp > 35, FAULT_TEMP_HIGH, 'Temperature High', f'temp={temp}'),
            (hum > 60, FAULT_HUM_HIGH, 'Humidity High', f'hum={hum}'),
            (co2 < 200, FAULT_CO2_LOW, 'CO2 Low', f'co2={co2}'),
            (co2 > 800, FAULT_CO2_HIGH, 'CO2 High', f'co2={co2}')
        ]
        
        for condition, flag, label, detail in conditions:
            if condition:
                fault_flags |= flag
                fault_labels.append(label)
                fault_details.append(detail)
    
    elif sensor_type == 'power':
        power_kw = message['power_kw']
        
        conditions = [
            (power_kw == 0.0, FAULT_POWER_NOT_WORKING, 'Power Not Working', f'power_kw={power_kw}'),
            (power_kw > 45.0, FAULT_POWER_SPIKE, 'Power Spike', f'power_kw={power_kw}')
        ]
        
        for condition, flag, label, detail in conditions:
            if condition:
                fault_flags |= flag
                fault_labels.append(label)
                fault_details.append(detail)
    
    elif sensor_type == 'presence':
        presence = message['presence']
        
        conditions = [
            (presence == 3, FAULT_PRESENCE_NOT_READING, 'Presence Not Reading', f'presence={presence}')
        ]
        
        for condition, flag, label, detail in conditions:
            if condition:
                fault_flags |= flag
                fault_labels.append(label)
                fault_details.append(detail)
    
    if fault_flags:
        fault_payload = {'timestamp': timestamp, 'fault_flags': fault_flags}
        return f"{timestamp} - FAULT DETECTED at {floor}.{room}: {', '.join(fault_labels)} ({', '.join(fault_details)})", fault_payload, f"{floor}.{room}.fault"
    return f"{timestamp} - No fault detected at {floor}.{room}", None, None

def callback(ch, method, properties, body, csv_writer, csv_file):
    message = json.loads(body.decode())
    routing_key = method.routing_key
    log_message, fault_payload, fault_routing_key = detect_and_prepare_fault(message, routing_key)
    
    print(f"{log_message}\n\n", flush=True)
    
    # Write to CSV using the passed writer
    floor, room, _ = routing_key.split('.')
    fault_flags = fault_payload['fault_flags'] if fault_payload else 0
    timestamp = int(time.time())
    csv_writer.writerow([timestamp, floor, room, fault_flags])
    csv_file.flush()

    
    if fault_payload:
        payload_str = json.dumps(fault_payload)
        ch.basic_publish(
            exchange='fault_notifications',
            routing_key=fault_routing_key,
            body=payload_str.encode()
        )
        print(f"{fault_payload['timestamp']} - Published fault to {fault_routing_key}: {payload_str}\n\n", flush=True)
    
    ch.basic_ack(delivery_tag=method.delivery_tag)

def main():
    # CSV setup - open once
    csv_file_path = os.getenv('CSV_PATH', '/app/data/faults.csv')  
    os.makedirs(os.path.dirname(csv_file_path), exist_ok=True)
    if not os.path.exists(csv_file_path):
        os.makedirs(os.path.dirname(csv_file_path), exist_ok=True)  
        with open(csv_file_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['timestamp', 'floor', 'room', 'fault_flags'])
    
    csv_file = open(csv_file_path, 'a', newline='')
    csv_writer = csv.writer(csv_file)

    # RabbitMQ setup
    connection = connect_to_rabbitmq()
    channel = connection.channel()

    channel.exchange_declare(exchange='fault_notifications', exchange_type='topic')
    channel.exchange_declare(exchange='hotel_sensors', exchange_type='topic')
    channel.queue_declare(queue='test_queue', durable=True)
    channel.queue_declare(queue='fault_queue', durable=True)

    # Bind to all floor.room.sensor messages
    channel.queue_bind(exchange='hotel_sensors', queue='test_queue', routing_key='*.#.*')
    channel.queue_bind(exchange='fault_notifications', queue='fault_queue', routing_key='*.#.fault')

    # Pass csv_writer and csv_file to callback
    channel.basic_consume(
        queue='test_queue',
        on_message_callback=lambda ch, method, properties, body: callback(ch, method, properties, body, csv_writer, csv_file)
    )

    start_time = int(time.time())
    print(f"{start_time} - Started fault detection agent, waiting for messages...\n\n", flush=True)
    
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        csv_file.close()
        connection.close()

if __name__ == "__main__":
    main()