# Smart Energy Meter Backend

This is the FastAPI backend for the Smart Energy Meter project.

## Setup and Running

### 1. Prerequisites
- Python 3.10+
- `pip`

### 2. Environment Configuration
Ensure you have a `.env` file in this directory with the following variables:
```env
FIREBASE_DATABASE_URL="your-firebase-database-url"
```
Place your Firebase `serviceaccount.json` in this directory.

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python main.py
```
The server will start at `http://localhost:8000`.

## API Documentation
Once the server is running, you can access the interactive API docs at:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
