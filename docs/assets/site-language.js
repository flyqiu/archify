(function (global) {
  'use strict';

  var STORAGE_KEY = 'archify-lang';

  function normalize(value) {
    return value === 'zh' || value === 'en' ? value : null;
  }

  function readStored(key) {
    try {
      return normalize(global.localStorage.getItem(key));
    } catch (_) {
      return null;
    }
  }

  function requestedLanguage() {
    try {
      return normalize(new URLSearchParams(global.location.search || '').get('lang'));
    } catch (_) {
      return null;
    }
  }

  function detectedLanguage() {
    var languages = global.navigator && global.navigator.languages;
    var primary = languages && languages.length
      ? languages[0]
      : global.navigator && global.navigator.language;
    return String(primary || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  function read(options) {
    var settings = options || {};
    var requested = requestedLanguage();
    if (requested) return requested;

    var stored = readStored(STORAGE_KEY);
    if (stored) return stored;

    var legacyKeys = Array.isArray(settings.legacyKeys) ? settings.legacyKeys : [];
    for (var index = 0; index < legacyKeys.length; index += 1) {
      var legacy = readStored(legacyKeys[index]);
      if (legacy) return legacy;
    }

    if (settings.detectBrowserLanguage) return detectedLanguage();
    return normalize(settings.fallback) || 'en';
  }

  function write(next) {
    var language = normalize(next) || 'en';
    try {
      global.localStorage.setItem(STORAGE_KEY, language);
    } catch (_) {}
    return language;
  }

  global.ArchifySiteLanguage = Object.freeze({
    key: STORAGE_KEY,
    read: read,
    write: write,
  });
}(window));
