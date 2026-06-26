# index.js — The Entry Point

## What This File Does

`index.js` is the **first file Node.js runs** when you start the server with `npm run dev` or `node index.js`. Think of it as the reception desk of the entire application — every incoming HTTP request passes through here before going anywhere else.

It does four things:
1. Creates the Express app
2. Registers middleware (functions that process every request)
3. Registers routes (which URLs map to which files)
4. Starts listening for incoming connections

---

## Line-by-Line Breakdown

```js
const express = require('express');
```
Imports the Express framework. Express is what turns Node.js into a web server — it gives you tools like `app.get()`, `app.use()`, `res.json()`, etc. Without it, you would have to write low-level Node.js HTTP code.

---

```js
require('dotenv').config();
```
Reads your `.env` file and loads all the key=value pairs into `process.env`. After this line runs, you can access `process.env.DB_HOST`, `process.env.PORT`, etc. anywhere in the application. This must happen early — before any code tries to read those values.

---

```js
const app = express();
```
Creates the Express application instance. Everything — middleware, routes, error handlers — gets attached to this `app` object.

---

### Middleware

```js
app.use(express.json());
```
**Middleware** is a function that runs on every request before it reaches your route. This specific middleware reads the raw HTTP request body and parses it as JSON, making it available as `req.body`.

Without this line, if someone sends:
```json
POST /api/interns
{ "first_name": "Alice" }
```
Then `req.body` would be `undefined`. With this line, `req.body.first_name` equals `"Alice"`.

---

### Routes

```js
app.use('/api/attendance',   require('./routes/attendance'));
app.use('/api/departments',  require('./routes/departments'));
app.use('/api/interns',      require('./routes/interns'));
app.use('/api/supervisors',  require('./routes/supervisors'));
app.use('/api/universities', require('./routes/universities'));
```

Each line mounts a router at a URL prefix.

- `require('./routes/interns')` loads the interns router from `routes/interns.js`
- `app.use('/api/interns', ...)` means: "any request whose URL starts with `/api/interns` should be handled by that router"

So a request to `GET /api/interns/5` is handed to the interns router, which then looks for a handler matching `GET /:id`.

---

### Root Route (Health Check)

```js
app.get('/', (req, res) => {
  res.json({ message: 'CAA Interns Attendance API is running' });
});
```

A simple sanity check. If you open `http://localhost:3000/` in a browser or Postman and get this JSON message, the server is running correctly. It doesn't touch the database — it's just a signal that the app is alive.

---

### Global Error Handler

```js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});
```

If any route throws an error that isn't caught by its own `try/catch`, it lands here instead of crashing the server. Express identifies this as an error handler because it has **four parameters** — `(err, req, res, next)`. The fourth parameter `next` is the signal to Express that this is special.

This is a safety net — but controllers each have their own `try/catch`, so most errors are handled before reaching this point.

---

### Starting the Server

```js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
```

- `process.env.PORT` reads the PORT value from your `.env` file
- `|| 3000` means "use 3000 if PORT is not defined"
- `app.listen()` opens a network socket and starts accepting connections
- The callback (the arrow function) runs once, after the server is ready
