const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        d.*,
        COUNT(i.intern_id) AS intern_count
      FROM department d
      LEFT JOIN intern i ON i.department_id = d.department_id
      GROUP BY d.department_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [dept] = await db.query(
      'SELECT * FROM department WHERE department_id = ?',
      [req.params.id]
    );
    if (!dept[0]) return res.status(404).json({ error: 'Department not found' });

    const [interns] = await db.query(
      'SELECT intern_id, first_name, last_name, email FROM intern WHERE department_id = ?',
      [req.params.id]
    );

    res.json({ ...dept[0], interns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { department_name } = req.body;
    if (!department_name) return res.status(400).json({ error: 'department_name is required' });

    const [result] = await db.query(
      'INSERT INTO department (department_name) VALUES (?)',
      [department_name]
    );
    res.status(201).json({ message: 'Department created', department_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { department_name } = req.body;
    await db.query(
      'UPDATE department SET department_name = ? WHERE department_id = ?',
      [department_name, req.params.id]
    );
    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM department WHERE department_id = ?', [req.params.id]);
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
