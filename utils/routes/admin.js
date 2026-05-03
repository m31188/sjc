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
  // Set adminLang from cookie - this is referenced by every admin view
  res.locals.adminLang = req.cookies && req.cookies.admin_lang === 'en' ? 'en' : 'th';
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
  res.locals.activeMenu = 'homepage-manager';
  const errors = [];

  // Self-healing: ensure all required settings exist before rendering.
  const requiredSettings = [
    ['home_show_about', '1', 'bool', 'homepage', 'Show About Section on Homepage', ''],
    ['home_show_businesses', '1', 'bool', 'homepage', 'Show Businesses Section', ''],
    ['home_show_news', '1', 'bool', 'homepage', 'Show News Section', ''],
    ['home_show_sustainability', '1', 'bool', 'homepage', 'Show Sustainability Section', ''],
    ['home_show_stats', '1', 'bool', 'homepage', 'Show Stats Counter', ''],
    ['home_about_title', 'About SJC', 'text', 'homepage', 'About Title', ''],
    ['home_about_text', '', 'text', 'homepage', 'About Text', ''],
    ['home_about_image', '/images/about-placeholder.jpg', 'image', 'homepage', 'About Image', ''],
    ['home_stats_1_number', '50+', 'text', 'homepage', 'Stat 1 Number', ''],
    ['home_stats_1_label', 'Years of Experience', 'text', 'homepage', 'Stat 1 Label', ''],
    ['home_stats_1_unit', '', 'text', 'homepage', 'Stat 1 Unit', ''],
    ['home_stats_2_number', '1000+', 'text', 'homepage', 'Stat 2 Number', ''],
    ['home_stats_2_label', 'Employees', 'text', 'homepage', 'Stat 2 Label', ''],
    ['home_stats_2_unit', '', 'text', 'homepage', 'Stat 2 Unit', ''],
    ['home_stats_3_number', '20+', 'text', 'homepage', 'Stat 3 Number', ''],
    ['home_stats_3_label', 'Countries', 'text', 'homepage', 'Stat 3 Label', ''],
    ['home_stats_3_unit', '', 'text', 'homepage', 'Stat 3 Unit', ''],
    ['home_stats_4_number', '100+', 'text', 'homepage', 'Stat 4 Number', ''],
    ['home_stats_4_label', 'Awards', 'text', 'homepage', 'Stat 4 Label', ''],
    ['home_stats_4_unit', '', 'text', 'homepage', 'Stat 4 Unit', ''],
    ['home_stats_5_number', 'TOP 1', 'text', 'homepage', 'Stat 5 Number', ''],
    ['home_stats_5_label', 'Sustainability Index', 'text', 'homepage', 'Stat 5 Label', ''],
    ['home_stats_5_unit', '%', 'text', 'homepage', 'Stat 5 Unit', ''],
    ['highlights_title', 'SJC Highlights', 'text', 'homepage', 'Highlights Title', ''],
    ['feature_stories_lead', '', 'text', 'homepage', 'Feature Stories Lead', ''],
    ['business_panel_desc', 'Businesses driven by innovation and sustainability', 'text', 'homepage', 'Business Panel Description', ''],
    ['big_banner_image', '/images/banner-default.jpg', 'image', 'homepage', 'Big Banner Image', ''],
    ['big_banner_url', '/about', 'text', 'homepage', 'Big Banner URL', ''],
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
      errors.push(`Could not ensure setting "${k}": ${e.message}`);
      console.error('[HPM GET] insert error', k, ':', e.message);
    }
  }

  // Pull all homepage and section_backgrounds settings into a single map
  let settings = {};
  try {
    const rows = await query(
      `SELECT setting_key, setting_value, setting_type, label, description
       FROM settings
       WHERE setting_group IN ('homepage', 'section_backgrounds', 'defaults')
       ORDER BY setting_group, setting_key`
    );
    rows.forEach(r => { settings[r.setting_key] = r; });
  } catch (e) {
    errors.push(`Could not load settings: ${e.message}`);
    console.error('[HPM GET] select error:', e.message);
  }

  // Provide safe stub for any missing setting the template might still reference
  const allKeys = requiredSettings.map(s => s[0]);
  for (const k of allKeys) {
    if (!settings[k]) {
      settings[k] = { setting_key: k, setting_value: '', setting_type: 'text', label: k, description: '' };
    }
  }

  try {
    res.render('admin/homepage-manager', {
      title: 'Homepage Manager',
      settings,
      hpmErrors: errors
    });
  } catch (e) {
    console.error('[HPM GET] render error:', e);
    // Last-resort: render a diagnostic page so at least something shows up
    res.status(200).send(`
<!DOCTYPE html><html><head><meta charset="utf-8"><title>HPM Diagnostic</title>
<style>body{font-family:system-ui;padding:40px;max-width:900px;margin:0 auto}
h1{color:#c8102e}pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow:auto}</style>
</head><body>
<h1>Homepage Manager — diagnostic</h1>
<p>The homepage manager template failed to render. Errors collected during this request:</p>
<pre>${errors.map(e => e.replace(/</g, '&lt;')).join('\n')}\n\nRender error: ${(e.message||'').replace(/</g, '&lt;')}</pre>
<p>Settings loaded from DB: <strong>${Object.keys(settings).length}</strong> keys</p>
<p><a href="/${ADMIN_BASE.slice(1)}/dashboard">← Back to dashboard</a></p>
</body></html>
    `);
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
          `SELECT setting_key, setting_type FROM settings WHERE setting_group IN ('homepage', 'section_backgrounds', 'defaults')`
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

router.post('/sliders', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobile_image', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res, next) => {
  try {
    const { title, subtitle, description, button_text, button_url, text_position, text_color, sort_order, active } = req.body;
    let imagePath = req.body.image_url || null;
    let mobileImagePath = req.body.mobile_image_url || null;
    let videoPath = req.body.video_url || null;

    // Handle image upload (overrides URL if file uploaded)
    if (req.files && req.files.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      imagePath = getRelativePath(imageFile);
      try {
        await processImage(path.join(__dirname, '..', 'public', imagePath), { maxWidth: 2000 });
      } catch (e) { console.error('Sharp warning:', e.message); }
    }

    // Handle mobile image upload
    if (req.files && req.files.mobile_image && req.files.mobile_image[0]) {
      const mFile = req.files.mobile_image[0];
      mobileImagePath = getRelativePath(mFile);
      try {
        await processImage(path.join(__dirname, '..', 'public', mobileImagePath), { maxWidth: 1200 });
      } catch (e) { console.error('Sharp warning:', e.message); }
    }

    // Handle video upload (overrides URL field if file uploaded)
    if (req.files && req.files.video_file && req.files.video_file[0]) {
      videoPath = getRelativePath(req.files.video_file[0]);
    }

    const result = await query(
      `INSERT INTO sliders (title, subtitle, description, image, mobile_image, video_url, button_text, button_url, text_position, text_color, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, subtitle, description, imagePath || '/images/slide-placeholder.jpg',
       mobileImagePath, videoPath, button_text, button_url, text_position || 'left', text_color || '#ffffff',
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

router.post('/sliders/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobile_image', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res, next) => {
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
    } else if (req.body.image_url) {
      // From media library picker
      setClauses.push('image=?');
      params.push(req.body.image_url);
    }

    // Mobile image
    if (req.files && req.files.mobile_image && req.files.mobile_image[0]) {
      const mFile = req.files.mobile_image[0];
      const mPath = getRelativePath(mFile);
      try {
        await processImage(path.join(__dirname, '..', 'public', mPath), { maxWidth: 1200 });
      } catch (e) { console.error('Sharp warning:', e.message); }
      setClauses.push('mobile_image=?');
      params.push(mPath);
    } else if (req.body.mobile_image_url !== undefined) {
      setClauses.push('mobile_image=?');
      params.push(req.body.mobile_image_url || null);
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

router.post('/news', upload.fields([
  { name: 'thumbnail' }, { name: 'banner' },
  { name: 'section2_image' }, { name: 'section3_image' }, { name: 'section4_image' }
]), async (req, res, next) => {
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

    // Process section images (2, 3, 4)
    const sectionImages = {};
    for (const n of [2, 3, 4]) {
      const fieldKey = `section${n}_image`;
      if (req.files?.[fieldKey]?.[0]) {
        sectionImages[n] = getRelativePath(req.files[fieldKey][0]);
        try { await processImage(path.join(__dirname, '..', 'public', sectionImages[n]), { maxWidth: 1600 }); } catch(e) {}
      }
    }

    // Sanitize section bodies safely
    const safeBody = (s) => {
      if (!s) return null;
      try { return sanitizeContent(s); } catch(e) { return s; }
    };

    await query(
      `INSERT INTO news (title, slug, excerpt, content, thumbnail, banner, category_id, author, tags, featured, published, meta_title, meta_description,
        section2_heading, section2_body, section2_image,
        section3_heading, section3_body, section3_image,
        section4_heading, section4_body, section4_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, excerpt, safeBody(content), thumb, banner,
       category_id || null, author, tags, featured ? 1 : 0, published ? 1 : 0,
       meta_title, meta_description,
       req.body.section2_heading || null, safeBody(req.body.section2_body), sectionImages[2] || null,
       req.body.section3_heading || null, safeBody(req.body.section3_body), sectionImages[3] || null,
       req.body.section4_heading || null, safeBody(req.body.section4_body), sectionImages[4] || null]
    );
    req.flash('success', 'เพิ่มข่าวเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/news`);
  } catch (err) {
    console.error('News create error:', err);
    next(err);
  }
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

router.post('/news/:id', upload.fields([
  { name: 'thumbnail' }, { name: 'banner' },
  { name: 'section2_image' }, { name: 'section3_image' }, { name: 'section4_image' }
]), async (req, res, next) => {
  try {
    const { title, slug, excerpt, content, category_id, author, tags, featured, published, meta_title, meta_description } = req.body;
    const finalSlug = slug?.trim() || makeSlug(title);

    let extraSet = '', extraParams = [];
    if (req.files?.thumbnail?.[0]) {
      const p = getRelativePath(req.files.thumbnail[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 1200 });
      extraSet += ', thumbnail = ?';
      extraParams.push(p);
    } else if (req.body.thumbnail_url) {
      extraSet += ', thumbnail = ?';
      extraParams.push(req.body.thumbnail_url);
    }
    if (req.files?.banner?.[0]) {
      const p = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 2000 });
      extraSet += ', banner = ?';
      extraParams.push(p);
    } else if (req.body.banner_url) {
      extraSet += ', banner = ?';
      extraParams.push(req.body.banner_url);
    }

    // Process section images: only update if a new file was uploaded
    for (const n of [2, 3, 4]) {
      const fieldKey = `section${n}_image`;
      if (req.files?.[fieldKey]?.[0]) {
        const p = getRelativePath(req.files[fieldKey][0]);
        try { await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 1600 }); } catch(e) {}
        extraSet += `, section${n}_image = ?`;
        extraParams.push(p);
      } else if (req.body[`section${n}_image_url`]) {
        extraSet += `, section${n}_image = ?`;
        extraParams.push(req.body[`section${n}_image_url`]);
      } else if (req.body[`section${n}_image_remove`] === '1') {
        extraSet += `, section${n}_image = NULL`;
      }
    }

    // Sanitize bodies safely
    const safeBody = (s) => {
      if (!s) return null;
      try { return sanitizeContent(s); } catch(e) { return s; }
    };

    await query(
      `UPDATE news SET title=?, slug=?, excerpt=?, content=?, category_id=?, author=?, tags=?,
       featured=?, published=?, meta_title=?, meta_description=?,
       section2_heading=?, section2_body=?,
       section3_heading=?, section3_body=?,
       section4_heading=?, section4_body=?,
       title_en=?, excerpt_en=?, content_en=?,
       section2_heading_en=?, section2_body_en=?,
       section3_heading_en=?, section3_body_en=?,
       section4_heading_en=?, section4_body_en=?
       ${extraSet} WHERE id=?`,
      [title, finalSlug, excerpt, safeBody(content), category_id || null,
       author, tags, featured ? 1 : 0, published ? 1 : 0, meta_title, meta_description,
       req.body.section2_heading || null, safeBody(req.body.section2_body),
       req.body.section3_heading || null, safeBody(req.body.section3_body),
       req.body.section4_heading || null, safeBody(req.body.section4_body),
       req.body.title_en || null, req.body.excerpt_en || null, safeBody(req.body.content_en),
       req.body.section2_heading_en || null, safeBody(req.body.section2_body_en),
       req.body.section3_heading_en || null, safeBody(req.body.section3_body_en),
       req.body.section4_heading_en || null, safeBody(req.body.section4_body_en),
       ...extraParams, req.params.id]
    );
    req.flash('success', 'อัปเดตข่าวเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/news`);
  } catch (err) {
    console.error('News update error:', err);
    next(err);
  }
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
    const businesses = await query('SELECT * FROM businesses ORDER BY created_at DESC, sort_order ASC');
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

router.post('/businesses', upload.fields([
  { name: 'thumbnail' }, { name: 'banner' }, { name: 'icon' },
  { name: 'section2_image' }, { name: 'section3_image' }, { name: 'section4_image' }
]), async (req, res, next) => {
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
    const sectionImages = {};
    for (const n of [2, 3, 4]) {
      const fk = `section${n}_image`;
      if (req.files?.[fk]?.[0]) {
        sectionImages[n] = getRelativePath(req.files[fk][0]);
        try { await processImage(path.join(__dirname, '..', 'public', sectionImages[n]), { maxWidth: 1600 }); } catch(e) {}
      }
    }
    const safeBody = (s) => {
      if (!s) return null;
      try { return sanitizeContent(s); } catch(e) { return s; }
    };
    await query(
      `INSERT INTO businesses (name, slug, short_description, full_description, thumbnail, banner, icon, website_url, sort_order, featured, active,
        section2_heading, section2_body, section2_image,
        section3_heading, section3_body, section3_image,
        section4_heading, section4_body, section4_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, short_description, safeBody(full_description), thumb, banner, icon,
       website_url, sort_order || 0, featured ? 1 : 0, active ? 1 : 0,
       req.body.section2_heading || null, safeBody(req.body.section2_body), sectionImages[2] || null,
       req.body.section3_heading || null, safeBody(req.body.section3_body), sectionImages[3] || null,
       req.body.section4_heading || null, safeBody(req.body.section4_body), sectionImages[4] || null]
    );
    req.flash('success', 'เพิ่มธุรกิจเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/businesses`);
  } catch (err) {
    console.error('Business create error:', err);
    next(err);
  }
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

router.post('/businesses/:id', upload.fields([
  { name: 'thumbnail' }, { name: 'banner' }, { name: 'icon' },
  { name: 'section2_image' }, { name: 'section3_image' }, { name: 'section4_image' }
]), async (req, res, next) => {
  try {
    const { name, short_description, full_description, website_url, sort_order, featured, active } = req.body;
    let extraSet = '', extraParams = [];
    if (req.files?.thumbnail?.[0]) {
      const p = getRelativePath(req.files.thumbnail[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 1200 });
      extraSet += ', thumbnail = ?';
      extraParams.push(p);
    } else if (req.body.thumbnail_url) {
      extraSet += ', thumbnail = ?';
      extraParams.push(req.body.thumbnail_url);
    }
    if (req.files?.banner?.[0]) {
      const p = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 2000 });
      extraSet += ', banner = ?';
      extraParams.push(p);
    } else if (req.body.banner_url) {
      extraSet += ', banner = ?';
      extraParams.push(req.body.banner_url);
    }
    if (req.files?.icon?.[0]) {
      extraSet += ', icon = ?';
      extraParams.push(getRelativePath(req.files.icon[0]));
    }
    for (const n of [2, 3, 4]) {
      const fk = `section${n}_image`;
      if (req.files?.[fk]?.[0]) {
        const p = getRelativePath(req.files[fk][0]);
        try { await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 1600 }); } catch(e) {}
        extraSet += `, section${n}_image = ?`;
        extraParams.push(p);
      } else if (req.body[`section${n}_image_url`]) {
        extraSet += `, section${n}_image = ?`;
        extraParams.push(req.body[`section${n}_image_url`]);
      } else if (req.body[`section${n}_image_remove`] === '1') {
        extraSet += `, section${n}_image = NULL`;
      }
    }
    const safeBody = (s) => {
      if (!s) return null;
      try { return sanitizeContent(s); } catch(e) { return s; }
    };
    await query(
      `UPDATE businesses SET name=?, short_description=?, full_description=?, website_url=?,
       sort_order=?, featured=?, active=?,
       section2_heading=?, section2_body=?,
       section3_heading=?, section3_body=?,
       section4_heading=?, section4_body=?,
       name_en=?, short_description_en=?, full_description_en=?,
       section2_heading_en=?, section2_body_en=?,
       section3_heading_en=?, section3_body_en=?,
       section4_heading_en=?, section4_body_en=?
       ${extraSet} WHERE id=?`,
      [name, short_description, safeBody(full_description), website_url,
       sort_order || 0, featured ? 1 : 0, active ? 1 : 0,
       req.body.section2_heading || null, safeBody(req.body.section2_body),
       req.body.section3_heading || null, safeBody(req.body.section3_body),
       req.body.section4_heading || null, safeBody(req.body.section4_body),
       req.body.name_en || null, req.body.short_description_en || null, safeBody(req.body.full_description_en),
       req.body.section2_heading_en || null, safeBody(req.body.section2_body_en),
       req.body.section3_heading_en || null, safeBody(req.body.section3_body_en),
       req.body.section4_heading_en || null, safeBody(req.body.section4_body_en),
       ...extraParams, req.params.id]
    );
    req.flash('success', 'อัปเดตธุรกิจเรียบร้อย');
    res.redirect(`${ADMIN_BASE}/businesses`);
  } catch (err) {
    console.error('Business update error:', err);
    next(err);
  }
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
    const items = await query('SELECT * FROM sustainability ORDER BY created_at DESC, sort_order ASC');
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
    } else if (req.body.thumbnail_url) {
      extraSet += ', thumbnail = ?';
      extraParams.push(req.body.thumbnail_url);
    }
    if (req.files?.banner?.[0]) {
      const p = getRelativePath(req.files.banner[0]);
      await processImage(path.join(__dirname, '..', 'public', p), { maxWidth: 2000 });
      extraSet += ', banner = ?';
      extraParams.push(p);
    } else if (req.body.banner_url) {
      extraSet += ', banner = ?';
      extraParams.push(req.body.banner_url);
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

// ===== MEDIA LIBRARY =====
// Browse all files previously uploaded so admin can re-use without re-uploading.
router.get('/media', async (req, res, next) => {
  try {
    res.locals.activeMenu = 'media';
    const fs = require('fs');
    const path = require('path');
    const files = [];
    const seen = new Set();
    const debug = { tried: [], walked: [], counts: {} };

    function walk(dir, urlBase) {
      try {
        if (!fs.existsSync(dir)) {
          debug.tried.push({ dir, exists: false });
          return;
        }
        debug.walked.push(dir);
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const it of items) {
          const full = path.join(dir, it.name);
          const url = urlBase + '/' + it.name;
          if (it.isDirectory()) {
            walk(full, url);
          } else {
            const ext = path.extname(it.name).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
              try {
                const stat = fs.statSync(full);
                if (!seen.has(url)) {
                  seen.add(url);
                  files.push({ url, name: it.name, size: stat.size, mtime: stat.mtime.getTime() });
                }
              } catch(e) {}
            }
          }
        }
      } catch(e) {
        console.error('Media walk error:', dir, e.message);
        debug.tried.push({ dir, error: e.message });
      }
    }

    // Try multiple possible paths - on Plesk/Phusion Passenger the working dir varies
    const possiblePaths = [
      path.join(__dirname, '..', 'public', 'uploads'),
      path.join(process.cwd(), 'public', 'uploads'),
      path.join(process.cwd(), 'uploads'),
      '/var/www/vhosts/cairoit.co.th/scg.cairoit.co.th/public/uploads',
      '/var/www/vhosts/cairoit.co.th/scg.cairoit.co.th/uploads'
    ];
    for (const p of possiblePaths) {
      walk(p, '/uploads');
    }
    debug.counts.diskFiles = files.length;

    // ALSO collect image URLs referenced in the database - this is the
    // most reliable way to find images that have actually been used
    try {
      const fromDb = [];
      const collect = (rows, ...keys) => {
        for (const r of rows || []) {
          for (const k of keys) {
            const v = r[k];
            if (v && typeof v === 'string' && v.startsWith('/uploads/') && !seen.has(v)) {
              seen.add(v);
              const name = v.split('/').pop();
              fromDb.push({ url: v, name, size: 0, mtime: Date.now(), fromDb: true });
            }
          }
        }
      };
      collect(await query('SELECT image FROM sliders').catch(() => []), 'image');
      collect(await query('SELECT thumbnail, banner FROM news').catch(() => []), 'thumbnail', 'banner');
      collect(await query('SELECT thumbnail, banner FROM businesses').catch(() => []), 'thumbnail', 'banner');
      collect(await query('SELECT thumbnail, banner FROM sustainability').catch(() => []), 'thumbnail', 'banner');
      collect(await query('SELECT thumbnail FROM careers').catch(() => []), 'thumbnail');
      collect(await query('SELECT image_url FROM content_blocks WHERE image_url IS NOT NULL AND image_url != ""').catch(() => []), 'image_url');
      collect(await query('SELECT setting_value FROM settings WHERE setting_value LIKE "/uploads/%"').catch(() => []), 'setting_value');
      files.push(...fromDb);
      debug.counts.dbFiles = fromDb.length;
    } catch(e) {
      debug.counts.dbError = e.message;
    }

    files.sort((a, b) => b.mtime - a.mtime);

    if (req.query.format === 'json') {
      res.set('Cache-Control', 'no-store');
      const payload = { files: files.map(f => ({ url: f.url, name: f.name, size: f.size })) };
      if (req.query.debug === '1') payload.debug = debug;
      return res.json(payload);
    }

    res.render('admin/media/index', { title: 'Media Library', files });
  } catch (err) { next(err); }
});

