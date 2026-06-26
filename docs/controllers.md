# Controllers — Business Logic

## What Controllers Do

Controllers contain the **actual logic** for each route. When a request arrives, the route file says "hand this to controller function X", and the controller:

1. Reads data from the request (`req.body`, `req.params`, `req.query`)
2. Validates that required fields exist
3. Runs a SQL query via `db.query()`
4. Sends a JSON response back

All controller functions follow the same `async/await` + `try/catch` pattern.

---

## The async / await / try / catch Pattern

Every controller function looks like this:

```js
exports.someFunction = async (req, res) => {
  try {
    // database work here — await pauses until the DB responds
    const [rows] = await db.query('SELECT ...');
    res.json(rows);
  } catch (err) {
    // if anything fails, send a clean error instead of crashing
    res.status(500).json({ error: err.message });
  }
};
```

- `async` — marks the function as asynchronous (it will perform waiting operations)
- `await` — pauses execution on that line until the database responds, then continues
- `try` — attempt the database work
- `catch (err)` — if anything goes wrong (bad query, lost connection, etc.), send a 500 error response instead of crashing the whole server

---

## SQL Injection Prevention — Parameterized Queries

All queries use `?` placeholders instead of string concatenation:

```js
// SAFE — mysql2 escapes the value before inserting it
await db.query('SELECT * FROM intern WHERE id = ?', [req.params.id]);

// DANGEROUS (never do this) — attacker could inject SQL via the URL
await db.query(`SELECT * FROM intern WHERE id = ${req.params.id}`);
```

The second argument (the array) is passed separately. The `mysql2` driver escapes every value before putting it into the query, making SQL injection impossible.

---

## Standard CRUD Controllers (interns, supervisors, departments, universities)

Three controllers — `supervisorsController.js`, `departmentsController.js`, and `universitiesController.js` — follow the same structure. `internsController.js` follows the same structure but adds JOIN queries because interns are linked to other tables.

### getAll

```js
exports.getAll = async (req, res) => {
  const [rows] = await db.query('SELECT ...');
  res.json(rows);
};
```
Runs a SELECT query, returns all rows as a JSON array.

For **interns**, the query uses `LEFT JOIN` to attach the department name and university name to each intern row — so the response includes readable names instead of just IDs:

```sql
SELECT i.*, d.name AS department_name, u.name AS university_name
FROM intern i
LEFT JOIN department d ON i.department_id = d.id
LEFT JOIN university  u ON i.university_id  = u.id
```

For **supervisors**, **departments**, and **universities**, the query uses `COUNT()` and `GROUP BY` to include how many interns belong to each:

```sql
SELECT d.*, COUNT(i.id) AS intern_count
FROM department d
LEFT JOIN intern i ON i.department_id = d.id
GROUP BY d.id
```

- `COUNT(i.id)` — counts intern rows matched by the join
- `LEFT JOIN` — includes departments even if they have zero interns (count would be 0)
- `GROUP BY d.id` — collapses the joined rows back into one row per department

---

### getById

```js
exports.getById = async (req, res) => {
  const [rows] = await db.query('SELECT ... WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
};
```

- `req.params.id` — captures the number from the URL (e.g. `/api/interns/7` → `id = "7"`)
- `rows[0]` — the first (and only expected) result
- If no row found, `rows` is an empty array, so `!rows[0]` is true — returns 404

For **supervisors**, **departments**, and **universities**, `getById` runs a second query to fetch the list of interns belonging to that record, then combines both into one response:

```js
const [dept] = await db.query('SELECT * FROM department WHERE id = ?', [req.params.id]);
const [interns] = await db.query('SELECT id, first_name, last_name, email FROM intern WHERE department_id = ?', [req.params.id]);
res.json({ ...dept[0], interns });
```

`{ ...dept[0], interns }` uses the **spread operator** to merge the department object with the interns array into one combined response object.

---

### create (POST)

```js
exports.create = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const [result] = await db.query('INSERT INTO department (name) VALUES (?)', [name]);
  res.status(201).json({ message: 'Created', department_id: result.insertId });
};
```

- `req.body` — the JSON data sent in the POST request body
- Validation checks that required fields are present; missing fields return 400 (Bad Request)
- `INSERT INTO` adds a new row
- `result.insertId` — the auto-generated `id` of the newly created row (returned by MySQL)
- `201` — HTTP status for "Created" (vs 200 which means "OK")

For **interns**, more fields are required and included:

```js
const { first_name, last_name, email, phone, department_id, university_id, supervisor_id } = req.body;
```

---

### update (PUT)

```js
exports.update = async (req, res) => {
  const { name } = req.body;
  await db.query('UPDATE department SET name = ? WHERE id = ?', [name, req.params.id]);
  res.json({ message: 'Updated successfully' });
};
```

- `UPDATE ... SET` modifies existing rows
- `WHERE id = ?` ensures only the targeted row is changed
- The last value in the array matches the last `?` placeholder (the WHERE clause)

---

### remove (DELETE)

