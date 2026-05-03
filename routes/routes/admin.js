const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, processImage, getRelativePath } = require('../middleware/upload');
const { makeSlug, sanitizeContent } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

// All admin routes require auth & use admin layout
router.use(requireAuth);
router.use((req, res, next) => {
  res.locals.layout = 'layouts/admin';
  res.locals.activeMenu = '';
  next();
});

const ADMIN_BASE = `/${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}`;

// Language switch
router.get('/lang/:lang', (req, res) => {
  const lang = req.params.lang === 'en' ? 'en' : 'th';
  res.cookie('admin_lang', lang, {
    maxAge: 365 * 24 * 60 * 60 * 1000,  // 1 year
    httpOnly: false,
    sameSite: 'lax'
  });
  const back = req.headers.referer || `${ADMIN_BASE}/`;
  res.redirect(back);
});

// ============================================
// HOMEPAGE MANAGER - one unified page for all homepage settings
// ============================================
router.get('/homepage-manager', async (req, res, next) => {
  try {
    res.locals.activeMenu = 'homepage-manager';

    // Self-healing: ensure all required settings exist before rendering.
    // If any are missing (e.g. legacy DB without the new bg_opacity rows),
    // we INSERT IGNORE them so the template never references undefined keys.
    const requiredSettings = [
      // Homepage section toggles
      ['home_show_about', '1', 'bool', 'homepage', 'Show About Section on Homepage', ''],
      ['home_show_businesses', '1', 'bool', 'homepage', 'Show Businesses Section', ''],
      ['home_show_news', '1', 'bool', 'homepage', 'Show News Section', ''],
      ['home_show_sustainability', '1', 'bool', 'homepage', 'Show Sustainability Section', ''],
      ['home_show_stats', '1', 'bool', 'homepage', 'Show Stats Counter', ''],
      // About block
      ['home_about_title', 'เกี่ยวกับ SJC', 'text', 'homepage', 'About Title', ''],
      ['home_about_text', '', 'text', 'homepage', 'About Text', ''],
      ['home_about_image', '/images/about-placeholder.jpg', 'image', 'homepage', 'About Image', ''],
      // Stats
      ['home_stats_1_number', '50+', 'text', 'homepage', 'Stat 1 Number', ''],
      ['home_stats_1_label', 'ปีแห่งประสบการณ์', 'text', 'homepage', 'Stat 1 Label', ''],
      ['home_stats_1_unit', '', 'text', 'homepage', 'Stat 1 Unit', ''],
      ['home_stats_2_number', '1000+', 'text', 'homepage', 'Stat 2 Number', ''],
      ['home_stats_2_label', 'พนักงาน', 'text', 'homepage', 'Stat 2 Label', ''],
      ['home_stats_2_unit', '', 'text', 'homepage', 'Stat 2 Unit', ''],
      ['home_stats_3_number', '20+', 'text', 'homepage', 'Stat 3 Number', ''],
      ['home_stats_3_label', 'ประเทศที่ดำเนินงาน', 'text', 'homepage', 'Stat 3 Label', ''],
      ['home_stats_3_unit', '', 'text', 'homepage', 'Stat 3 Unit', ''],
      ['home_stats_4_number', '100+', 'text', 'homepage', 'Stat 4 Number', ''],
      ['home_stats_4_label', 'รางวัลที่ได้รับ', 'text', 'homepage', 'Stat 4 Label', ''],
      ['home_stats_4_unit', '', 'text', 'homepage', 'Stat 4 Unit', ''],
      ['home_stats_5_number', 'TOP 1', 'text', 'homepage', 'Stat 5 Number', ''],
      ['home_stats_5_label', 'Sustainability Index', 'text', 'homepage', 'Stat 5 Label', ''],
      ['home_stats_5_unit', '%', 'text', 'homepage', 'Stat 5 Unit', ''],
      // Headings
      ['highlights_title', 'SJC Highlights', 'text', 'homepage', 'Highlights Title', ''],
      ['feature_stories_lead', '', 'text', 'homepage', 'Feature Stories Lead', ''],
      ['business_panel_desc', 'กลุ่มธุรกิจที่ขับเคลื่อนด้วยนวัตกรรมและความยั่งยืน', 'text', 'homepage', 'Business Panel Description', ''],
      ['big_banner_image', '/images/banner-default.jpg', 'image', 'homepage', 'Big Banner Image', ''],
      ['big_banner_url', '/about', 'text', 'homepage', 'Big Banner URL', ''],
      // Section backgrounds + opacity
      ['about_bg_image', '', 'image', 'section_backgrounds', 'About Block Background', ''],
      ['about_bg_opacity', '92', 'text', 'section_backgrounds', 'About Bg Opacity', ''],
      ['highlights_bg_image', '', 'image', 'section_backgrounds', 'Highlights Background', ''],
      ['highlights_bg_opacity', '92', 'text', 'section_backgrounds', 'Highlights Bg Opacity', ''],
      ['latest_news_bg_image', '', 'image', 'section_backgrounds', 'Latest News Background', ''],
      ['latest_news_bg_opacity', '92', 'text', 'section_backgrounds', 'Latest News Bg Opacity', ''],
      ['feature_stories_bg_image', '', 'image', 'section_backgrounds', 'Feature Stories Background', ''],
      ['feature_stories_bg_opacity', '92', 'text', 'section_backgrounds', 'Feature Stories Bg Opacity', ''],
      ['whatwedo_bg_image', '', 'image', 'section_backgrounds', 'What We Do Background', ''],
      ['whatwedo_bg_opacity', '92', 'text', 'section_backgrounds', 'What We Do Bg Opacity', ''],
      ['metrics_bg_image', '', 'image', 'section_backgrounds', 'Metrics Background', ''],
      ['metrics_bg_opacity', '85', 'text', 'section_backgrounds', 'Metrics Bg Opacity', ''],
      ['ir_bg_image', '', 'image', 'section_backgrounds', 'IR Background', ''],
      ['ir_bg_opacity', '92', 'text', 'section_backgrounds', 'IR Bg Opacity', ''],
      ['careers_bg_image', '', 'image', 'section_backgrounds', 'Careers Background', ''],
      ['careers_bg_opacity', '50', 'text', 'section_backgrounds', 'Careers Bg Opacity', '']
    ];

    for (const [k, v, t, g, l, d] of requiredSettings) {
      try {
        await query(
          `INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, setting_group, label, description) VALUES (?, ?, ?, ?, ?, ?)`,
          [k, v, t, g, l, d]
        );
      } catch (e) {
        console.error('[HPM GET] could not ensure setting', k, ':', e.message);
      }
    }

    // Pull all homepage and section_backgrounds settings into a single map
    const rows = await query(
      `SELECT setting_key, setting_value, setting_type, label, description
       FROM settings
       WHERE setting_group IN ('homepage', 'section_backgrounds')
       ORDER BY setting_group, setting_key`
    );
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r; });

    res.render('admin/homepage-manager', {
      title: 'Homepage Manager',
      settings
    });
  } catch (err) {
    console.error('[HPM GET] FATAL:', err);
    next(err);
  }
});

