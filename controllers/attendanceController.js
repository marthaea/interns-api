const db = require('../db');

// Pairs ordered clock-in/clock-out events into sessions with duration.
function pairEvents(rows) {
  const sessions = [];
  let open = null;

  for (const row of rows) {
    if (row.action === 'clock in') {
      open = row;
    } else if (row.action === 'clock out' && open) {
      const minutes = Math.round(
        (new Date(row.time_stamp) - new Date(open.time_stamp)) / 60000
      );
      sessions.push({
        clock_in_id:    open.attendance_id,
        clock_out_id:   row.attendance_id,
        intern_id:      open.intern_id,
        first_name:     open.first_name,
        last_name:      open.last_name,
        clock_in:       open.time_stamp,
        clock_out:      row.time_stamp,
        minutes_worked: minutes
      });
      open = null;
    }
  }

  return sessions;
}

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.attendance_id,
        a.intern_id,
        a.action,
        a.time_stamp,
        i.first_name,
        i.last_name
      FROM attendance a
      JOIN intern i ON a.intern_id = i.intern_id
      ORDER BY a.intern_id, a.time_stamp ASC
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
        a.attendance_id,
        a.intern_id,
        a.action,
        a.time_stamp,
        i.first_name,
        i.last_name
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

    const [last] = await db.query(
      `SELECT action FROM attendance
       WHERE intern_id = ?
       ORDER BY time_stamp DESC
       LIMIT 1`,
      [intern_id]
    );

    if (last.length > 0 && last[0].action === 'clock in') {
      return res.status(409).json({
        error: 'Intern is already clocked in. Please clock out first.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO attendance (intern_id, action) VALUES (?, 'clock in')`,
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

    const [last] = await db.query(
      `SELECT attendance_id, action, time_stamp FROM attendance
       WHERE intern_id = ?
       ORDER BY time_stamp DESC
       LIMIT 1`,
      [intern_id]
    );

    if (last.length === 0 || last[0].action !== 'clock in') {
      return res.status(409).json({
        error: 'No active clock-in found for this intern.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO attendance (intern_id, action) VALUES (?, 'clock out')`,
      [intern_id]
    );

    const clockInTime  = new Date(last[0].time_stamp);
    const clockOutTime = new Date();
    const minutes      = Math.round((clockOutTime - clockInTime) / 60000);

    res.json({
      message:        'Clocked out successfully',
      attendance_id:  result.insertId,
      minutes_worked: minutes,
      clocked_out_at: clockOutTime.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByIntern = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.attendance_id,
        a.intern_id,
        a.action,
        a.time_stamp,
        i.first_name,
        i.last_name
      FROM attendance a
      JOIN intern i ON a.intern_id = i.intern_id
      WHERE a.intern_id = ?
      ORDER BY a.time_stamp ASC
    `, [req.params.intern_id]);

    const sessions     = pairEvents(rows);
    const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes_worked, 0);

    res.json({
      intern_id:      req.params.intern_id,
      total_sessions: sessions.length,
      total_minutes:  totalMinutes,
      sessions
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
        a.attendance_id,
        a.intern_id,
        a.action,
        a.time_stamp,
        i.first_name,
        i.last_name,
        d.department_name
      FROM attendance a
      JOIN intern     i ON a.intern_id     = i.intern_id
      LEFT JOIN department d ON i.department_id = d.department_id
      WHERE DATE(a.time_stamp) BETWEEN ? AND ?
      ORDER BY a.intern_id, a.time_stamp ASC
    `, [start, end]);

    const sessions = pairEvents(rows);

    res.json({
      from:    start,
      to:      end,
      count:   sessions.length,
      records: sessions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM attendance WHERE attendance_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