// Delete a media file (path must be inside /public/uploads)
router.post('/media/delete', async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const urlPath = (req.body.url || '').replace(/^\/+/, '');
    // Security: must be inside uploads/
    if (!urlPath.startsWith('uploads/')) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    const fullPath = path.join(__dirname, '..', 'public', urlPath);
    const realPath = fs.realpathSync(fullPath);
    const uploadsRoot = fs.realpathSync(path.join(__dirname, '..', 'public', 'uploads'));
    if (!realPath.startsWith(uploadsRoot)) {
      return res.status(400).json({ error: 'Path outside uploads' });
    }
    if (fs.existsSync(realPath)) {
      fs.unlinkSync(realPath);
    }
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('json')) {
      return res.json({ ok: true });
    }
    req.flash('success', 'File deleted');
    res.redirect(`${ADMIN_BASE}/media`);
  } catch (err) {
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({ error: err.message });
    }
    next(err);
  }
});

// ===== INVESTOR RELATIONS DOCUMENTS =====
router.get('/ir-documents', async (req, res, next) => {
  try {
    res.locals.activeMenu = 'ir-documents';
    const docs = await query('SELECT * FROM investor_documents ORDER BY year DESC, sort_order, id DESC');
    const categories = await query('SELECT * FROM ir_categories WHERE active = 1 ORDER BY sort_order ASC, id ASC').catch(() => []);
    res.render('admin/ir-documents/index', { title: 'Investor Documents', docs, categories });
  } catch (err) { next(err); }
});