router.post('/homepage-manager', (req, res, next) => {
  upload.any()(req, res, async (uploadErr) => {
    if (uploadErr) {
      console.error('[HPM] Multer error:', uploadErr.message);
      req.flash('error', 'Upload error: ' + uploadErr.message);
      return res.redirect(`${ADMIN_BASE}/homepage-manager`);
    }
    try {
      console.log('[HPM] Save started. Files:', (req.files || []).length, 'Body keys:', Object.keys(req.body || {}).length);

      // Save uploaded image files
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const relPath = getRelativePath(file);
            if (!relPath) continue;
            const fullPath = path.join(__dirname, '..', 'public', relPath);
            if (file.mimetype && file.mimetype.startsWith('image/')) {
              try { await processImage(fullPath, { maxWidth: 2400 }); }
              catch (e) { console.error('[HPM] Sharp warning:', e.message); }
            }
            await query(
              'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
              [relPath, file.fieldname]
            );
            console.log('[HPM] Saved file for', file.fieldname, '→', relPath);
          } catch (e) {
            console.error(`[HPM] Upload error for ${file.fieldname}:`, e.message);
          }
        }
      }

      // Save text/bool fields
      let settingsList = [];
      try {
        settingsList = await query(
          `SELECT setting_key, setting_type FROM settings WHERE setting_group IN ('homepage', 'section_backgrounds')`
        );
      } catch (e) {
        console.error('[HPM] Could not load settings list:', e.message);
        req.flash('error', 'Could not load settings: ' + e.message);
        return res.redirect(`${ADMIN_BASE}/homepage-manager`);
      }

      let savedCount = 0;
      for (const s of settingsList) {
        if (s.setting_type === 'image') continue;
        let value = req.body[s.setting_key];
        if (s.setting_type === 'bool') {
          value = value ? '1' : '0';
        } else if (value === undefined) {
          continue;
        }
        try {
          await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [String(value), s.setting_key]);
          savedCount++;
        } catch (e) {
          console.error(`[HPM] Failed to save ${s.setting_key}:`, e.message);
        }
      }
      console.log('[HPM] Saved', savedCount, 'settings');

      req.flash('success', 'บันทึกเรียบร้อย / Saved successfully');
      res.redirect(`${ADMIN_BASE}/homepage-manager`);
    } catch (err) {
      console.error('[HPM] Save error:', err);
      req.flash('error', 'Save error: ' + (err.message || 'Unknown'));
      res.redirect(`${ADMIN_BASE}/homepage-manager`);
    }
  });
});

// Delete a section background image
router.post('/homepage-manager/clear-bg/:key', async (req, res, next) => {
  try {
    const key = req.params.key;
    // Only allow clearing keys that end in _bg_image
    if (!key.endsWith('_bg_image')) {
      req.flash('error', 'Invalid key');
      return res.redirect(`${ADMIN_BASE}/homepage-manager`);
    }
    await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', ['', key]);
    req.flash('success', 'Background cleared');
    res.redirect(`${ADMIN_BASE}/homepage-manager`);
  } catch (err) { next(err); }
});

// Helper: log activity
async function logActivity(userId, action, entityType, entityId, details, ip) {
  try {
    await query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, details, ip]
    );
  } catch (err) { /* silent */ }
}

// ===== DASHBOARD =====
router.get('/', (req, res) => res.redirect(`${ADMIN_BASE}/dashboard`));

