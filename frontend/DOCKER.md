
# Docker Setup Guide

This document provides detailed information about the Docker setup for this project.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (optional but recommended)

## Docker Configuration

The project uses a multi-stage build process to create an optimized Docker image:

1. **Build Stage**: Uses Node.js to build the React application
2. **Production Stage**: Uses Nginx to serve the built static files

### Dockerfile Explanation

```dockerfile
# Build stage uses Node.js to compile the application
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage uses Nginx to serve the compiled files
FROM nginx:alpine as production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

The `nginx.conf` file configures Nginx to:
- Serve static files from the `/usr/share/nginx/html` directory
- Handle SPA routing by redirecting all routes to `index.html`
- Set appropriate caching headers for static assets

## Running with Docker

### Using Docker Compose (Recommended)

```bash
# Start the application
docker-compose up

# Run in detached mode
docker-compose up -d

# Stop the application
docker-compose down
```

### Using Docker Directly

```bash
# Build the image
docker build -t building-management-system .

# Run the container
docker run -p 8080:80 building-management-system

# Run in detached mode
docker run -d -p 8080:80 building-management-system
```

## Environment Variables

To pass environment variables to the container, you can:

1. Add them to the `docker-compose.yml` file:
```yaml
services:
  app:
    # ... other configuration
    environment:
      - VITE_API_URL=https://api.example.com
      - VITE_DEBUG=true
```

2. Or when using Docker directly:
```bash
docker run -p 8080:80 -e VITE_API_URL=https://api.example.com building-management-system
```

## Development with Docker

For development with hot-reloading, you can create a development-specific Docker Compose file:

```yaml
version: '3.8'

services:
  app-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./src:/app/src
    environment:
      - NODE_ENV=development
```

## Troubleshooting

If you encounter issues:

1. Check container logs: `docker logs <container_id>`
2. Verify the container is running: `docker ps`
3. Check for build errors: `docker-compose logs app`
4. Ensure ports are not in use by other applications
