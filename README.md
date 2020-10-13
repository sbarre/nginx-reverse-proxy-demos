# Nginx demos showing off a few key features

### Reverse Proxy

This is a standard configuration for Nginx, where it acts as a reverse proxy to a dynamic web application.

### Static Serving

Nginx acts as a reverse proxy to a dynamic web application but also directly serves all the static files

### Full Cache

Nginx acts as a reverse proxy to a dynamic web application and caches the complete output of the app on a specified interval

## Setting up

1. From the app-server folder, run `npm start` to start the Node app at http://localhost:3000/
2. In a separate terminal, from the root, run `docker-compose up` to start up the nginx docker containers (running on ports 8080, 8081 and 8082)