router.get('/dashboard', async (req, res, next) => {
  try {
    const [{ news_count }] = await query('SELECT COUNT(*) as news_count FROM news');
    const [{ slider_count }] = await query('SELECT COUNT(*) as slider_count FROM sliders WHERE active = 1');
    const [{ business_count }] = await query('SELECT COUNT(*) as business_count FROM businesses WHERE active = 1');
    const [{ unread_msgs }] = await query('SELECT COUNT(*) as unread_msgs FROM contact_messages WHERE is_read = 0');
    const [{ career_count }] = await query('SELECT COUNT(*) as career_count FROM careers WHERE active = 1');
    const recentMessages = await query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 5'
    );
    const recentNews = await query(
      'SELECT id, title, published_at, views FROM news ORDER BY created_at DESC LIMIT 5'
    );
    res.render('admin/dashboard', {
      title: 'แดชบอร์ด',
      stats: { news_count, slider_count, business_count, unread_msgs, career_count },
      recentMessages,
      recentNews,
      activeMenu: 'dashboard'
    });
  } catch (err) { next(err); }
});

// ===== SLIDERS =====
router.get('/sliders', async (req, res, next) => {
  try {
    const sliders = await query('SELECT * FROM sliders ORDER BY sort_order ASC');
    res.render('admin/sliders/index', {
      title: 'จัดการสไลด์โชว์',
      sliders,
      activeMenu: 'sliders'
    });
  } catch (err) { next(err); }
});

router.get('/sliders/new', (req, res) => {
  res.render('admin/sliders/form', {
    title: 'เพิ่มสไลด์ใหม่',
    slider: {},
    activeMenu: 'sliders'
  });
});

router.post('/sliders', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res, next) => {
  try {
    const { title, subtitle, description, button_text, button_url, text_position, text_color, sort_order, active } = req.body;
    let imagePath = null;
    let videoPath = req.body.video_url || null;

    // Handle image upload
    if (req.files && req.files.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      imagePath = getRelativePath(imageFile);
      try {
        await processImage(path.join(__dirname, '..', 'public', imagePath), { maxWidth: 2000 });
      } catch (e) { console.error('Sharp warning:', e.message); }
    }

    // Handle video upload (overrides URL field if file uploaded)
    if (req.files && req.files.video_file && req.files.video_file[0]) {
      videoPath = getRelativePath(req.files.video_file[0]);
    }

    const result = await query(
      `INSERT INTO sliders (title, subtitle, description, image, video_url, button_text, button_url, text_position, text_color, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, subtitle, description, imagePath || '/images/slide-placeholder.jpg',
       videoPath, button_text, button_url, text_position || 'left', text_color || '#ffffff',
       sort_order || 0, active ? 1 : 0]
    );
    await logActivity(req.session.user.id, 'create', 'slider', result.insertId, title, req.ip);
    req.flash('success', res.locals.t ? res.locals.t('msg.saved') : 'เพิ่มสไลด์เรียบร้อย');
    res.redirect(`${ADMIN_BASE}/sliders`);
  } catch (err) { next(err); }
});

router.get('/sliders/:id/edit', async (req, res, next) => {
  try {
    const sliders = await query('SELECT * FROM sliders WHERE id = ?', [req.params.id]);
    if (!sliders[0]) return res.redirect(`${ADMIN_BASE}/sliders`);
    res.render('admin/sliders/form', {
      title: 'แก้ไขสไลด์',
      slider: sliders[0],
      activeMenu: 'sliders'
    });
  } catch (err) { next(err); }
});

router.post('/sliders/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res, next) => {
  try {
    const { title, subtitle, description, button_text, button_url, text_position, text_color, sort_order, active } = req.body;
    let videoPath = req.body.video_url || null;
    const setClauses = [];
    const params = [];

    setClauses.push('title=?', 'subtitle=?', 'description=?', 'button_text=?', 'button_url=?',
                    'text_position=?', 'text_color=?', 'sort_order=?', 'active=?');
    params.push(title, subtitle, description, button_text, button_url,
                text_position, text_color, sort_order || 0, active ? 1 : 0);

    if (req.files && req.files.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      const imagePath = getRelativePath(imageFile);
      try {
        await processImage(path.join(__dirname, '..', 'public', imagePath), { maxWidth: 2000 });
      } catch (e) { console.error('Sharp warning:', e.message); }
      setClauses.push('image=?');
      params.push(imagePath);
    }

    // If a video file was uploaded, use its path; otherwise use the URL field
    if (req.files && req.files.video_file && req.files.video_file[0]) {
      videoPath = getRelativePath(req.files.video_file[0]);
    }
    setClauses.push('video_url=?');
    params.push(videoPath);

    params.push(req.params.id);

    await query(
      `UPDATE sliders SET ${setClauses.join(', ')} WHERE id=?`,
      params
    );
    req.flash('success', res.locals.t ? res.locals.t('msg.saved') : 'อัปเดตสไลด์เรียบร้อย');
    res.redirect(`${ADMIN_BASE}/sliders`);
  } catch (err) { next(err); }
});

router.post('/sliders/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM sliders WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบสไลด์เรียบร้อย');
    res.redirect(`${ADMIN_BASE}/sliders`);
  } catch (err) { next(err); }
});

// ===== NEWS =====
router.get('/news', async (req, res, next) => {
  try {
    const news = await query(
      `SELECT n.*, c.name as category_name FROM news n
       LEFT JOIN news_categories c ON n.category_id = c.id
       ORDER BY n.created_at DESC`
    );
    res.render('admin/news/index', {
      title: 'จัดการข่าวสาร',
      news,
      activeMenu: 'news'
    });
  } catch (err) { next(err); }
});

router.get('/news/new', async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM news_categories ORDER BY name');
    res.render('admin/news/form', {
      title: 'เพิ่มข่าวใหม่',
      news: {},
      categories,
      activeMenu: 'news'
    });
  } catch (err) { next(err); }
});

router.post('/news', upload.fields([{ name: 'thumbnail' }, { name: 'banner' }]), async (req, res, next) => {
  try {
    const { title, excerpt, content, category_id, author, tags, featured, published, meta_title, meta_description } = req.body;
    let slug = req.body.slug?.trim() || makeSlug(title);

    // Ensure unique slug
    const existing = await query('SELECT id FROM news WHERE slug = ?', [slug]);
    if (existing.length > 0) slug = slug + '-' + Date.now().toString(36);

    let thumb = null, banner = null;
    if (req.files?.thumbnail?.[0]) {
      thumb = getRelativePath(req.files.thumbnail[0]);
      await processImage(path.join(__dirname, '..', 'public', thumb), { maxWidth: 1200 });
    }
    if (req.files?.banner?.[0]) {
      banner = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', banner), { maxWidth: 2000 });
    }

    const result = await query(
      `INSERT INTO news (title, slug, excerpt, content, thumbnail, banner, category_id, author, tags, featured, published, meta_title, meta_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, excerpt, sanitizeContent(content), thumb, banner,
       category_id || null, author, tags, featured ? 1 : 0, published ? 1 : 0,
       meta_title, meta_description]
    );
    req.flash('success', 'เพิ่มข่าวเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/news`);
  } catch (err) { next(err); }
});