router.get('/ir-documents/new', async (req, res) => {
  res.locals.activeMenu = 'ir-documents';
  const categories = await query('SELECT * FROM ir_categories WHERE active = 1 ORDER BY sort_order ASC, id ASC').catch(() => []);
  res.render('admin/ir-documents/form', {
    title: 'New Document',
    doc: { category: 'other', year: new Date().getFullYear(), sort_order: 0, active: 1 },
    categories,
    isNew: true
  });
});

router.post('/ir-documents/new', upload.single('file'), async (req, res, next) => {
  try {
    let filePath = req.body.file_url || null;
    let fileSize = null;
    if (req.file) {
      filePath = getRelativePath(req.file);
      fileSize = req.file.size;
    }
    await query(
      `INSERT INTO investor_documents (title, category, year, file_path, file_size, description, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.body.title, req.body.category || 'other', parseInt(req.body.year) || null, filePath, fileSize, req.body.description || null, parseInt(req.body.sort_order || 0), req.body.active ? 1 : 0]
    );
    req.flash('success', res.locals.t ? res.locals.t('msg.saved') : 'Saved');
    res.redirect(`${ADMIN_BASE}/ir-documents`);
  } catch (err) { next(err); }
});

router.get('/ir-documents/:id/edit', async (req, res, next) => {
  try {
    res.locals.activeMenu = 'ir-documents';
    const docs = await query('SELECT * FROM investor_documents WHERE id = ? LIMIT 1', [req.params.id]);
    if (!docs[0]) return res.redirect(`${ADMIN_BASE}/ir-documents`);
    const categories = await query('SELECT * FROM ir_categories WHERE active = 1 ORDER BY sort_order ASC, id ASC').catch(() => []);
    res.render('admin/ir-documents/form', { title: 'Edit Document', doc: docs[0], categories, isNew: false });
  } catch (err) { next(err); }
});

router.post('/ir-documents/:id/edit', upload.single('file'), async (req, res, next) => {
  try {
    const docs = await query('SELECT * FROM investor_documents WHERE id = ? LIMIT 1', [req.params.id]);
    if (!docs[0]) return res.redirect(`${ADMIN_BASE}/ir-documents`);
    let filePath = req.body.file_url || docs[0].file_path;
    let fileSize = docs[0].file_size;
    if (req.file) {
      filePath = getRelativePath(req.file);
      fileSize = req.file.size;
    }
    await query(
      `UPDATE investor_documents SET title=?, category=?, year=?, file_path=?, file_size=?, description=?, sort_order=?, active=? WHERE id=?`,
      [req.body.title, req.body.category || 'other', parseInt(req.body.year) || null, filePath, fileSize, req.body.description || null, parseInt(req.body.sort_order || 0), req.body.active ? 1 : 0, req.params.id]
    );
    req.flash('success', res.locals.t ? res.locals.t('msg.saved') : 'Saved');
    res.redirect(`${ADMIN_BASE}/ir-documents`);
  } catch (err) { next(err); }
});

router.post('/ir-documents/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM investor_documents WHERE id = ?', [req.params.id]);
    req.flash('success', 'Deleted');
    res.redirect(`${ADMIN_BASE}/ir-documents`);
  } catch (err) { next(err); }
});

// ===== TRANSLATION API (multi-provider) =====
// Supports: mymemory (free), anthropic (Claude AI), deepl
// Provider chosen via settings.translation_provider; falls back to mymemory.
const https = require('https');

const LANG_NAMES = {
  th: 'Thai', en: 'English', zh: 'Chinese (Simplified)', ja: 'Japanese'
};

// Anthropic Claude provider - high quality, supports HTML preservation
async function translateWithClaude(text, from, to, apiKey) {
  if (!apiKey) throw new Error('Anthropic API key not set');
  const fromName = LANG_NAMES[from] || from;
  const toName = LANG_NAMES[to] || to;
  const body = JSON.stringify({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Translate the following ${fromName} text to ${toName}. CRITICAL RULES:
- Preserve ALL HTML tags exactly (do NOT translate tag names or attributes)
- Preserve ALL whitespace, line breaks, and formatting
- Translate only the visible human-readable text
- Do NOT add any explanations, prefixes, or quotes around the result
- Do NOT translate proper nouns of companies, products, or place names unless they have a standard ${toName} equivalent
- Output ONLY the translated text, nothing else

Text to translate:
${text}`
    }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 60000
    }, (response) => {
      let data = '';
      response.on('data', (d) => { data += d; });
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (response.statusCode !== 200) {
            return reject(new Error('Claude API ' + response.statusCode + ': ' + (json.error?.message || data.substring(0, 200))));
          }
          if (json.content && json.content[0] && json.content[0].text) {
            resolve(json.content[0].text);
          } else {
            reject(new Error('Unexpected Claude response: ' + JSON.stringify(json).substring(0, 200)));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Claude API timeout')); });
    req.write(body);
    req.end();
  });
}

// DeepL provider
async function translateWithDeepL(text, from, to, apiKey) {
  if (!apiKey) throw new Error('DeepL API key not set');
  const TO_MAP = { en: 'EN-US', zh: 'ZH', ja: 'JA', th: 'TH' };
  const FROM_MAP = { th: 'TH', en: 'EN', zh: 'ZH', ja: 'JA' };
  const params = new URLSearchParams({
    auth_key: apiKey,
    text: text,
    source_lang: FROM_MAP[from] || from.toUpperCase(),
    target_lang: TO_MAP[to] || to.toUpperCase(),
    tag_handling: 'html'
  }).toString();
  // Free vs Pro: try free endpoint first
  const host = apiKey.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host,
      path: '/v2/translate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(params)
      },
      timeout: 30000
    }, (response) => {
      let data = '';
      response.on('data', (d) => { data += d; });
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) {
            return reject(new Error('DeepL ' + response.statusCode + ': ' + data.substring(0, 200)));
          }
          const json = JSON.parse(data);
          if (json.translations && json.translations[0]) {
            resolve(json.translations[0].text);
          } else {
            reject(new Error('Unexpected DeepL response'));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('DeepL timeout')); });
    req.write(params);
    req.end();
  });
}

