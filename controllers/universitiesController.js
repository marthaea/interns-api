const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.*,
        COUNT(i.intern_id) AS intern_count
      FROM university u
      LEFT JOIN intern i ON i.univeristy_id = u.university_id
      GROUP BY u.university_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [uni] = await db.query(
      'SELECT * FROM university WHERE university_id = ?',
      [req.params.id]
    );
    if (!uni[0]) return res.status(404).json({ error: 'University not found' });

    const [interns] = await db.query(
      'SELECT intern_id, first_name, last_name, email FROM intern WHERE univeristy_id = ?',
      [req.params.id]
    );

    res.json({ ...uni[0], interns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { university_name, location } = req.body;
    if (!university_name) return res.status(400).json({ error: 'university_name is required' });

    const [result] = await db.query(
      'INSERT INTO university (university_name, location) VALUES (?, ?)',
      [university_name, location]
    );
    res.status(201).json({ message: 'University created', university_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { university_name, location } = req.body;
    await db.query(
      'UPDATE university SET university_name = ?, location = ? WHERE university_id = ?',
      [university_name, location, req.params.id]
    );
    res.json({ message: 'University updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM university WHERE university_id = ?', [req.params.id]);
    res.json({ message: 'University deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
