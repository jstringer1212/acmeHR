require("dotenv").config();
const express = require("express");
const pg = require("pg");
const morgan = require("morgan");

const client = new pg.Client(process.env.DATABASE_URL);
const app = express();

app.use(morgan("dev"));
app.use(express.json());

// GET /api/employees
app.get("/api/employees", async (req, res, next) => {
  try {
    const response = await client.query("SELECT * FROM employees");
    res.send(response.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/departments
app.get("/api/departments", async (req, res, next) => {
  try {
    const response = await client.query("SELECT * FROM departments");
    res.send(response.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/employees
app.post("/api/employees", async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `INSERT INTO employees (name, department_id) VALUES ($1, $2) RETURNING *`;
    const response = await client.query(SQL, [name, department_id]);
    res.status(201).send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const SQL = `DELETE FROM employees WHERE id = $1`;
    await client.query(SQL, [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id
app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, department_id } = req.body;
    const SQL = `
      UPDATE employees
      SET name = $1, department_id = $2, updated_at = now()
      WHERE id = $3
      RETURNING *`;
    const response = await client.query(SQL, [name, department_id, id]);
    if (response.rows.length === 0) {
      return res.status(404).send({ error: "Employee not found" });
    }
    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message });
});

// Database Initialization
const init = async () => {
  await client.connect();
  const SQL = `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;

    CREATE TABLE departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    );

    CREATE TABLE employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      department_id INTEGER REFERENCES departments(id)
    );
  `;

  await client.query(SQL);
  console.log("Tables created");

  const seedData = `
    INSERT INTO departments (name) VALUES ('HR'), ('Engineering'), ('Sales');
    INSERT INTO employees (name, department_id) VALUES 
      ('Alice', 1), ('Bob', 2), ('Charlie', 3);
  `;
  await client.query(seedData);
  console.log("Sample data inserted");
};

// Start the Server
const start = async () => {
  await init();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server is listening on port ${port}`));
};

start();
