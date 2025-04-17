
# Building Management System

This project provides a dashboard for monitoring and managing building sensors across multiple floors, with features for tracking faults, analyzing sensor data, and managing rooms.

## Project info

**URL**: https://lovable.dev/projects/17f8ce5c-90ce-42e6-b074-65c55b2b8093

## How to Run

### Using Docker (Recommended)

The easiest way to run this application is using Docker:

```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd <REPOSITORY_NAME>

# Using Docker Compose (recommended)
docker-compose up

# Or using Docker directly
docker build -t building-management-system .
docker run -p 8080:80 building-management-system
```

The application will be available at: http://localhost:8080

### Running Locally

If you prefer to run the application without Docker:

```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd <REPOSITORY_NAME>

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at: http://localhost:8080

## Features

- **Floor Management**: View and monitor all rooms across multiple floors
- **Real-time Monitoring**: Track sensor status and metrics
- **Fault Detection**: Automatically identify and report sensor anomalies
- **Data Analysis**: Analyze sensor data trends over time
- **User Authentication**: Secure login system

## Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # External service integrations (Supabase)
│   ├── lib/             # Utility functions
│   ├── pages/           # Page components
│   └── utils/           # Helper utilities
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
└── nginx.conf           # Nginx configuration for production
```

## Technologies Used

- React with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- shadcn/ui component library
- React Router for navigation
- Recharts for data visualization
- Supabase for backend functionality

## Deployment

### Custom Domain Setup

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
