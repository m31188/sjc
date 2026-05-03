const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { redirectIfAuth } = require('../middleware/auth');

// Login page
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('admin/login', {
    title: 'เข้าสู่ระบบ',
    layout: false
  });
});

// Login POST
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminPath = `/${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}`;

    if (!email || !password) {
      req.flash('error', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return res.redirect(`${adminPath}/auth/login`);
    }

    const users = await query(
      'SELECT * FROM users WHERE email = ? AND active = 1 LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      req.flash('error', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      return res.redirect(`${adminPath}/auth/login`);
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      req.flash('error', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      return res.redirect(`${adminPath}/auth/login`);
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    req.flash('success', `ยินดีต้อนรับ ${user.name}`);
    res.redirect(`${adminPath}/dashboard`);
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    res.redirect(`/${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}/auth/login`);
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect(`/${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}/auth/login`);
  });
});

module.exports = router;
