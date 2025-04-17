# Hotel AFDD System

## Automatic Fault Detection and Diagnostic System for Hotel IoT Devices

This project implements a comprehensive system for monitoring IoT devices in hotel rooms, automatically detecting faults based on sensor data, and providing real-time alerts and visualizations.

## System Overview

The Hotel AFDD system consists of:

- **IoT Sensor Simulation**: Python agents generating realistic sensor data
- **Fault Detection Engine**: Real-time analysis of sensor values against thresholds
- **Backend**: Django application with TimescaleDB for time-series data storage
- **Frontend**: React-based dashboard with real-time updates via Supabase

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Running the System

1. Clone the repository:
```bash
git clone https://github.com/Humphreydotbit-IoT/Fault_detetion_system.git
cd Fault_detetion_system
```

2. Start both backend and frontend containers:
```bash
docker-compose up -d
```

3. Start the consumer processes for fault and sensor data:
```bash
docker exec -it django_backend_hotel_FDPJ python manage.py consume_faults
docker exec -it django_backend_hotel_FDPJ python manage.py consume_sensors
```

4. Access the application:
   - Frontend Dashboard: http://localhost:8080

## Project Structure

- **backend/**: Contains the Django application, TimescaleDB integration, and Python sensor agents
  - `django_backend/`: Django project files
  - `iaq_agent/`: Indoor Air Quality sensor simulation
  - `power_agent/`: Power meter sensor simulation
  - `presence_agent/`: Occupancy sensor simulation
  - `fault_detection_agent/`: Fault detection and analysis

- **frontend/**: React application with Supabase integration for real-time updates
  - src/components/: UI components (FloorRoomCard, FaultCard, SensorCard, etc.)
  - src/pages/: Main application pages (Dashboard, Floor, Analysis, etc.)
  - src/hooks/: Custom React hooks for data and state management
  - src/integrations/: Supabase client and database type definitions
  - src/utils/: Helper utilities and functions

## Key Features

- **Real-time Sensor Monitoring**: Live tracking of temperature, humidity, CO2, power, and occupancy
- **Automatic Fault Detection**: Configurable thresholds and fault detection logic
- **Fault Severity Classification**: Prioritization of alerts based on severity (1-3)
- **Interactive Dashboard**: Visual monitoring of all hotel rooms and their status
- **Trend Analysis**: Historical data visualization and analysis
- **Fault Management**: Tools for acknowledging and resolving detected faults

## Architecture

The system uses an event-driven architecture with RabbitMQ as the message bus. Sensor data flows through the system as follows:

1. Sensor agents publish data to RabbitMQ
2. Fault detection agent analyzes incoming sensor data
3. Django backend stores data in TimescaleDB and syncs to Supabase
4. Frontend subscribes to real-time updates via Supabase

## Documentation

For detailed documentation, please see the [Wiki](https://github.com/Humphreydotbit-IoT/Fault_detetion_system/wiki).

## Technologies Used

- **Backend**:
  - Django
  - TimescaleDB (PostgreSQL extension for time-series data)
  - RabbitMQ
  - Supabase
  - Python

- **Frontend**:
  - React
  - TypeScript
  - Tailwind CSS
  - Supabase Client for real-time updates


## Acknowledgments

This project was developed as a technical test implementation of an Automatic Fault Detection and Diagnostic system.

## Demonstration Video Link

https://youtu.be/H3LdyvKNdpw