router.get('/news/:id/edit', async (req, res, next) => {
  try {
    const news = await query('SELECT * FROM news WHERE id = ?', [req.params.id]);
    if (!news[0]) return res.redirect(`${ADMIN_BASE}/news`);
    const categories = await query('SELECT * FROM news_categories ORDER BY name');
    res.render('admin/news/form', {
      title: 'แก้ไขข่าว',
      news: news[0],
      categories,
      activeMenu: 'news'
    });
  } catch (err) { next(err); }
});

router.post('/news/:id', upload.fields([{ name: 'thumbnail' }, { name: 'banner' }]), async (req, res, next) => {
  try {
    const { title, slug, excerpt, content, category_id, author, tags, featured, published, meta_title, meta_description } = req.body;
    const finalSlug = slug?.trim() || makeSlug(title);

    let extraSet = '', extraParams = [];
    if (req.files?.thumbnail?.[0]) {
      const p = getRelativePath(req.files.thumbnail[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 1200 });
      extraSet += ', thumbnail = ?';
      extraParams.push(p);
    }
    if (req.files?.banner?.[0]) {
      const p = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 2000 });
      extraSet += ', banner = ?';
      extraParams.push(p);
    }

    await query(
      `UPDATE news SET title=?, slug=?, excerpt=?, content=?, category_id=?, author=?, tags=?,
       featured=?, published=?, meta_title=?, meta_description=? ${extraSet} WHERE id=?`,
      [title, finalSlug, excerpt, sanitizeContent(content), category_id || null,
       author, tags, featured ? 1 : 0, published ? 1 : 0, meta_title, meta_description,
       ...extraParams, req.params.id]
    );
    req.flash('success', 'อัปเดตข่าวเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/news`);
  } catch (err) { next(err); }
});

router.post('/news/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM news WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบข่าวเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/news`);
  } catch (err) { next(err); }
});

// News categories
router.get('/news-categories', async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM news_categories ORDER BY sort_order ASC');
    res.render('admin/news-categories', {
      title: 'หมวดหมู่ข่าว',
      categories,
      activeMenu: 'news'
    });
  } catch (err) { next(err); }
});

router.post('/news-categories', async (req, res, next) => {
  try {
    const { name } = req.body;
    const slug = makeSlug(name);
    await query('INSERT INTO news_categories (name, slug) VALUES (?, ?)', [name, slug]);
    req.flash('success', 'เพิ่มหมวดหมู่เรียบร้อย');
    res.redirect(`${ADMIN_BASE}/news-categories`);
  } catch (err) { next(err); }
});

router.post('/news-categories/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM news_categories WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบหมวดหมู่เรียบร้อย');
    res.redirect(`${ADMIN_BASE}/news-categories`);
  } catch (err) { next(err); }
});

// ===== BUSINESSES =====
router.get('/businesses', async (req, res, next) => {
  try {
    const businesses = await query('SELECT * FROM businesses ORDER BY sort_order ASC');
    res.render('admin/businesses/index', {
      title: 'จัดการธุรกิจ',
      businesses,
      activeMenu: 'businesses'
    });
  } catch (err) { next(err); }
});

router.get('/businesses/new', (req, res) => {
  res.render('admin/businesses/form', {
    title: 'เพิ่มธุรกิจใหม่',
    business: {},
    activeMenu: 'businesses'
  });
});

router.post('/businesses', upload.fields([{ name: 'thumbnail' }, { name: 'banner' }, { name: 'icon' }]), async (req, res, next) => {
  try {
    const { name, short_description, full_description, website_url, sort_order, featured, active } = req.body;
    const slug = makeSlug(name);
    let thumb = null, banner = null, icon = null;
    if (req.files?.thumbnail?.[0]) {
      thumb = getRelativePath(req.files.thumbnail[0]);
      await processImage(path.join(__dirname, '..', 'public', thumb), { maxWidth: 1200 });
    }
    if (req.files?.banner?.[0]) {
      banner = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', banner), { maxWidth: 2000 });
    }
    if (req.files?.icon?.[0]) {
      icon = getRelativePath(req.files.icon[0]);
    }
    await query(
      `INSERT INTO businesses (name, slug, short_description, full_description, thumbnail, banner, icon, website_url, sort_order, featured, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, short_description, sanitizeContent(full_description), thumb, banner, icon,
       website_url, sort_order || 0, featured ? 1 : 0, active ? 1 : 0]
    );
    req.flash('success', 'เพิ่มธุรกิจเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/businesses`);
  } catch (err) { next(err); }
});

