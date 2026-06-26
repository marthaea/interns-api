# Project Overview — CAA Interns Attendance API

## What This Project Is

This is a **REST API** (a backend server that responds to HTTP requests) built with **Node.js** and **Express**. It manages intern attendance for CAA — tracking clock-ins, clock-outs, interns, supervisors, departments, and universities.

It works like a Biostar attendance system: interns clock in when they arrive and clock out when they leave. The API records and stores those timestamps in a MySQL database.

---

## Technology Stack

| Tool | What It Does |
|---|---|
| **Node.js** | The JavaScript runtime — lets you run JS outside a browser |
| **Express** | A framework that makes building HTTP APIs much simpler |
| **MySQL** | The relational database that stores all data |
| **mysql2** | The Node.js driver that connects your code to MySQL |
| **dotenv** | Loads secret values (passwords, config) from a `.env` file |
| **nodemon** | Dev tool — auto-restarts the server whenever you save a file |

---

## Folder Structure

```
caainterns/
│
├── index.js                        ← Entry point. Starts the server.
├── db.js                           ← Creates the MySQL connection pool.
├── package.json                    ← Project config and dependencies.
├── .env                            ← Secret config values (never commit this).
├── .env.example                    ← Template showing what .env should contain.
├── .gitignore                      ← Tells Git which files to ignore.
│
├── controllers/                    ← WHERE THE LOGIC LIVES
│   ├── attendanceController.js     ← Clock-in, clock-out, reports
│   ├── internsController.js        ← CRUD for interns
│   ├── supervisorsController.js    ← CRUD for supervisors
│   ├── departmentsController.js    ← CRUD for departments
│   └── universitiesController.js   ← CRUD for universities
│
├── routes/                         ← WHERE URLS ARE DEFINED
│   ├── attendance.js               ← /api/attendance URLs
│   ├── interns.js                  ← /api/interns URLs
│   ├── supervisors.js              ← /api/supervisors URLs
│   ├── departments.js              ← /api/departments URLs
│   └── universities.js             ← /api/universities URLs
│
└── docs/                           ← THIS FOLDER — project documentation
    ├── overview.md                 ← You are here
    ├── index.md                    ← index.js explained
    ├── database.md                 ← db.js explained
    ├── environment.md              ← .env and .env.example explained
    ├── routes.md                   ← All route files explained
    └── controllers.md              ← All controller files explained
```

---

## How a Request Travels Through the App

Every request from Postman (or a frontend) follows this exact path:

```
Postman / Frontend
       │
       ▼
  [ index.js ]          ← Receives the request, decides which router handles it
       │
       ▼
  [ routes/*.js ]        ← Matches the URL and HTTP method (GET, POST, etc.)
       │
       ▼
  [ controllers/*.js ]   ← Runs the actual logic (queries the database)
       │
       ▼
  [ db.js ]              ← Talks to MySQL, returns data
       │
       ▼
  Response (JSON)        ← Sent back to Postman / Frontend
```

---

## Database Tables

The database has 5 tables. Here is how they relate to each other:

```
university          department          supervisors
    │                   │                   │
    └──────────┐ ┌──────┘         ┌─────────┘
               ▼ ▼                ▼
              intern  ◄──────────────
                │
                ▼
           attendance
```

- An **intern** belongs to one university, one department, and one supervisor.
- **Attendance** records belong to one intern (one row per clock-in/clock-out session).
- **University**, **department**, and **supervisors** are independent lookup tables.

---

## Available API Endpoints (Summary)

| Method | URL | What It Does |
|---|---|---|
| GET | `/api/interns` | List all interns |
| GET | `/api/interns/:id` | Get one intern |
| POST | `/api/interns` | Create an intern |
| PUT | `/api/interns/:id` | Update an intern |
| DELETE | `/api/interns/:id` | Delete an intern |
| POST | `/api/attendance/clock-in` | Clock an intern in |
| PUT | `/api/attendance/clock-out` | Clock an intern out |
| GET | `/api/attendance` | All attendance records |
| GET | `/api/attendance/:id` | One attendance record |
| GET | `/api/attendance/intern/:intern_id` | All records for one intern |
| GET | `/api/attendance/report/range?start=&end=` | Records in a date range |
| DELETE | `/api/attendance/:id` | Delete a record |
| GET/POST/PUT/DELETE | `/api/departments` | Manage departments |
| GET/POST/PUT/DELETE | `/api/universities` | Manage universities |
| GET/POST/PUT/DELETE | `/api/supervisors` | Manage supervisors |