```js
exports.remove = async (req, res) => {
  await db.query('DELETE FROM department WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted successfully' });
};
```

Straightforward — deletes the row with the matching ID.

---

## Attendance Controller (attendanceController.js)

This is the most complex controller. It handles the core biostar-style feature.

---

### getAll

```js
SELECT
  a.*,
  i.first_name,
  i.last_name,
  TIMESTAMPDIFF(MINUTE, a.clock_in, a.clock_out) AS minutes_worked
FROM attendance a
JOIN intern i ON a.intern_id = i.id
ORDER BY a.clock_in DESC
```

- `JOIN intern` — attaches the intern's name to each attendance record
- `TIMESTAMPDIFF(MINUTE, a.clock_in, a.clock_out)` — MySQL function that calculates how many minutes elapsed between two datetime values. Returns `NULL` if `clock_out` is NULL (intern still clocked in)
- `ORDER BY a.clock_in DESC` — newest records first

---

### getById

Same as `getAll` but with `WHERE a.id = ?` to return a single record.

---

### clockIn

```js
exports.clockIn = async (req, res) => {
  const { intern_id } = req.body;

  // Step 1: Check for an already-open session
  const [existing] = await db.query(
    'SELECT id FROM attendance WHERE intern_id = ? AND clock_out IS NULL',
    [intern_id]
  );

  // Step 2: If found, reject — can't clock in twice
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Intern is already clocked in.' });
  }

  // Step 3: Insert a new row with clock_in = NOW()
  const [result] = await db.query(
    'INSERT INTO attendance (intern_id, clock_in) VALUES (?, NOW())',
    [intern_id]
  );

  res.status(201).json({ message: 'Clocked in successfully', attendance_id: result.insertId });
};
```

Key points:
- `clock_out IS NULL` — a row with no clock_out means the intern is currently inside
- `409 Conflict` — the HTTP status for "the request conflicts with current state" (used when the intern is already clocked in)
- `NOW()` — MySQL function that returns the current date and time at the moment the query runs
- `clock_out` is not inserted here — it is left as `NULL` and filled in on clock-out

---

### clockOut

```js
exports.clockOut = async (req, res) => {
  const { intern_id } = req.body;

  // Step 1: Find the open session
  const [existing] = await db.query(
    'SELECT id FROM attendance WHERE intern_id = ? AND clock_out IS NULL',
    [intern_id]
  );

  // Step 2: If no open session, they aren't clocked in
  if (existing.length === 0) {
    return res.status(409).json({ error: 'No active clock-in found.' });
  }

  // Step 3: Close the session by setting clock_out = NOW()
  await db.query(
    'UPDATE attendance SET clock_out = NOW() WHERE intern_id = ? AND clock_out IS NULL',
    [intern_id]
  );

  // Step 4: Fetch the completed record to return duration
  const [completed] = await db.query(
    'SELECT *, TIMESTAMPDIFF(MINUTE, clock_in, clock_out) AS minutes_worked FROM attendance WHERE id = ?',
    [existing[0].id]
  );

  res.json({ message: 'Clocked out successfully', minutes_worked: completed[0].minutes_worked });
};
```

The process mirrors clock-in in reverse. After updating, a second query fetches the completed row to calculate and return `minutes_worked` in the response.

---

### getByIntern

```js
SELECT a.*, TIMESTAMPDIFF(MINUTE, a.clock_in, a.clock_out) AS minutes_worked
FROM attendance a
WHERE a.intern_id = ?
ORDER BY a.clock_in DESC
```

After fetching, the controller also calculates **total minutes** across all sessions in JavaScript:

```js
const totalMinutes = rows.reduce((sum, row) => sum + (row.minutes_worked || 0), 0);
```

- `reduce()` loops over all rows, accumulating a running total
- `|| 0` handles `NULL` values (open sessions with no clock_out) by treating them as 0

The response includes the individual records and the aggregate total:

```json
{
  "intern_id": "5",
  "total_sessions": 12,
  "total_minutes": 2940,
  "records": [...]
}
```

---

### getByDateRange

```sql
WHERE DATE(a.clock_in) BETWEEN ? AND ?
```

- `DATE(a.clock_in)` — extracts just the date portion from a datetime value (strips the time)
- `BETWEEN ? AND ?` — standard SQL for "value is >= start AND <= end"
- The `?` placeholders receive `start` and `end` from `req.query` (the `?start=&end=` URL parameters)

The response wraps the records with metadata:

```json
{
  "from": "2025-01-01",
  "to": "2025-01-31",
  "count": 47,
  "records": [...]
}
```

---

## HTTP Status Codes Used

| Code | Meaning | When Used |
|---|---|---|
| `200` | OK | Default for successful GET/PUT/DELETE |
| `201` | Created | After a successful POST (new record made) |
| `400` | Bad Request | Missing required fields in the request body |
| `404` | Not Found | The requested ID does not exist in the database |
| `409` | Conflict | Clocking in when already clocked in (or vice versa) |
| `500` | Internal Server Error | Unexpected database error caught by `catch` |