router.get('/businesses/:id/edit', async (req, res, next) => {
  try {
    const businesses = await query('SELECT * FROM businesses WHERE id = ?', [req.params.id]);
    if (!businesses[0]) return res.redirect(`${ADMIN_BASE}/businesses`);
    res.render('admin/businesses/form', {
      title: 'แก้ไขธุรกิจ',
      business: businesses[0],
      activeMenu: 'businesses'
    });
  } catch (err) { next(err); }
});

router.post('/businesses/:id', upload.fields([{ name: 'thumbnail' }, { name: 'banner' }, { name: 'icon' }]), async (req, res, next) => {
  try {
    const { name, short_description, full_description, website_url, sort_order, featured, active } = req.body;
    let extraSet = '', extraParams = [];
    if (req.files?.thumbnail?.[0]) {
      const p = getRelativePath(req.files.thumbnail[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 1200 });
      extraSet += ', thumbnail = ?';
      extraParams.push(p);
    }
    if (req.files?.banner?.[0]) {
      const p = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 2000 });
      extraSet += ', banner = ?';
      extraParams.push(p);
    }
    if (req.files?.icon?.[0]) {
      extraSet += ', icon = ?';
      extraParams.push(getRelativePath(req.files.icon[0]));
    }
    await query(
      `UPDATE businesses SET name=?, short_description=?, full_description=?, website_url=?,
       sort_order=?, featured=?, active=? ${extraSet} WHERE id=?`,
      [name, short_description, sanitizeContent(full_description), website_url,
       sort_order || 0, featured ? 1 : 0, active ? 1 : 0, ...extraParams, req.params.id]
    );
    req.flash('success', 'อัปเดตธุรกิจเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/businesses`);
  } catch (err) { next(err); }
});

router.post('/businesses/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM businesses WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบธุรกิจเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/businesses`);
  } catch (err) { next(err); }
});

// ===== SUSTAINABILITY =====
router.get('/sustainability', async (req, res, next) => {
  try {
    const items = await query('SELECT * FROM sustainability ORDER BY sort_order ASC');
    res.render('admin/sustainability/index', {
      title: 'ความยั่งยืน',
      items,
      activeMenu: 'sustainability'
    });
  } catch (err) { next(err); }
});

router.get('/sustainability/new', (req, res) => {
  res.render('admin/sustainability/form', {
    title: 'เพิ่มรายการใหม่',
    item: {},
    activeMenu: 'sustainability'
  });
});

router.post('/sustainability', upload.fields([{ name: 'thumbnail' }, { name: 'banner' }]), async (req, res, next) => {
  try {
    const { title, short_description, full_description, category, sort_order, active } = req.body;
    const slug = makeSlug(title);
    let thumb = null, banner = null;
    if (req.files?.thumbnail?.[0]) {
      thumb = getRelativePath(req.files.thumbnail[0]);
      await processImage(path.join(__dirname, '..', 'public', thumb), { maxWidth: 1200 });
    }
    if (req.files?.banner?.[0]) {
      banner = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', banner), { maxWidth: 2000 });
    }
    await query(
      `INSERT INTO sustainability (title, slug, short_description, full_description, thumbnail, banner, category, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, short_description, sanitizeContent(full_description), thumb, banner, category, sort_order || 0, active ? 1 : 0]
    );
    req.flash('success', 'เพิ่มรายการเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/sustainability`);
  } catch (err) { next(err); }
});

router.get('/sustainability/:id/edit', async (req, res, next) => {
  try {
    const items = await query('SELECT * FROM sustainability WHERE id = ?', [req.params.id]);
    if (!items[0]) return res.redirect(`${ADMIN_BASE}/sustainability`);
    res.render('admin/sustainability/form', {
      title: 'แก้ไขรายการ',
      item: items[0],
      activeMenu: 'sustainability'
    });
  } catch (err) { next(err); }
});

router.post('/sustainability/:id', upload.fields([{ name: 'thumbnail' }, { name: 'banner' }]), async (req, res, next) => {
  try {
    const { title, short_description, full_description, category, sort_order, active } = req.body;
    let extraSet = '', extraParams = [];
    if (req.files?.thumbnail?.[0]) {
      const p = getRelativePath(req.files.thumbnail[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 1200 });
      extraSet += ', thumbnail = ?';
      extraParams.push(p);
    }
    if (req.files?.banner?.[0]) {
      const p = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 2000 });
      extraSet += ', banner = ?';
      extraParams.push(p);
    }
    await query(
      `UPDATE sustainability SET title=?, short_description=?, full_description=?, category=?, sort_order=?, active=? ${extraSet} WHERE id=?`,
      [title, short_description, sanitizeContent(full_description), category, sort_order || 0, active ? 1 : 0, ...extraParams, req.params.id]
    );
    req.flash('success', 'อัปเดตเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/sustainability`);
  } catch (err) { next(err); }
});

router.post('/sustainability/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM sustainability WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/sustainability`);
  } catch (err) { next(err); }
});

