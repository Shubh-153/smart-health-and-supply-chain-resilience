const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const languages = ['en', 'pt', 'ru', 'hi', 'zh'];

function flattenKeys(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenKeys(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}

try {
  const enFile = fs.readFileSync(path.join(localesDir, 'en/translation.json'), 'utf-8');
  const enKeys = Object.keys(flattenKeys(JSON.parse(enFile)));
  
  let hasError = false;
  
  for (const lang of languages) {
    if (lang === 'en') continue;
    
    try {
      const langFile = fs.readFileSync(path.join(localesDir, `${lang}/translation.json`), 'utf-8');
      const langKeys = Object.keys(flattenKeys(JSON.parse(langFile)));
      
      const missing = enKeys.filter(k => !langKeys.includes(k));
      const extra = langKeys.filter(k => !enKeys.includes(k));
      
      if (missing.length > 0) {
        console.error(`[${lang}] Missing keys:`, missing);
        hasError = true;
      }
      if (extra.length > 0) {
        console.error(`[${lang}] Extra keys:`, extra);
        hasError = true;
      }
      
      if (missing.length === 0 && extra.length === 0) {
        console.log(`[${lang}] OK`);
      }
    } catch (e) {
      console.error(`[${lang}] Could not read or parse translation file:`, e.message);
      hasError = true;
    }
  }
  
  if (hasError) {
    process.exit(1);
  } else {
    console.log('All translations match English keys.');
  }
} catch (e) {
  console.error('Failed to read English translation file:', e.message);
  process.exit(1);
}
