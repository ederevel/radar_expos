![lunch workflow](https://github.com/ederevel/lunch/actions/workflows/deploy.yml/badge.svg)

# Face memory

## Local deployment for development

### FastAPI Server

```bash
# Install cmake
sudo apt install cmake poppler-utils

# Set up venv
cd server
virtualenv venv
source venv/bin/activate
pip install -r requirements.txt

# Launch server
uvicorn main:app --reload
```

### React + Vite Client
Proxy is managed by Vite in vite.config.js

```bash
# Set up venv
cd client
npm install

# Launch server
npm run dev
```

## Docker deployment

Proxy is managed by nginx.conf (warning: using docker locally the front is calling the back from localhost:3000 while in production from ec2_ip:3000 ?)

```bash
# after git cloning
cd face_memory
# --build to build the images in docker-compose.yml and -d to restart in background (use this command after each update)
docker-compose up -d --build 
docker-compose up -d --build backend # for a specific container
# get logs
docker-compose logs -f
docker-compose logs -f backend  # for a specific container
# to stop containers
docker-compose stop
# to restart them
docker-compose start
# to stop and remove all containers (you will need to rebuild them)
docker-compose down
# list all containers
docker ps -a
# list running containers only
docker ps
```