// ===== JOB APPLICATIONS =====
router.get('/applications', async (req, res, next) => {
  try {
    const status = req.query.status || 'all';
    let where = '1=1';
    let params = [];
    if (status !== 'all') {
      where = 'a.status = ?';
      params = [status];
    }
    const apps = await query(
      `SELECT a.*, c.slug AS career_slug, c.title AS current_job_title
       FROM career_applications a
       LEFT JOIN careers c ON a.career_id = c.id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT 200`,
      params
    );
    const counts = await query(
      `SELECT status, COUNT(*) AS cnt FROM career_applications GROUP BY status`
    );
    const counter = { all: 0, new: 0, reviewing: 0, contacted: 0, rejected: 0, hired: 0 };
    counts.forEach(c => { counter[c.status] = c.cnt; counter.all += c.cnt; });

    res.render('admin/applications/index', {
      title: 'ใบสมัครงาน',
      applications: apps,
      counter,
      currentStatus: status,
      activeMenu: 'applications'
    });
  } catch (err) { next(err); }
});

router.get('/applications/:id', async (req, res, next) => {
  try {
    const apps = await query(
      `SELECT a.*, c.slug AS career_slug, c.title AS current_job_title
       FROM career_applications a
       LEFT JOIN careers c ON a.career_id = c.id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!apps[0]) {
      req.flash('error', 'ไม่พบใบสมัคร');
      return res.redirect(`${ADMIN_BASE}/applications`);
    }
    res.render('admin/applications/detail', {
      title: 'รายละเอียดใบสมัคร',
      application: apps[0],
      activeMenu: 'applications'
    });
  } catch (err) { next(err); }
});

router.post('/applications/:id', async (req, res, next) => {
  try {
    const status = ['new', 'reviewing', 'contacted', 'rejected', 'hired'].includes(req.body.status) ? req.body.status : 'new';
    const notes = (req.body.admin_notes || '').toString().substring(0, 5000);
    await query(
      'UPDATE career_applications SET status = ?, admin_notes = ? WHERE id = ?',
      [status, notes, req.params.id]
    );
    req.flash('success', 'อัปเดตสถานะแล้ว');
    res.redirect(`${ADMIN_BASE}/applications/${req.params.id}`);
  } catch (err) { next(err); }
});

router.post('/applications/:id/delete', async (req, res, next) => {
  try {
    // Also delete the resume file
    const apps = await query('SELECT resume_path FROM career_applications WHERE id = ?', [req.params.id]);
    if (apps[0] && apps[0].resume_path) {
      try {
        const filepath = path.join(__dirname, '..', 'public', apps[0].resume_path);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      } catch (e) { console.error('Resume delete failed:', e.message); }
    }
    await query('DELETE FROM career_applications WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบใบสมัครแล้ว');
    res.redirect(`${ADMIN_BASE}/applications`);
  } catch (err) { next(err); }
});

// ===== CAREERS =====
router.get('/careers', async (req, res, next) => {
  try {
    const jobs = await query('SELECT * FROM careers ORDER BY created_at DESC');
    res.render('admin/careers/index', {
      title: 'จัดการตำแหน่งงาน',
      jobs,
      activeMenu: 'careers'
    });
  } catch (err) { next(err); }
});

router.get('/careers/new', (req, res) => {
  res.render('admin/careers/form', {
    title: 'เพิ่มตำแหน่งงาน',
    job: {},
    activeMenu: 'careers'
  });
});

router.post('/careers', async (req, res, next) => {
  try {
    const { title, department, location, job_type, description, requirements, benefits, salary_range, apply_email, closing_date, featured, active } = req.body;
    const slug = makeSlug(title);
    await query(
      `INSERT INTO careers (title, slug, department, location, job_type, description, requirements, benefits, salary_range, apply_email, closing_date, featured, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, department, location, job_type || 'full-time',
       sanitizeContent(description), sanitizeContent(requirements), sanitizeContent(benefits),
       salary_range, apply_email, closing_date || null, featured ? 1 : 0, active ? 1 : 0]
    );
    req.flash('success', 'เพิ่มตำแหน่งงานเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/careers`);
  } catch (err) { next(err); }
});

router.get('/careers/:id/edit', async (req, res, next) => {
  try {
    const jobs = await query('SELECT * FROM careers WHERE id = ?', [req.params.id]);
    if (!jobs[0]) return res.redirect(`${ADMIN_BASE}/careers`);
    res.render('admin/careers/form', {
      title: 'แก้ไขตำแหน่งงาน',
      job: jobs[0],
      activeMenu: 'careers'
    });
  } catch (err) { next(err); }
});

router.post('/careers/:id', async (req, res, next) => {
  try {
    const { title, department, location, job_type, description, requirements, benefits, salary_range, apply_email, closing_date, featured, active } = req.body;
    await query(
      `UPDATE careers SET title=?, department=?, location=?, job_type=?, description=?, requirements=?, benefits=?, salary_range=?, apply_email=?, closing_date=?, featured=?, active=? WHERE id=?`,
      [title, department, location, job_type, sanitizeContent(description), sanitizeContent(requirements), sanitizeContent(benefits), salary_range, apply_email, closing_date || null, featured ? 1 : 0, active ? 1 : 0, req.params.id]
    );
    req.flash('success', 'อัปเดตเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/careers`);
  } catch (err) { next(err); }
});

router.post('/careers/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM careers WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/careers`);
  } catch (err) { next(err); }
});

// ===== PAGES =====
router.get('/pages', async (req, res, next) => {
  try {
    const pages = await query('SELECT * FROM pages ORDER BY sort_order ASC');
    res.render('admin/pages/index', {
      title: 'จัดการหน้าเว็บ',
      pages,
      activeMenu: 'pages'
    });
  } catch (err) { next(err); }
});

