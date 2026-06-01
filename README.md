# Remote Health Monitoring Tool

A health monitoring app built with React Native and Django.

## Project Structure

```
RHM/
├── frontend/          # React Native Expo app
│   ├── src/
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── assets/
└── backend/           # Django REST API
    ├── health_app/
    ├── rhmt_backend/
    ├── manage.py
    └── requirements.txt
```

## Quick Start

### Important Note:
**Always run the frontend from the `frontend/` directory!**

### Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create admin user (optional)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Expo
npm start

# Or run directly on web:
npm run web
```

## Troubleshooting

### Frontend Won't Load (500 Error)
1.  Make sure you're in the `frontend/` directory
2.  Delete the `.expo` folder and `node_modules` if you have issues, then reinstall dependencies

```bash
cd frontend
# If you need to reset:
rm -r .expo node_modules  # Windows: Remove-Item -Recurse .expo, node_modules
npm install
npm start
```

## Backend API

The Django backend runs at http://localhost:8000

API endpoints are at http://localhost:8000/api/