// MyMemory free provider (chunked because of 500-char limit)
function translateWithMyMemory(text, from, to) {
  return new Promise((resolve) => {
    if (!text || !text.trim()) return resolve('');
    const FROM_MAP = { th: 'th', en: 'en', zh: 'zh-CN', ja: 'ja' };
    const fromCode = FROM_MAP[from] || from;
    const toCode = FROM_MAP[to] || to;
    const chunks = [];
    const MAX = 480;
    let s = text;
    while (s.length > MAX) {
      let cut = s.lastIndexOf('. ', MAX);
      if (cut < 100) cut = s.lastIndexOf('> ', MAX);
      if (cut < 100) cut = s.lastIndexOf(' ', MAX);
      if (cut < 100) cut = MAX;
      chunks.push(s.substring(0, cut + 1));
      s = s.substring(cut + 1);
    }
    if (s) chunks.push(s);

    const translateChunk = (chunk) => new Promise((res) => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${fromCode}|${toCode}`;
      const r = https.get(url, { timeout: 12000 }, (response) => {
        let data = '';
        response.on('data', (d) => { data += d; });
        response.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json?.responseData?.translatedText) res(json.responseData.translatedText);
            else res(chunk);
          } catch (e) { res(chunk); }
        });
      });
      r.on('error', () => res(chunk));
      r.on('timeout', () => { r.destroy(); res(chunk); });
    });

    Promise.all(chunks.map(translateChunk))
      .then(parts => resolve(parts.join('')))
      .catch(() => resolve(text));
  });
}

// Main translation entry point - reads provider from settings
async function translateText(text, from = 'th', to = 'en') {
  if (!text || !text.trim()) return '';
  // Load provider config from settings
  let provider = 'mymemory';
  let claudeKey = '';
  let deeplKey = '';
  try {
    const rows = await query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('translation_provider', 'anthropic_api_key', 'deepl_api_key')");
    rows.forEach(r => {
      if (r.setting_key === 'translation_provider' && r.setting_value) provider = r.setting_value;
      if (r.setting_key === 'anthropic_api_key') claudeKey = r.setting_value || '';
      if (r.setting_key === 'deepl_api_key') deeplKey = r.setting_value || '';
    });
  } catch(e) { /* fall through to mymemory */ }

  try {
    if (provider === 'anthropic' && claudeKey) {
      return await translateWithClaude(text, from, to, claudeKey);
    } else if (provider === 'deepl' && deeplKey) {
      return await translateWithDeepL(text, from, to, deeplKey);
    }
  } catch (err) {
    console.warn(`[translate] ${provider} failed, falling back to mymemory:`, err.message);
  }
  return await translateWithMyMemory(text, from, to);
}

// Translate a single text snippet (used by AJAX from admin form)
router.post('/api/translate', express.json(), async (req, res) => {
  try {
    const text = req.body.text || '';
    const from = req.body.from === 'en' ? 'en' : 'th';
    const to = from === 'th' ? 'en' : 'th';
    if (!text.trim()) return res.json({ ok: true, translated: '' });
    const translated = await translateText(text, from, to);
    res.json({ ok: true, translated });
  } catch (err) {
    console.error('Translate error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Translate ALL fields of a news article and save the EN versions
// VALID translation target languages
const VALID_TRANSLATE_LANGS = ['en', 'zh', 'ja'];

router.post('/news/:id/translate', async (req, res, next) => {
  try {
    const id = req.params.id;
    const targetLang = VALID_TRANSLATE_LANGS.includes(req.query.lang || req.body.lang) ? (req.query.lang || req.body.lang) : 'en';
    const rows = await query('SELECT * FROM news WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return res.redirect(`${ADMIN_BASE}/news`);
    const n = rows[0];
    // Fields to translate; for non-en target we only have title/excerpt/content
    let fields;
    if (targetLang === 'en') {
      fields = [
        ['title', 'title_en'],
        ['excerpt', 'excerpt_en'],
        ['content', 'content_en'],
        ['section2_heading', 'section2_heading_en'],
        ['section2_body', 'section2_body_en'],
        ['section3_heading', 'section3_heading_en'],
        ['section3_body', 'section3_body_en'],
        ['section4_heading', 'section4_heading_en'],
        ['section4_body', 'section4_body_en']
      ];
    } else {
      fields = [
        ['title', `title_${targetLang}`],
        ['excerpt', `excerpt_${targetLang}`],
        ['content', `content_${targetLang}`]
      ];
    }
    const updates = {};
    for (const [src, dest] of fields) {
      if (n[src] && String(n[src]).trim()) {
        const t = await translateText(String(n[src]), 'th', targetLang);
        updates[dest] = t;
      }
    }
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await query(`UPDATE news SET ${setClauses} WHERE id = ?`, [...values, id]);
    }
    const langLabels = { en: 'English', zh: 'Chinese', ja: 'Japanese' };
    req.flash('success', `Translated to ${langLabels[targetLang]}. Review and adjust as needed.`);
    const back = req.body.back || `${ADMIN_BASE}/news/${id}/edit`;
    res.redirect(back);
  } catch (err) {
    console.error('News translate error:', err);
    req.flash('error', 'Translation failed: ' + err.message);
    res.redirect(req.body.back || `${ADMIN_BASE}/news/${req.params.id}/edit`);
  }
});

// Translate ALL fields of a business
router.post('/businesses/:id/translate', async (req, res, next) => {
  try {
    const id = req.params.id;
    const targetLang = VALID_TRANSLATE_LANGS.includes(req.query.lang || req.body.lang) ? (req.query.lang || req.body.lang) : 'en';
    const rows = await query('SELECT * FROM businesses WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return res.redirect(`${ADMIN_BASE}/businesses`);
    const b = rows[0];
    let fields;
    if (targetLang === 'en') {
      fields = [
        ['name', 'name_en'],
        ['short_description', 'short_description_en'],
        ['full_description', 'full_description_en'],
        ['section2_heading', 'section2_heading_en'],
        ['section2_body', 'section2_body_en'],
        ['section3_heading', 'section3_heading_en'],
        ['section3_body', 'section3_body_en'],
        ['section4_heading', 'section4_heading_en'],
        ['section4_body', 'section4_body_en']
      ];
    } else {
      fields = [
        ['name', `name_${targetLang}`],
        ['short_description', `short_description_${targetLang}`],
        ['full_description', `full_description_${targetLang}`]
      ];
    }
    const updates = {};
    for (const [src, dest] of fields) {
      if (b[src] && String(b[src]).trim()) {
        const t = await translateText(String(b[src]), 'th', targetLang);
        updates[dest] = t;
      }
    }
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await query(`UPDATE businesses SET ${setClauses} WHERE id = ?`, [...values, id]);
    }
    const langLabels = { en: 'English', zh: 'Chinese', ja: 'Japanese' };
    req.flash('success', `Translated to ${langLabels[targetLang]}. Review and adjust as needed.`);
    const back = req.body.back || `${ADMIN_BASE}/businesses/${id}/edit`;
    res.redirect(back);
  } catch (err) {
    console.error('Business translate error:', err);
    req.flash('error', 'Translation failed: ' + err.message);
    res.redirect(req.body.back || `${ADMIN_BASE}/businesses/${req.params.id}/edit`);
  }
});

// ===== TRANSLATION MANAGER PAGE =====
// Lists all news + businesses with translation status; one-click translate per row
router.get('/translation-manager', async (req, res, next) => {
  try {
    // Stats
    const newsStats = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN title_en IS NOT NULL AND title_en != '' THEN 1 ELSE 0 END) AS done_en,
        SUM(CASE WHEN title_zh IS NOT NULL AND title_zh != '' THEN 1 ELSE 0 END) AS done_zh,
        SUM(CASE WHEN title_ja IS NOT NULL AND title_ja != '' THEN 1 ELSE 0 END) AS done_ja
      FROM news
    `);
    const bizStats = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN name_en IS NOT NULL AND name_en != '' THEN 1 ELSE 0 END) AS done_en,
        SUM(CASE WHEN name_zh IS NOT NULL AND name_zh != '' THEN 1 ELSE 0 END) AS done_zh,
        SUM(CASE WHEN name_ja IS NOT NULL AND name_ja != '' THEN 1 ELSE 0 END) AS done_ja
      FROM businesses
    `);

    const newsRows = await query(`
      SELECT id, title, slug,
        CASE WHEN title_en IS NOT NULL AND title_en != '' THEN 1 ELSE 0 END AS has_en,
        CASE WHEN title_zh IS NOT NULL AND title_zh != '' THEN 1 ELSE 0 END AS has_zh,
        CASE WHEN title_ja IS NOT NULL AND title_ja != '' THEN 1 ELSE 0 END AS has_ja,
        updated_at
      FROM news
      ORDER BY COALESCE(updated_at, created_at) DESC
    `);
    const bizRows = await query(`
      SELECT id, name AS title, slug,
        CASE WHEN name_en IS NOT NULL AND name_en != '' THEN 1 ELSE 0 END AS has_en,
        CASE WHEN name_zh IS NOT NULL AND name_zh != '' THEN 1 ELSE 0 END AS has_zh,
        CASE WHEN name_ja IS NOT NULL AND name_ja != '' THEN 1 ELSE 0 END AS has_ja,
        updated_at
      FROM businesses
      ORDER BY COALESCE(updated_at, created_at) DESC
    `);

    // Read provider config for status display
    let provider = 'mymemory';
    let hasClaudeKey = false;
    let hasDeeplKey = false;
    try {
      const settings = await query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('translation_provider', 'anthropic_api_key', 'deepl_api_key')");
      settings.forEach(r => {
        if (r.setting_key === 'translation_provider' && r.setting_value) provider = r.setting_value;
        if (r.setting_key === 'anthropic_api_key' && r.setting_value) hasClaudeKey = true;
        if (r.setting_key === 'deepl_api_key' && r.setting_value) hasDeeplKey = true;
      });
    } catch(e) {}

    res.render('admin/translation-manager', {
      title: 'Translation Manager',
      activeMenu: 'translation',
      newsRows, bizRows,
      newsStats: newsStats[0] || {},
      bizStats: bizStats[0] || {},
      provider, hasClaudeKey, hasDeeplKey
    });
  } catch (err) {
    console.error('Translation Manager error:', err);
    next(err);
  }
});

// ===== ONE-CLICK SITE-WIDE TRANSLATE =====
// POST /translation-manager/translate-all?lang=en
// Translates ALL posts (news + businesses) into the target language
// Skips posts that already have the translation (unless ?force=1)
router.post('/translation-manager/translate-all', async (req, res, next) => {
  try {
    const lang = VALID_TRANSLATE_LANGS.includes(req.query.lang || req.body.lang)
      ? (req.query.lang || req.body.lang) : 'en';
    const force = (req.query.force === '1' || req.body.force === '1');

    let stats = { news_translated: 0, news_skipped: 0, businesses_translated: 0, businesses_skipped: 0, errors: 0 };

    // Build news field map
    const newsFieldMap = lang === 'en' ? [
      ['title', 'title_en'],
      ['excerpt', 'excerpt_en'],
      ['content', 'content_en'],
      ['section2_heading', 'section2_heading_en'],
      ['section2_body', 'section2_body_en'],
      ['section3_heading', 'section3_heading_en'],
      ['section3_body', 'section3_body_en'],
      ['section4_heading', 'section4_heading_en'],
      ['section4_body', 'section4_body_en']
    ] : [
      ['title', `title_${lang}`],
      ['excerpt', `excerpt_${lang}`],
      ['content', `content_${lang}`]
    ];

    const bizFieldMap = lang === 'en' ? [
      ['name', 'name_en'],
      ['short_description', 'short_description_en'],
      ['full_description', 'full_description_en'],
      ['section2_heading', 'section2_heading_en'],
      ['section2_body', 'section2_body_en'],
      ['section3_heading', 'section3_heading_en'],
      ['section3_body', 'section3_body_en'],
      ['section4_heading', 'section4_heading_en'],
      ['section4_body', 'section4_body_en']
    ] : [
      ['name', `name_${lang}`],
      ['short_description', `short_description_${lang}`],
      ['full_description', `full_description_${lang}`]
    ];

    const titleField = lang === 'en' ? 'title_en' : `title_${lang}`;
    const nameField = lang === 'en' ? 'name_en' : `name_${lang}`;

    // News
    const newsList = await query('SELECT * FROM news');
    for (const n of newsList) {
      try {
        if (!force && n[titleField] && String(n[titleField]).trim()) {
          stats.news_skipped++;
          continue;
        }
        const updates = {};
        for (const [src, dest] of newsFieldMap) {
          if (n[src] && String(n[src]).trim()) {
            updates[dest] = await translateText(String(n[src]), 'th', lang);
          }
        }
        if (Object.keys(updates).length > 0) {
          const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
          await query(`UPDATE news SET ${setClauses} WHERE id = ?`, [...Object.values(updates), n.id]);
          stats.news_translated++;
        }
      } catch (err) {
        console.error('News translate error for id', n.id, ':', err.message);
        stats.errors++;
      }
    }

    // Businesses
    const bizList = await query('SELECT * FROM businesses');
    for (const b of bizList) {
      try {
        if (!force && b[nameField] && String(b[nameField]).trim()) {
          stats.businesses_skipped++;
          continue;
        }
        const updates = {};
        for (const [src, dest] of bizFieldMap) {
          if (b[src] && String(b[src]).trim()) {
            updates[dest] = await translateText(String(b[src]), 'th', lang);
          }
        }
        if (Object.keys(updates).length > 0) {
          const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
          await query(`UPDATE businesses SET ${setClauses} WHERE id = ?`, [...Object.values(updates), b.id]);
          stats.businesses_translated++;
        }
      } catch (err) {
        console.error('Business translate error for id', b.id, ':', err.message);
        stats.errors++;
      }
    }

    const langLabel = { en: 'English', zh: 'Chinese', ja: 'Japanese' }[lang];
    let msg = `Translated to ${langLabel}: ${stats.news_translated} news + ${stats.businesses_translated} businesses.`;
    if (stats.news_skipped + stats.businesses_skipped > 0) {
      msg += ` Skipped (already translated): ${stats.news_skipped + stats.businesses_skipped}.`;
    }
    if (stats.errors > 0) msg += ` Errors: ${stats.errors}.`;

    req.flash('success', msg);
    res.redirect(`${ADMIN_BASE}/translation-manager`);
  } catch (err) {
    console.error('Translate-all error:', err);
    req.flash('error', 'Translate-all failed: ' + err.message);
    res.redirect(`${ADMIN_BASE}/translation-manager`);
  }
});

// ===== IR CATEGORIES MANAGEMENT =====
router.post('/ir-categories/new', async (req, res, next) => {
  try {
    const slug = (req.body.slug || '').replace(/[^a-z0-9_]/gi, '_').toLowerCase().substring(0, 64);
    const name = (req.body.name || '').trim().substring(0, 190);
    const nameEn = (req.body.name_en || '').trim().substring(0, 190);
    if (!slug || !name) {
      req.flash('error', 'Slug and name are required');
      return res.redirect(`${ADMIN_BASE}/ir-documents`);
    }
    await query(
      'INSERT INTO ir_categories (slug, name, name_en, sort_order, active) VALUES (?, ?, ?, ?, 1)',
      [slug, name, nameEn || null, parseInt(req.body.sort_order || 0)]
    );
    req.flash('success', 'Category added');
    res.redirect(`${ADMIN_BASE}/ir-documents`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'A category with this slug already exists');
      return res.redirect(`${ADMIN_BASE}/ir-documents`);
    }
    next(err);
  }
});

router.post('/ir-categories/:id/edit', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim().substring(0, 190);
    const nameEn = (req.body.name_en || '').trim().substring(0, 190);
    if (!name) {
      req.flash('error', 'Name required');
      return res.redirect(`${ADMIN_BASE}/ir-documents`);
    }
    await query(
      'UPDATE ir_categories SET name=?, name_en=?, sort_order=? WHERE id=?',
      [name, nameEn || null, parseInt(req.body.sort_order || 0), req.params.id]
    );
    req.flash('success', 'Category updated');
    res.redirect(`${ADMIN_BASE}/ir-documents`);
  } catch (err) { next(err); }
});

router.post('/ir-categories/:id/delete', async (req, res, next) => {
  try {
    // Get the category being deleted
    const cats = await query('SELECT slug FROM ir_categories WHERE id = ? LIMIT 1', [req.params.id]);
    if (cats[0]) {
      // Move documents in this category to "other"
      await query(
        'UPDATE investor_documents SET category = "other" WHERE category = ?',
        [cats[0].slug]
      );
    }
    await query('DELETE FROM ir_categories WHERE id = ?', [req.params.id]);
    req.flash('success', 'Category deleted');
    res.redirect(`${ADMIN_BASE}/ir-documents`);
  } catch (err) { next(err); }
});

// ===== CONTENT BLOCKS (Page Builder) =====
// Manage repeatable content blocks for news/business/career detail pages.
// Each block has a type (heading, text, image, video, gallery, quote, divider, cta, embed)
// and is attached to a parent (news article, business, etc).

const VALID_PARENT_TYPES = ['news', 'business', 'career', 'sustainability', 'page'];
const VALID_BLOCK_TYPES = ['heading', 'text', 'image', 'video', 'gallery', 'quote', 'divider', 'cta', 'embed'];

const PARENT_TABLE = {
  news: 'news',
  business: 'businesses',
  career: 'careers',
  sustainability: 'sustainability',
  page: 'pages'
};

const PARENT_TITLE_FIELD = {
  news: 'title',
  business: 'name',
  career: 'title',
  sustainability: 'title',
  page: 'title'
};

const PARENT_RETURN_PATH = {
  news: '/news',
  business: '/businesses',
  career: '/careers',
  sustainability: '/sustainability',
  page: '/pages'
};

// List blocks for a parent
router.get('/blocks/:parentType/:parentId', async (req, res, next) => {
  try {
    const { parentType, parentId } = req.params;
    if (!VALID_PARENT_TYPES.includes(parentType)) {
      req.flash('error', 'Invalid parent type');
      return res.redirect(ADMIN_BASE + '/dashboard');
    }
    const table = PARENT_TABLE[parentType];
    const titleField = PARENT_TITLE_FIELD[parentType];

    // Load parent record
    const parentRows = await query(`SELECT id, ${titleField} AS title FROM ${table} WHERE id = ? LIMIT 1`, [parentId]);
    if (!parentRows[0]) {
      req.flash('error', 'Item not found');
      return res.redirect(ADMIN_BASE + PARENT_RETURN_PATH[parentType]);
    }

    const blocks = await query(
      `SELECT * FROM content_blocks WHERE parent_type = ? AND parent_id = ? ORDER BY sort_order, id`,
      [parentType, parentId]
    );

    res.render('admin/blocks/index', {
      title: 'Content Blocks',
      activeMenu: parentType === 'news' ? 'news' : (parentType === 'business' ? 'businesses' : (parentType === 'career' ? 'careers' : parentType)),
      parentType,
      parentId,
      parent: parentRows[0],
      parentReturnPath: ADMIN_BASE + PARENT_RETURN_PATH[parentType] + '/' + parentId + '/edit',
      blocks
    });
  } catch (err) { next(err); }
});

// New block form
router.get('/blocks/:parentType/:parentId/new', async (req, res, next) => {
  try {
    const { parentType, parentId } = req.params;
    if (!VALID_PARENT_TYPES.includes(parentType)) {
      req.flash('error', 'Invalid parent type');
      return res.redirect(ADMIN_BASE + '/dashboard');
    }
    res.render('admin/blocks/form', {
      title: 'New Content Block',
      activeMenu: parentType,
      parentType,
      parentId,
      block: { block_type: req.query.type || 'text', sort_order: 0, active: 1 },
      isNew: true,
      validBlockTypes: VALID_BLOCK_TYPES
    });
  } catch (err) { next(err); }
});

// Create block
router.post('/blocks/:parentType/:parentId/new', upload.fields([
  { name: 'image_file', maxCount: 1 },
  { name: 'video_file', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const { parentType, parentId } = req.params;
    if (!VALID_PARENT_TYPES.includes(parentType)) {
      req.flash('error', 'Invalid parent type');
      return res.redirect(ADMIN_BASE + '/dashboard');
    }
    const pidInt = parseInt(parentId, 10);
    if (!pidInt || isNaN(pidInt)) {
      req.flash('error', 'Invalid parent id');
      return res.redirect(ADMIN_BASE + '/dashboard');
    }
    const blockType = VALID_BLOCK_TYPES.includes(req.body.block_type) ? req.body.block_type : 'text';

    let imageUrl = req.body.image_url || null;
    if (req.files && req.files.image_file && req.files.image_file[0]) {
      imageUrl = getRelativePath(req.files.image_file[0]);
      try { await processImage(path.join(__dirname, '..', 'public', imageUrl), { maxWidth: 1800 }); } catch(e) {}
    }
    let videoUrl = req.body.video_url || null;
    if (req.files && req.files.video_file && req.files.video_file[0]) {
      videoUrl = getRelativePath(req.files.video_file[0]);
    }

    // Compute next sort_order for "add another" support — auto-append at end
    let sortOrder = parseInt(req.body.sort_order, 10);
    if (isNaN(sortOrder)) {
      const existing = await query(
        'SELECT MAX(sort_order) as max_sort FROM content_blocks WHERE parent_type = ? AND parent_id = ?',
        [parentType, pidInt]
      );
      sortOrder = ((existing[0] && existing[0].max_sort) || 0) + 10;
    }

    let safeBody = null;
    try {
      safeBody = req.body.body ? sanitizeContent(req.body.body) : null;
    } catch (e) {
      console.error('sanitizeContent failed:', e.message);
      safeBody = req.body.body || null;
    }

    await query(
      `INSERT INTO content_blocks (parent_type, parent_id, block_type, heading, body, image_url, image_alt, video_url, embed_code, cta_text, cta_url, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parentType,
        pidInt,
        blockType,
        req.body.heading || null,
        safeBody,
        imageUrl,
        req.body.image_alt || null,
        videoUrl,
        req.body.embed_code || null,
        req.body.cta_text || null,
        req.body.cta_url || null,
        sortOrder,
        req.body.active === '0' || req.body.active === 'false' ? 0 : 1
      ]
    );

    req.flash('success', 'Content block added');
    // Support "Save and add another" — return to /new with the same parent
    if (req.body.save_and_add_another === '1') {
      return res.redirect(`${ADMIN_BASE}/blocks/${parentType}/${parentId}/new`);
    }
    res.redirect(`${ADMIN_BASE}/blocks/${parentType}/${parentId}`);
  } catch (err) {
    console.error('Block create error:', err);
    next(err);
  }
});