router.get('/pages/:id/edit', async (req, res, next) => {
  try {
    const pages = await query('SELECT * FROM pages WHERE id = ?', [req.params.id]);
    if (!pages[0]) return res.redirect(`${ADMIN_BASE}/pages`);
    const sections = await query('SELECT * FROM page_sections WHERE page_id = ? ORDER BY sort_order ASC', [req.params.id]);
    res.render('admin/pages/form', {
      title: 'แก้ไขหน้า: ' + pages[0].title,
      page: pages[0],
      sections,
      activeMenu: 'pages'
    });
  } catch (err) { next(err); }
});

router.post('/pages/:id', upload.single('banner_image'), async (req, res, next) => {
  try {
    const { title, banner_title, banner_subtitle, content, meta_title, meta_description } = req.body;
    let extraSet = '', extraParams = [];
    if (req.file) {
      const p = getRelativePath(req.file);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 2000 });
      extraSet = ', banner_image = ?';
      extraParams.push(p);
    }
    await query(
      `UPDATE pages SET title=?, banner_title=?, banner_subtitle=?, content=?, meta_title=?, meta_description=? ${extraSet} WHERE id=?`,
      [title, banner_title, banner_subtitle, sanitizeContent(content), meta_title, meta_description, ...extraParams, req.params.id]
    );
    req.flash('success', 'อัปเดตหน้าเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/pages/${req.params.id}/edit`);
  } catch (err) { next(err); }
});

// ===== MENUS =====
router.get('/menus', async (req, res, next) => {
  try {
    const headerMenu = await query('SELECT * FROM menus WHERE location = ? ORDER BY sort_order ASC', ['header']);
    const footerMenu = await query('SELECT * FROM menus WHERE location = ? ORDER BY sort_order ASC', ['footer']);
    const footerMenu2 = await query('SELECT * FROM menus WHERE location = ? ORDER BY sort_order ASC', ['footer_2']);
    const footerMenu3 = await query('SELECT * FROM menus WHERE location = ? ORDER BY sort_order ASC', ['footer_3']);
    res.render('admin/menus', {
      title: 'จัดการเมนู',
      headerMenu, footerMenu, footerMenu2, footerMenu3,
      activeMenu: 'menus'
    });
  } catch (err) { next(err); }
});

router.post('/menus', async (req, res, next) => {
  try {
    const { location, label, url, open_new_tab } = req.body;
    const [{ max_order }] = await query('SELECT IFNULL(MAX(sort_order), 0) as max_order FROM menus WHERE location = ?', [location]);
    await query(
      'INSERT INTO menus (location, label, url, sort_order, open_new_tab) VALUES (?, ?, ?, ?, ?)',
      [location, label, url, max_order + 1, open_new_tab ? 1 : 0]
    );
    req.flash('success', 'เพิ่มเมนูเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/menus`);
  } catch (err) { next(err); }
});

router.post('/menus/:id', async (req, res, next) => {
  try {
    const { label, url, open_new_tab, active } = req.body;
    await query(
      'UPDATE menus SET label=?, url=?, open_new_tab=?, active=? WHERE id=?',
      [label, url, open_new_tab ? 1 : 0, active ? 1 : 0, req.params.id]
    );
    req.flash('success', 'อัปเดตเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/menus`);
  } catch (err) { next(err); }
});

router.post('/menus/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM menus WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบเมนูเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/menus`);
  } catch (err) { next(err); }
});

// ===== SETTINGS =====
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await query('SELECT * FROM settings ORDER BY setting_group ASC, setting_key ASC');
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.setting_group]) grouped[s.setting_group] = [];
      grouped[s.setting_group].push(s);
    });
    res.render('admin/settings', {
      title: 'การตั้งค่าเว็บไซต์',
      grouped,
      activeMenu: 'settings'
    });
  } catch (err) { next(err); }
});

router.post('/settings', (req, res, next) => {
  // Wrap multer with custom error handler
  upload.any()(req, res, async (err) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      req.flash('error', 'อัปโหลดไฟล์ผิดพลาด: ' + err.message);
      return res.redirect(`${ADMIN_BASE}/settings`);
    }

    try {
      // Process image uploads
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const relPath = getRelativePath(file);
            if (!relPath) {
              console.error(`✗ Could not get relative path for ${file.fieldname}`);
              continue;
            }
            const fullPath = path.join(__dirname, '..', 'public', relPath);

            // Only run Sharp on actual image files (skip PDFs etc)
            if (file.mimetype && file.mimetype.startsWith('image/')) {
              try {
                await processImage(fullPath, { maxWidth: 2000 });
              } catch (sharpErr) {
                console.error(`Sharp processing failed for ${file.fieldname}, continuing:`, sharpErr.message);
              }
            }

            // Save the path to settings — even if Sharp fails the file is uploaded
            await query(
              'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
              [relPath, file.fieldname]
            );
            console.log(`✓ Settings: uploaded ${file.fieldname} → ${relPath}`);
          } catch (fileErr) {
            console.error(`✗ Settings upload error for ${file.fieldname}:`, fileErr.message);
            // Continue with other files even if one fails
          }
        }
      }
      // Process text/bool fields
      const settingsList = await query('SELECT setting_key, setting_type FROM settings');
      for (const s of settingsList) {
        if (s.setting_type === 'image') continue; // already handled
        let value = req.body[s.setting_key];
        if (s.setting_type === 'bool') {
          value = value ? '1' : '0';
        } else if (value === undefined) {
          // Skip text fields not in the submission
          continue;
        }
        try {
          await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, s.setting_key]);
        } catch (e) {
          console.error(`Failed to update setting ${s.setting_key}:`, e.message);
        }
      }
      req.flash('success', 'บันทึกการตั้งค่าเรียบร้อย');
      res.redirect(`${ADMIN_BASE}/settings`);
    } catch (err) {
      console.error('Settings save error:', err);
      req.flash('error', 'เกิดข้อผิดพลาด: ' + (err.message || 'Unknown'));
      res.redirect(`${ADMIN_BASE}/settings`);
    }
  });
});

