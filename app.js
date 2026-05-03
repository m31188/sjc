require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const rateLimit = require('express-rate-limit');

const { testConnection, query } = require('./config/database');
const { initialize } = require('./config/init-db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SLUG = process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2';

// Trust proxy (Cloudflare/Plesk)
if (process.env.BEHIND_CLOUDFLARE === 'true') {
  app.set('trust proxy', true);
}

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/public');

// Security headers (relaxed for inline styles needed for slider)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4, // 4 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));
app.use(flash());

// Rate limiting (Cloudflare-aware: uses CF-Connecting-IP if available)
const getRealIp = (req) => req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRealIp
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  keyGenerator: getRealIp,
  message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่'
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: getRealIp,
  message: 'ส่งข้อความบ่อยเกินไป กรุณารอสักครู่'
});

app.use(generalLimiter);

// Global locals (available in all views)
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error'),
    info: req.flash('info')
  };
  res.locals.adminSlug = ADMIN_SLUG;
  res.locals.currentPath = req.path;
  res.locals.originalUrl = req.originalUrl || req.url || req.path;
  res.locals.siteUrl = process.env.SITE_URL || `http://localhost:${PORT}`;

  // i18n: set adminLang from cookie + provide t() translator function.
  // Templates reference both adminLang and t(), so they MUST be defined here
  // BEFORE any view renders, or templates throw "ReferenceError: t is not defined" -> 500.
  const adminLang = req.cookies && req.cookies.admin_lang === 'en' ? 'en' : 'th';
  res.locals.adminLang = adminLang;
  try {
    const { t: translate } = require('./utils/i18n');
    res.locals.t = (key) => translate(key, adminLang);
  } catch(e) {
    res.locals.t = (key) => key;  // fallback so templates never crash
  }

  // Frontend public language - delegated to middleware/lang.js
  // Sets: res.locals.siteLang, currentLang, tField(), tUI()
  try {
    require('./middleware/lang')(req, res, () => {});
  } catch (e) {
    console.error('lang middleware error:', e.message);
    res.locals.siteLang = 'th';
    res.locals.currentLang = 'th';
    res.locals.tField = (obj, k) => (obj && obj[k]) || '';
    res.locals.tUI = (k) => k;
  }

  // Load settings into res.locals.settings
  try {
    const settingsRows = await query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    settingsRows.forEach(s => { settings[s.setting_key] = s.setting_value; });
    res.locals.settings = settings;

    // Load header menu with translation columns
    const headerMenu = await query(
      'SELECT id, label, label_en, label_zh, label_ja, url, parent_id, open_new_tab FROM menus WHERE location = ? AND active = 1 ORDER BY sort_order ASC',
      ['header']
    );
    res.locals.headerMenu = headerMenu;

    // Load footer menus with translation columns
    res.locals.footerMenu = await query(
      'SELECT label, label_en, label_zh, label_ja, url FROM menus WHERE location = ? AND active = 1 ORDER BY sort_order ASC', ['footer']
    );
    res.locals.footerMenu2 = await query(
      'SELECT label, label_en, label_zh, label_ja, url FROM menus WHERE location = ? AND active = 1 ORDER BY sort_order ASC', ['footer_2']
    );
    res.locals.footerMenu3 = await query(
      'SELECT label, label_en, label_zh, label_ja, url FROM menus WHERE location = ? AND active = 1 ORDER BY sort_order ASC', ['footer_3']
    );
  } catch (err) {
    console.error('Settings load error:', err.message);
    res.locals.settings = {};
    res.locals.headerMenu = [];
    res.locals.footerMenu = [];
    res.locals.footerMenu2 = [];
    res.locals.footerMenu3 = [];
  }
  next();
});

// ===== ROUTES =====
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const { adminLocaleMiddleware } = require('./utils/i18n');

app.use('/', publicRoutes);
app.use('/api', apiRoutes);
app.use(`/${ADMIN_SLUG}/auth`, loginLimiter, adminLocaleMiddleware, authRoutes);
app.use(`/${ADMIN_SLUG}`, adminLocaleMiddleware, adminRoutes);

// Contact form route uses contactLimiter
app.locals.contactLimiter = contactLimiter;

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: '404 - ไม่พบหน้าที่ต้องการ',
    layout: 'layouts/public'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).render('pages/error', {
    title: 'เกิดข้อผิดพลาด',
    message: process.env.NODE_ENV === 'production' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : err.message,
    layout: 'layouts/public'
  });
});

// ===== STARTUP =====
async function start() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SJC Website - Starting...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('Cannot start: database connection failed');
    process.exit(1);
  }

  try {
    await initialize();
  } catch (err) {
    console.error('DB initialization failed:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ✓ Server running on port ${PORT}`);
    console.log(`  ✓ Public site:  ${process.env.SITE_URL || `http://localhost:${PORT}`}`);
    console.log(`  ✓ Admin panel:  ${process.env.SITE_URL || `http://localhost:${PORT}`}/${ADMIN_SLUG}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
}

start();

module.exports = app;
