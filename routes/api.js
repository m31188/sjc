const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { upload, processImage, getRelativePath } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// Image upload endpoint (for TinyMCE/admin forms)
router.post('/upload-image', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const relPath = getRelativePath(req.file);
    const fullPath = path.join(__dirname, '..', 'public', relPath);
    const dimensions = await processImage(fullPath);

    // Save to media library
    await query(
      `INSERT INTO media (filename, original_name, file_path, file_type, file_size, width, height, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.file.filename,
        req.file.originalname,
        relPath,
        req.file.mimetype,
        req.file.size,
        dimensions?.width || null,
        dimensions?.height || null,
        req.session.user.id
      ]
    );

    res.json({
      location: relPath,
      url: relPath,
      width: dimensions?.width,
      height: dimensions?.height
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete media
router.delete('/media/:id', requireAuth, async (req, res) => {
  try {
    const items = await query('SELECT * FROM media WHERE id = ? LIMIT 1', [req.params.id]);
    if (items[0]) {
      const fullPath = path.join(__dirname, '..', 'public', items[0].file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      await query('DELETE FROM media WHERE id = ?', [req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder items (sliders, businesses, menus, etc.)
router.post('/reorder', requireAuth, async (req, res) => {
  try {
    const { table, items } = req.body;
    const allowedTables = ['sliders', 'businesses', 'sustainability', 'menus', 'page_sections', 'pages', 'news_categories'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    for (let i = 0; i < items.length; i++) {
      await query(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [i + 1, items[i]]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active status
router.post('/toggle-active', requireAuth, async (req, res) => {
  try {
    const { table, id } = req.body;
    const allowedTables = ['sliders', 'businesses', 'sustainability', 'careers', 'menus', 'pages', 'news', 'investor_documents', 'users'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    const field = table === 'news' ? 'published' : 'active';
    await query(`UPDATE ${table} SET ${field} = NOT ${field} WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
