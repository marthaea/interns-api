# Routes — URL Definitions

## What Route Files Do

Route files define **which URLs exist** and **which controller function handles each one**. They contain no logic — they are purely a map of URL + HTTP method → function.

All route files live in the `routes/` folder. Each file is mounted in `index.js` with a URL prefix using `app.use()`.

---

## How Routes Work in Express

```js
const router = require('express').Router();
```
Creates a mini Express application that handles only the routes for one resource (e.g. interns). This keeps each resource's routes isolated and organized.

```js
router.get('/:id', ctrl.getById);
```
- `router.get` → only responds to HTTP GET requests
- `'/:id'` → the URL pattern. `:id` is a **URL parameter** — a placeholder that captures whatever number is in that position. So a request to `/api/interns/7` sets `req.params.id = "7"`.
- `ctrl.getById` → the controller function to call

```js
module.exports = router;
```
Exports the router so `index.js` can import and mount it.

---

## Standard CRUD Routes (interns, supervisors, departments, universities)

Four of the five route files follow the exact same pattern. The only differences are the URL prefix and the controller being imported.

Here is the pattern, shown using `interns.js` as the example:

```
Mounted at: /api/interns (set in index.js)
```

| Method | Full URL | Pattern in file | Controller Function | What It Does |
|---|---|---|---|---|
| GET | `/api/interns` | `router.get('/')` | `ctrl.getAll` | Returns all interns |
| GET | `/api/interns/5` | `router.get('/:id')` | `ctrl.getById` | Returns intern with id=5 |
| POST | `/api/interns` | `router.post('/')` | `ctrl.create` | Creates a new intern |
| PUT | `/api/interns/5` | `router.put('/:id')` | `ctrl.update` | Updates intern with id=5 |
| DELETE | `/api/interns/5` | `router.delete('/:id')` | `ctrl.remove` | Deletes intern with id=5 |

The same table applies to:
- `/api/supervisors` → `routes/supervisors.js`
- `/api/departments` → `routes/departments.js`
- `/api/universities` → `routes/universities.js`

---

## Attendance Routes (routes/attendance.js)

The attendance route file is more complex because it handles clock-in/clock-out and reporting in addition to basic CRUD.

```
Mounted at: /api/attendance (set in index.js)
```

### Route Order Is Important

Express matches routes **top-to-bottom** and stops at the first match. Because `/:id` is a wildcard that matches anything, specific named routes (`/intern/:intern_id`, `/report/range`) must be registered **before** `/:id`. If they came after, they would never be reached.

### All Attendance Routes

```js
router.post('/clock-in', ctrl.clockIn);
```
`POST /api/attendance/clock-in`
Clocks an intern in. Body must contain `{ "intern_id": 5 }`. Inserts a new row with `clock_in = NOW()` and `clock_out = NULL`.

---

```js
router.put('/clock-out', ctrl.clockOut);
```
`PUT /api/attendance/clock-out`
Clocks an intern out. Body must contain `{ "intern_id": 5 }`. Finds the open session (where `clock_out IS NULL`) and sets `clock_out = NOW()`.

---

```js
router.get('/intern/:intern_id', ctrl.getByIntern);
```
`GET /api/attendance/intern/5`
Returns all attendance records for a specific intern. `:intern_id` captures the intern's ID from the URL and passes it as `req.params.intern_id`.

---

```js
router.get('/report/range', ctrl.getByDateRange);
```
`GET /api/attendance/report/range?start=2025-01-01&end=2025-01-31`
Returns all records within a date window. The dates are passed as **query parameters** (the `?key=value` part of the URL), not URL segments. These are read in the controller as `req.query.start` and `req.query.end`.

---

```js
router.get('/', ctrl.getAll);
```
`GET /api/attendance`
Returns every attendance record in the database, joined with intern names.

---

```js
router.get('/:id', ctrl.getById);
```
`GET /api/attendance/42`
Returns the single attendance record with that ID.

---

```js
router.delete('/:id', ctrl.remove);
```
`DELETE /api/attendance/42`
Deletes a specific attendance record (used for corrections).

---

## HTTP Methods Explained

| Method | When to Use |
|---|---|
| **GET** | Fetch data. Never modifies anything. |
| **POST** | Create a new record. Data goes in the request body. |
| **PUT** | Update an existing record. Replaces data. Data goes in the request body. |
| **DELETE** | Remove a record. Usually just needs the ID in the URL. |
