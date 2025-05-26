# Exam Chat

A real-time chat application for internal use, built with Django, Django Channels, PostgreSQL, and Redis.

## Features

- User registration and JWT authentication
- Real-time messaging with WebSockets
- Group and private chats
- File sharing in chat
- REST API for user and group management

## Prerequisites

- Python 3.10+
- Docker (for PostgreSQL and Redis)
- Node.js (optional, for frontend development)

## Setup Instructions

### 1. Clone the repository

```sh
git clone https://github.com/Robben1972/API.git
cd API
```

### 2. Start PostgreSQL and Redis using Docker

```sh
# Start PostgreSQL
sudo docker run -e POSTGRES_DB=project -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD="2006" -p 5432:5432 -d postgres

# Start Redis
sudo docker run -p 6379:6379 redis
```

### 3. Create and activate a Python virtual environment

```sh
python3 -m venv venv
source venv/bin/activate
```

### 4. Install dependencies

```sh
pip install -r requirements.txt
```

### 5. Apply database migrations

```sh
python3 manage.py makemigrations
python3 manage.py migrate
```

### 6. Run the ASGI server

```sh
uvicorn core.asgi:application --host 127.0.0.1 --port 8000
```

### 7. Access the application

- Open [http://localhost:8000](http://localhost:8000) for the backend API.
- Open `chat-app/index.html` or `chat-app/chat.html` in your browser for the frontend.

## Project Structure

- `core/` - Django project settings and ASGI/WSGI entrypoints
- `users/` - User management (registration, login, models)
- `chat/` - Chat groups, messages, and WebSocket consumers
- `chat-app/` - Frontend HTML/JS files

## Useful Commands

- Create superuser:  
  ```sh
  python3 manage.py createsuperuser
  ```
- Run tests:  
  ```sh
  python3 manage.py test
  ```

## Notes

- Make sure Docker containers for PostgreSQL and Redis are running before starting the server.
- Default credentials for PostgreSQL are set in the Docker command and `core/settings.py`.
- Media files (uploads) are stored in the `media/` directory.
