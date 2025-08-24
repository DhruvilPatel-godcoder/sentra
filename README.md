# SENTRA1: Smart Traffic Violation Management System

SENTRA1 is a full-stack platform for automated traffic violation detection, user management, and payment processing.  
It combines a Django backend (with AI/ML modules), a React user portal, and a React admin dashboard.

---

## Project Structure

```
sentra1/
│
├── server/      # Django backend (API, AI detection, admin, user management)
│
├── user/        # React frontend for citizens (users)
│
└── admin/       # React frontend for administrators
```

---

## Features

- **AI-powered Helmet & Plate Detection** (YOLOv8, custom models)
- **Automated Violation Logging** and Evidence Storage
- **User Portal**: View violations, pay fines, manage vehicles
- **Admin Dashboard**: Live camera feed, detection review, statistics
- **Secure Authentication** for users and admins
- **Document Management** (PUC, RC, etc.)
- **Payment Integration** (UPI, Card, Net Banking)
- **Dispute Resolution** and History Tracking

---

## Getting Started

### 1. Clone the Repository

```sh
git clone https://github.com/YOUR_GITHUB_USERNAME/sentra1.git
cd sentra1
```

---

### 2. Backend Setup (`server/`)

#### Install dependencies

```sh
cd server
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

#### Set up environment

- Configure your MongoDB and Django settings in `server/server/settings.py`
- (Optional) Set up `.env` for secrets

#### Run migrations and start server

```sh
python manage.py migrate
python manage.py runserver
```

---

### 3. User Portal (`user/`)

```sh
cd ../user
npm install
npm start
```
- Runs at [http://localhost:3000](http://localhost:3000)

---

### 4. Admin Dashboard (`admin/`)

```sh
cd ../admin
npm install
npm start
```
- Runs at [http://localhost:3001](http://localhost:3001) (or next available port)

---

## AI Detection

- YOLOv8 models and custom weights are stored in `server/livedetection/weights/`
- Training scripts and data in `server/livedetection/training/` and `server/livedetection/data/`
- To retrain or validate models, see `server/livedetection/ai_models/helmet_detector.py` and `training/model_trainer.py`

---

## Folder Details

- **server/**: Django project with multiple apps:
  - `livedetection/` (AI detection, helmet/plate models)
  - `livefeed/` (camera streams, live detections)
  - `userpayments/`, `userdashboard/`, `uservehicles/`, etc.
  - `documents/`, `penalty/`, `userdisputes/`, etc.
- **user/**: React app for citizens (login, dashboard, payments, disputes)
- **admin/**: React app for admins (live feed, detection review, penalty management)

---

## Development Notes

- Python 3.11+, Node.js 18+ recommended
- MongoDB required for detection/violation storage
- For AI detection, GPU recommended but not required
- See each subfolder’s `README.md` for more details

---

## License

This project is for educational and demonstration purposes.  
For production/commercial use, please contact the authors.

---

## Authors

- Dhruvil Patel

---

## Screenshots

_Add screenshots or GIFs of the dashboard, detection, and user portal here!_
