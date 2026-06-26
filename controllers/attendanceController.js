const db = require('../db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.*,
        i.first_name,
        i.last_name,
        TIMESTAMPDIFF(MINUTE, a.clock_in, a.clock_out) AS minutes_worked
      FROM attendance a
      JOIN intern i ON a.intern_id = i.intern_id
      ORDER BY a.clock_in DESC
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
        a.*,
        i.first_name,
        i.last_name,
        TIMESTAMPDIFF(MINUTE, a.clock_in, a.clock_out) AS minutes_worked
      FROM attendance a
      JOIN intern i ON a.intern_id = i.intern_id
      WHERE a.attendance_id = ?
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Record not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.clockIn = async (req, res) => {
  try {
    const { intern_id } = req.body;

    if (!intern_id) {
      return res.status(400).json({ error: 'intern_id is required' });
    }

    const [existing] = await db.query(
      `SELECT attendance_id FROM attendance
       WHERE intern_id = ? AND clock_out IS NULL`,
      [intern_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Intern is already clocked in. Please clock out first.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO attendance (intern_id, date, clock_in, status)
       VALUES (?, CURDATE(), NOW(), 'present')`,
      [intern_id]
    );

    res.status(201).json({
      message:       'Clocked in successfully',
      attendance_id: result.insertId,
      clocked_in_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.clockOut = async (req, res) => {
  try {
    const { intern_id } = req.body;

    if (!intern_id) {
      return res.status(400).json({ error: 'intern_id is required' });
    }

    const [existing] = await db.query(
      `SELECT attendance_id FROM attendance
       WHERE intern_id = ? AND clock_out IS NULL`,
      [intern_id]
    );

    if (existing.length === 0) {
      return res.status(409).json({
        error: 'No active clock-in found for this intern.'
      });
    }

    await db.query(
      `UPDATE attendance
       SET clock_out = NOW()
       WHERE intern_id = ? AND clock_out IS NULL`,
      [intern_id]
    );

    const [completed] = await db.query(
      `SELECT *,
         TIMESTAMPDIFF(MINUTE, clock_in, clock_out) AS minutes_worked
       FROM attendance
       WHERE attendance_id = ?`,
      [existing[0].attendance_id]
    );

    res.json({
      message:        'Clocked out successfully',
      minutes_worked: completed[0].minutes_worked,
      record:         completed[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByIntern = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.*,
        TIMESTAMPDIFF(MINUTE, a.clock_in, a.clock_out) AS minutes_worked
      FROM attendance a
      WHERE a.intern_id = ?
      ORDER BY a.clock_in DESC
    `, [req.params.intern_id]);

    const totalMinutes = rows.reduce((sum, row) => sum + (row.minutes_worked || 0), 0);

    res.json({
      intern_id:      req.params.intern_id,
      total_sessions: rows.length,
      total_minutes:  totalMinutes,
      records:        rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Both ?start= and ?end= query params are required' });
    }

    const [rows] = await db.query(`
      SELECT
        a.*,
        i.first_name,
        i.last_name,
        d.department_name,
        TIMESTAMPDIFF(MINUTE, a.clock_in, a.clock_out) AS minutes_worked
      FROM attendance a
      JOIN intern     i ON a.intern_id     = i.intern_id
      LEFT JOIN department d ON i.department_id = d.department_id
      WHERE a.date BETWEEN ? AND ?
      ORDER BY a.clock_in ASC
    `, [start, end]);

    res.json({
      from:    start,
      to:      end,
      count:   rows.length,
      records: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM attendance WHERE attendance_id = ?', [req.params.id]);
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
