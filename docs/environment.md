# Environment Files — .env and .env.example

## What These Files Are

Environment files store **configuration values and secrets** that should never be hardcoded into your source code — things like database passwords, server ports, and API keys.

There are two files:

| File | Purpose |
|---|---|
| `.env` | Your actual secrets. Never committed to Git. |
| `.env.example` | A safe template showing what variables are needed, with no real values. Committed to Git so teammates know what to fill in. |

---

## How It Works

1. You create a `.env` file with your real values
2. `dotenv` reads it on startup: `require('dotenv').config()`
3. Every variable becomes accessible via `process.env.VARIABLE_NAME`
4. Your code never contains the actual password — only `process.env.DB_PASSWORD`

This means if you share your code publicly (e.g. GitHub), no one can see your credentials.

---

## Variable-by-Variable Breakdown

```
DB_HOST = sql12.freesqldatabase.com
```
The **hostname** of the machine running MySQL. If MySQL were on the same computer as the API, this would be `localhost`. Since you are using a remote free database, it is an external domain name.

---

```
DB_PORT = 3306
```
The **port** MySQL listens on. `3306` is MySQL's default — you almost never need to change this. The API reads this in `db.js` to open the connection on the right port.

---

```
DB_USER = sql12830087
```
The **MySQL username**. This is the account the API logs in with when connecting to the database. It must have permission to SELECT, INSERT, UPDATE, and DELETE on the target database.

---

```
DB_PASSWORD = G7cC924x7h
```
The **password** for the MySQL user above. This is the most sensitive value in the file — never share it, never commit it to Git, and never paste it in chat messages.

---

```
DB_NAME = sql12830087
```
The **name of the database** to connect to. A single MySQL server can host many databases. This tells the driver which one to use. In freesqldatabase.com, the database name is usually the same as the username.

---

```
PORT = 3000
```
The **port your Express server listens on**. When you visit `http://localhost:3000`, the `3000` here is what this variable controls. You can change it to `4000`, `8080`, or anything else as long as it is not already in use on your machine.

---

## Why .env Is in .gitignore

The `.gitignore` file contains `.env`, which tells Git to never track or commit that file. If `.env` were committed, your database password would be visible in the Git history — even if you later deleted the file. This is a standard security practice for all projects.

The `.env.example` file IS safe to commit because it contains no real values — just placeholder text like `your_password_here`.

---

## What to Do When Setting Up the Project Fresh

1. Copy `.env.example` to a new file called `.env`
2. Fill in the real values (get them from your database admin)
3. Never rename or touch `.env.example` — it stays as the template