// ===== CONTACT MESSAGES =====
router.get('/messages', async (req, res, next) => {
  try {
    const messages = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.render('admin/messages', {
      title: 'ข้อความติดต่อ',
      messages,
      activeMenu: 'messages'
    });
  } catch (err) { next(err); }
});

router.get('/messages/:id', async (req, res, next) => {
  try {
    const messages = await query('SELECT * FROM contact_messages WHERE id = ?', [req.params.id]);
    if (!messages[0]) return res.redirect(`${ADMIN_BASE}/messages`);
    await query('UPDATE contact_messages SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.render('admin/message-detail', {
      title: 'อ่านข้อความ',
      message: messages[0],
      activeMenu: 'messages'
    });
  } catch (err) { next(err); }
});

router.post('/messages/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบข้อความเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/messages`);
  } catch (err) { next(err); }
});

// ===== USERS (admin only) =====
router.get('/users', requireRole('admin'), async (req, res, next) => {
  try {
    const users = await query('SELECT id, email, name, role, active, last_login, created_at FROM users ORDER BY created_at DESC');
    res.render('admin/users/index', {
      title: 'จัดการผู้ใช้',
      users,
      activeMenu: 'users'
    });
  } catch (err) { next(err); }
});

router.get('/users/new', requireRole('admin'), (req, res) => {
  res.render('admin/users/form', {
    title: 'เพิ่มผู้ใช้ใหม่',
    user: {},
    activeMenu: 'users'
  });
});

router.post('/users', requireRole('admin'), async (req, res, next) => {
  try {
    const { email, name, password, role, active } = req.body;
    if (!email || !password || !name) {
      req.flash('error', 'กรุณากรอกข้อมูลให้ครบ');
      return res.redirect(`${ADMIN_BASE}/users/new`);
    }
    const hash = await bcrypt.hash(password, 12);
    await query(
      'INSERT INTO users (email, name, password, role, active) VALUES (?, ?, ?, ?, ?)',
      [email.toLowerCase().trim(), name, hash, role || 'editor', active ? 1 : 0]
    );
    req.flash('success', 'เพิ่มผู้ใช้เรียบร้อย');
    res.redirect(`${ADMIN_BASE}/users`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'อีเมลนี้ถูกใช้แล้ว');
      return res.redirect(`${ADMIN_BASE}/users/new`);
    }
    next(err);
  }
});

router.get('/users/:id/edit', requireRole('admin'), async (req, res, next) => {
  try {
    const users = await query('SELECT id, email, name, role, active FROM users WHERE id = ?', [req.params.id]);
    if (!users[0]) return res.redirect(`${ADMIN_BASE}/users`);
    res.render('admin/users/form', {
      title: 'แก้ไขผู้ใช้',
      user: users[0],
      activeMenu: 'users'
    });
  } catch (err) { next(err); }
});

router.post('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { email, name, password, role, active } = req.body;
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 12);
      await query(
        'UPDATE users SET email=?, name=?, password=?, role=?, active=? WHERE id=?',
        [email.toLowerCase().trim(), name, hash, role, active ? 1 : 0, req.params.id]
      );
    } else {
      await query(
        'UPDATE users SET email=?, name=?, role=?, active=? WHERE id=?',
        [email.toLowerCase().trim(), name, role, active ? 1 : 0, req.params.id]
      );
    }
    req.flash('success', 'อัปเดตเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/users`);
  } catch (err) { next(err); }
});

router.post('/users/:id/delete', requireRole('admin'), async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.session.user.id) {
      req.flash('error', 'ไม่สามารถลบบัญชีของตัวเองได้');
      return res.redirect(`${ADMIN_BASE}/users`);
    }
    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    req.flash('success', 'ลบผู้ใช้เรียบร้อย');
    res.redirect(`${ADMIN_BASE}/users`);
  } catch (err) { next(err); }
});

// ===== PROFILE =====
router.get('/profile', async (req, res, next) => {
  try {
    const users = await query('SELECT id, email, name, role FROM users WHERE id = ?', [req.session.user.id]);
    res.render('admin/profile', {
      title: 'ข้อมูลของฉัน',
      user: users[0],
      activeMenu: 'profile'
    });
  } catch (err) { next(err); }
});

router.post('/profile', async (req, res, next) => {
  try {
    const { name, current_password, new_password } = req.body;
    const users = await query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    const user = users[0];

    if (new_password) {
      if (!current_password || !(await bcrypt.compare(current_password, user.password))) {
        req.flash('error', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
        return res.redirect(`${ADMIN_BASE}/profile`);
      }
      const hash = await bcrypt.hash(new_password, 12);
      await query('UPDATE users SET name=?, password=? WHERE id=?', [name, hash, user.id]);
    } else {
      await query('UPDATE users SET name=? WHERE id=?', [name, user.id]);
    }

    req.session.user.name = name;
    req.flash('success', 'อัปเดตข้อมูลเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/profile`);
  } catch (err) { next(err); }
});

module.exports = router;
