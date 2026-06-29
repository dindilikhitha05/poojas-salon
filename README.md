# Pooja's Salon - Full-Stack Appointment Booking Web App

An elegant, mobile-friendly full-stack application for **Pooja's Salon** to book and manage appointments with conflict prevention, real-time statistics, and persistent database storage.

## Tech Stack
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+, REST API calls via `fetch`)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas, Mongoose
- **Security**: Helmet, CORS, Express-Rate-Limit, Morgan, Compression, Dotenv, Express Validator

---

## Project Structure
```
/
├── backend/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── controllers/
│   │   └── bookingController.js # API Logic (CRUD, stats, conflicts)
│   ├── middleware/
│   │   ├── errorHandler.js    # Centralized JSON error responses
│   │   └── validation.js      # Fields & phone validation
│   ├── models/
│   │   └── Booking.js         # Mongoose Schema for "bookings"
│   ├── routes/
│   │   └── bookings.js        # REST API endpoints mapping
│   ├── server.js              # Server entry point
│   ├── package.json           # Dependencies and scripts
│   └── .env                   # Local env variables
├── frontend/
│   ├── index.html             # Client UI
│   ├── style.css              # Premium styling
│   ├── app.js                 # API handler logic
│   └── vercel.json            # Vercel deployment routing
├── .gitignore                 # Files ignored in Git
└── README.md                  # Documentation
```

---

## API Documentation

### Bookings Endpoints
All routes are prefixed with `/api/bookings`.

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Get all bookings | `search` (name/phone), `date` (YYYY-MM-DD), `page`, `limit` |
| **GET** | `/date/:date` | Get bookings for one date sorted by time | None |
| **POST** | `/` | Create a booking | None (JSON body required) |
| **DELETE** | `/:id` | Cancel/Delete a booking by ID | None |

### Stats & Metrics (Bonus Features)
| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| **GET** | `/stats/dashboard` | Get daily summary stats (total, revenue, mins) | `date` (YYYY-MM-DD) (Required) |
| **GET** | `/stats/revenue` | Get cumulative revenue statistics | None |

---

## Setup & Running Locally

### Prerequisites
- Node.js (v16+)
- Local MongoDB or MongoDB Atlas cluster

### 1. Backend Setup
1. Open terminal and navigate to backend:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/poojas_salon
   CLIENT_URL=http://localhost:3000
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. In another terminal, navigate to frontend:
   ```bash
   cd frontend
   ```
2. Serve the static files (e.g. using `http-server`):
   ```bash
   npx http-server -p 3000
   ```
3. Open `http://localhost:3000` in your web browser.

---

## Validation & Conflict Prevention Logic
1. **Fields Validation**: Standard check for Name length (>=2 chars), Phone validation (regex checking for 8-15 digits), and service category mapping.
2. **Double Booking Prevention**:
   The backend prevents overlapping slots using the time interval overlap check:
   $$Start_{new} < End_{existing} \quad \text{AND} \quad Start_{existing} < End_{new}$$
   If any database entry matches this, the backend returns **HTTP 409 Conflict** with an error message, which is intercepted by the frontend.
3. **Closing Hour Validation**:
   Checks if the duration of the selected service extends beyond the closing hour (7:00 PM / 1140 minutes).
