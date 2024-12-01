const pg = require('pg');
const express = require('express');
require('dotenv').config();
const cors = require('cors');

const client = new pg.Client(process.env.DATABASE_URL || 'postgres://uglie:wtffishster96@localhost/acme_employees_categories');
const app = express();

app.use(require("morgan")("dev"));
app.use(express.json());

// Use CORS middleware
app.use(cors({
    origin: 'http://localhost:3001', // Allow requests from your frontend (adjust port if necessary)
    credentials: true, // Allow cookies to be sent in cross-origin requests
}));

// Initialize the database by creating tables and inserting sample data
const init = async () => {
    try {
        // Drop existing tables if they exist
        let SQL = `
          

          CREATE TABLE employees(
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            department_id INTEGER REFERENCES departments(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
        
        // Execute table creation and initial data insertion
        await client.query(SQL);
        console.log("Tables created");

        // Insert sample data
        SQL = `
          INSERT INTO departments(name) VALUES('HR');
          INSERT INTO departments(name) VALUES('Engineering');
          INSERT INTO departments(name) VALUES('Sales');

          INSERT INTO employees(name, department_id, created_at, updated_at)
          VALUES('John Doe', 1, NOW(), NOW());
          INSERT INTO employees(name, department_id, created_at, updated_at)
          VALUES('Jane Smith', 2, NOW(), NOW());
          INSERT INTO employees(name, department_id, created_at, updated_at)
          VALUES('Sam Johnson', 3, NOW(), NOW());
        `;
        
        await client.query(SQL);
        console.log("Sample data inserted");

        // Start the server after database setup
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
        
    } catch (error) {
        console.error("Error initializing database:", error);
    }
};

// GET /api/employees - Returns an array of employees
app.get("/api/employees", async (req, res, next) => {
    try {
        const SQL = `SELECT * FROM employees`;
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
});

// GET /api/departments - Returns an array of departments
app.get("/api/departments", async (req, res, next) => {
    try {
        const SQL = `SELECT * FROM departments`;
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/employees - Creates a new employee
app.post("/api/employees", async (req, res, next) => {
    try {
        const { name, department_id } = req.body;
        const SQL = `
        INSERT INTO employees (name, department_id, created_at, updated_at)
        VALUES($1, $2, NOW(), NOW()) RETURNING *
        `;
        const response = await client.query(SQL, [name, department_id]);
        res.status(201).send(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/employees/:id - Deletes an employee
app.delete("/api/employees/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const SQL = `DELETE FROM employees WHERE id = $1`;
        await client.query(SQL, [id]);
        res.status(204).send(); // No content response
    } catch (error) {
        next(error);
    }
});

// PUT /api/employees/:id - Updates an employee
app.put("/api/employees/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, department_id } = req.body;
        const SQL = `
        UPDATE employees
        SET name = $1, department_id = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
        `;
        const response = await client.query(SQL, [name, department_id, id]);
        if (response.rows.length === 0) {
            res.status(404).send({ error: 'Employee not found' });
        } else {
            res.send(response.rows[0]);
        }
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong! this' });
});

// Start the initialization function to create tables and insert sample data
init();
