// middleware/lang.js
// v40+: Server-side lang detection is DISABLED.
// Translation is handled entirely client-side by Google Translate.
// We always serve Thai content; Google translates it on the visitor's
// browser based on the googtrans cookie set by the topbar dropdown.
//
// This module exists to keep the API surface stable for templates that
// still reference currentLang / tField / tUI - they all just return the
// base Thai field.

let _ui;
try { _ui = require('../utils/ui-i18n'); } catch (e) { _ui = null; }

module.exports = function langMiddleware(req, res, next) {
  res.locals.siteLang = 'th';
  res.locals.currentLang = 'th';

  // tField always returns the base (Thai) field.
  // The *_en/*_zh/*_ja columns are deprecated - Google Translate handles
  // language switching at runtime, so we never read those columns.
  res.locals.tField = function tField(obj, baseKey) {
    if (!obj) return '';
    return obj[baseKey] || '';
  };

  // tUI also returns Thai labels - Google translates them.
  if (_ui && typeof _ui.tUI === 'function') {
    res.locals.tUI = (key) => _ui.tUI(key, 'th');
  } else {
    res.locals.tUI = (key) => key;
  }

  next();
};

module.exports.VALID_LANGS = ['th'];