// Edit block form
router.get('/blocks/:parentType/:parentId/:id/edit', async (req, res, next) => {
  try {
    const blocks = await query('SELECT * FROM content_blocks WHERE id = ? LIMIT 1', [req.params.id]);
    if (!blocks[0]) {
      req.flash('error', 'Block not found');
      return res.redirect(`${ADMIN_BASE}/blocks/${req.params.parentType}/${req.params.parentId}`);
    }
    res.render('admin/blocks/form', {
      title: 'Edit Content Block',
      activeMenu: req.params.parentType,
      parentType: req.params.parentType,
      parentId: req.params.parentId,
      block: blocks[0],
      isNew: false,
      validBlockTypes: VALID_BLOCK_TYPES
    });
  } catch (err) { next(err); }
});

// Update block
router.post('/blocks/:parentType/:parentId/:id/edit', upload.fields([
  { name: 'image_file', maxCount: 1 },
  { name: 'video_file', maxCount: 1 }
]), async (req, res, next) => {
  try {
    if (!VALID_PARENT_TYPES.includes(req.params.parentType)) {
      req.flash('error', 'Invalid parent type');
      return res.redirect(ADMIN_BASE + '/dashboard');
    }
    const blocks = await query('SELECT * FROM content_blocks WHERE id = ? LIMIT 1', [req.params.id]);
    if (!blocks[0]) return res.redirect(`${ADMIN_BASE}/blocks/${req.params.parentType}/${req.params.parentId}`);
    const block = blocks[0];

    let imageUrl = req.body.image_url || block.image_url;
    if (req.files && req.files.image_file && req.files.image_file[0]) {
      imageUrl = getRelativePath(req.files.image_file[0]);
      try { await processImage(path.join(__dirname, '..', 'public', imageUrl), { maxWidth: 1800 }); } catch(e) {}
    }
    let videoUrl = req.body.video_url || block.video_url;
    if (req.files && req.files.video_file && req.files.video_file[0]) {
      videoUrl = getRelativePath(req.files.video_file[0]);
    }
    const blockType = VALID_BLOCK_TYPES.includes(req.body.block_type) ? req.body.block_type : block.block_type;

    let safeBody = null;
    try {
      safeBody = req.body.body ? sanitizeContent(req.body.body) : null;
    } catch (e) {
      console.error('sanitizeContent failed in block edit:', e.message);
      safeBody = req.body.body || null;
    }

    let sortOrder = parseInt(req.body.sort_order, 10);
    if (isNaN(sortOrder)) sortOrder = block.sort_order || 0;

    await query(
      `UPDATE content_blocks SET block_type=?, heading=?, body=?, image_url=?, image_alt=?, video_url=?, embed_code=?, cta_text=?, cta_url=?, sort_order=?, active=? WHERE id=?`,
      [
        blockType,
        req.body.heading || null,
        safeBody,
        imageUrl,
        req.body.image_alt || null,
        videoUrl,
        req.body.embed_code || null,
        req.body.cta_text || null,
        req.body.cta_url || null,
        sortOrder,
        req.body.active === '0' || req.body.active === 'false' ? 0 : 1,
        req.params.id
      ]
    );

    req.flash('success', 'Content block updated');
    res.redirect(`${ADMIN_BASE}/blocks/${req.params.parentType}/${req.params.parentId}`);
  } catch (err) {
    console.error('Block edit error:', err);
    next(err);
  }
});

// Delete block
router.post('/blocks/:parentType/:parentId/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM content_blocks WHERE id = ?', [req.params.id]);
    req.flash('success', 'Block deleted');
    res.redirect(`${ADMIN_BASE}/blocks/${req.params.parentType}/${req.params.parentId}`);
  } catch (err) { next(err); }
});

// Reorder blocks (AJAX)
router.post('/blocks/:parentType/:parentId/reorder', express.json(), async (req, res) => {
  try {
    const order = Array.isArray(req.body.order) ? req.body.order : [];
    for (let i = 0; i < order.length; i++) {
      await query('UPDATE content_blocks SET sort_order = ? WHERE id = ? AND parent_type = ? AND parent_id = ?',
        [i, order[i], req.params.parentType, req.params.parentId]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
