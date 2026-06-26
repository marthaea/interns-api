# db.js — Database Connection

## What This File Does

`db.js` creates a single shared **connection pool** to your MySQL database and exports it so every controller can use it.

It is imported in every controller file with:
```js
const db = require('../db');
```

---

## What Is a Connection Pool?

A connection pool is a set of reusable database connections kept open and ready to use.

**Without a pool (bad approach):**
- Every request opens a new connection → waits for it → runs the query → closes the connection
- Opening connections is slow and expensive
- Under high traffic this collapses

**With a pool (what we use):**
- The pool opens 10 connections when the server starts
- Each request borrows one from the pool, uses it, and returns it
- Much faster — no setup time per request

Think of it like a taxi rank: taxis wait ready. You grab one, use it, return it — rather than ordering a new car each time.

---

## Line-by-Line Breakdown

```js
const mysql = require('mysql2/promise');
```
Imports the `mysql2` library using its **Promise-based** version. The `/promise` suffix is important — it means you can use `async/await` instead of old-style callback functions. All controllers in this project use `async/await`, so this version is required.

---

```js
require('dotenv').config();
```
Loads `.env` values into `process.env` so the connection details below can be read. Even though `index.js` already calls this, doing it again here makes `db.js` self-contained — it works even if imported before `index.js` loads.

---

```js
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...
});
```

Creates the connection pool. Each property:

| Property | What It Does | Example Value |
|---|---|---|
| `host` | The machine MySQL is running on | `sql12.freesqldatabase.com` |
| `port` | The port MySQL listens on (default 3306) | `3306` |
| `user` | The MySQL username | `sql12830087` |
| `password` | The MySQL password | `G7cC924x7h` |
| `database` | Which database to use on that server | `sql12830087` |

All values come from `.env` — never hardcode passwords in this file.

---

```js
waitForConnections: true,
```
If all 10 connections in the pool are busy, new requests wait in a queue instead of immediately failing. Set to `true` for safety.

---

```js
connectionLimit: 10,
```
Maximum number of connections open at the same time. 10 is a safe default for a small-to-medium API. Increase it only if you have very high traffic.

---

```js
queueLimit: 0,
```
Maximum number of requests that can wait in the queue when all connections are busy. `0` means unlimited — waiting requests are never auto-rejected.

---

```js
module.exports = pool;
```
Exports the pool so any other file can import it. Because Node.js caches `require()` results, this pool is created **only once** — every controller that does `require('../db')` gets the same shared pool instance.

---

## How Controllers Use It

```js
const db = require('../db');

// Run a query — db.query() returns a Promise, so we await it
const [rows] = await db.query('SELECT * FROM intern');
```

`db.query()` returns an array of two things: `[rows, fields]`.
- `rows` = the actual data (array of objects)
- `fields` = column metadata (rarely needed)

We destructure with `const [rows] = ...` to grab only the data.
