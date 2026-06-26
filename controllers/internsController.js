const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        i.*,
        d.department_name,
        u.university_name
      FROM intern i
      LEFT JOIN department d ON i.department_id  = d.department_id
      LEFT JOIN university  u ON i.univeristy_id = u.university_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        i.*,
        d.department_name,
        u.university_name
      FROM intern i
      LEFT JOIN department d ON i.department_id  = d.department_id
      LEFT JOIN university  u ON i.univeristy_id = u.university_id
      WHERE i.intern_id = ?
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Intern not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { first_name, last_name, email, department_id, university_id, supervisor_id, address, start_date, end_date, status } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'first_name, last_name, and email are required' });
    }

    const [result] = await db.query(
      `INSERT INTO intern
        (first_name, last_name, email, department_id, univeristy_id, supervisor_id, address, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, department_id, university_id, supervisor_id, address, start_date, end_date, status]
    );

    res.status(201).json({ message: 'Intern created successfully', intern_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { first_name, last_name, email, department_id, university_id, supervisor_id, address, start_date, end_date, status } = req.body;

    await db.query(
      `UPDATE intern
       SET first_name=?, last_name=?, email=?,
           department_id=?, univeristy_id=?, supervisor_id=?,
           address=?, start_date=?, end_date=?, status=?
       WHERE intern_id = ?`,
      [first_name, last_name, email, department_id, university_id, supervisor_id, address, start_date, end_date, status, req.params.id]
    );

    res.json({ message: 'Intern updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM intern WHERE intern_id = ?', [req.params.id]);
    res.json({ message: 'Intern deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
