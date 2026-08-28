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

  function consumeRequestedLanguage() {
    try {
      var url = new URL(global.location.href);
      if (!url.searchParams.has('lang')) return null;
      var requested = normalize(url.searchParams.get('lang'));
      url.searchParams.delete('lang');
      global.history.replaceState(null, '', url.pathname + url.search + url.hash);
      return requested;
    } catch (_) {
      return null;
    }
  }

  function read() {
    var requested = consumeRequestedLanguage();
    if (requested) return write(requested);

    var stored = readStored(STORAGE_KEY);
    if (stored) return stored;
    return 'en';
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
