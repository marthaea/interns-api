const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.*,
        COUNT(i.intern_id) AS intern_count
      FROM supervisors s
      LEFT JOIN intern i ON i.supervisor_id = s.supervisor_id
      GROUP BY s.supervisor_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [supervisor] = await db.query(
      'SELECT * FROM supervisors WHERE supervisor_id = ?',
      [req.params.id]
    );
    if (!supervisor[0]) return res.status(404).json({ error: 'Supervisor not found' });

    const [interns] = await db.query(
      'SELECT intern_id, first_name, last_name, email FROM intern WHERE supervisor_id = ?',
      [req.params.id]
    );

    res.json({ ...supervisor[0], interns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { first_name, last_name, email, department_id } = req.body;
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'first_name, last_name, and email are required' });
    }

    const [result] = await db.query(
      'INSERT INTO supervisors (first_name, last_name, email, department_id) VALUES (?, ?, ?, ?)',
      [first_name, last_name, email, department_id]
    );
    res.status(201).json({ message: 'Supervisor created', supervisor_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { first_name, last_name, email, department_id } = req.body;
    await db.query(
      'UPDATE supervisors SET first_name=?, last_name=?, email=?, department_id=? WHERE supervisor_id=?',
      [first_name, last_name, email, department_id, req.params.id]
    );
    res.json({ message: 'Supervisor updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM supervisors WHERE supervisor_id = ?', [req.params.id]);
    res.json({ message: 'Supervisor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
