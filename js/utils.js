/**
 * Utility functions for Behatsdaa Web Application
 */

export function debounce(fn, delay = 120) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function initTheme() {
  const savedTheme = localStorage.getItem('behatsdaa_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('behatsdaa_theme', isDark ? 'dark' : 'light');
}

export function normalizeHebrew(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .replace(/["'״׳\-–_.,()/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatILS(amount) {
  if (!amount && amount !== 0) return '';
  return `${Number(amount).toLocaleString('he-IL')} ₪`;
}

export function formatFullAddress(storeOrAddress, city) {
  let rawAddr = "";
  let rawCity = "";

  if (storeOrAddress && typeof storeOrAddress === "object") {
    rawAddr = storeOrAddress.address || "";
    rawCity = storeOrAddress.city || "";
  } else {
    rawAddr = storeOrAddress || "";
    rawCity = city || "";
  }

  let cleanAddr = rawAddr ? String(rawAddr).trim().replace(/[\s,]+$/, "") : "";
  let cleanCity = rawCity ? String(rawCity).trim() : "";

  const invalidPlaceholders = ["0", "לקוח אונליין", "city2", "null", "none", "-", "ללא", "כל הארץ"];

  if (invalidPlaceholders.includes(cleanAddr.toLowerCase())) {
    cleanAddr = "";
  }
  if (invalidPlaceholders.includes(cleanCity.toLowerCase()) || cleanCity.toLowerCase() === "online") {
    cleanCity = "";
  }

  if (cleanAddr && cleanCity) {
    if (cleanAddr.toLowerCase().includes(cleanCity.toLowerCase())) {
      return cleanAddr;
    }
    return `${cleanAddr}, ${cleanCity}`;
  }
  if (cleanAddr) return cleanAddr;
  if (cleanCity) return cleanCity;
  return "Online / כל הארץ";
}

export function highlightHebrew(text, query) {
  if (!text) return '';
  const escapedText = String(text)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  if (!query) return escapedText;

  const rawTerms = String(query)
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (rawTerms.length === 0) return escapedText;

  const parts = escapedText.split(/(&[a-zA-Z0-9#]+;)/g);
  const escapedTerms = rawTerms.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  return parts.map(part => {
    if (part.startsWith('&') && part.endsWith(';')) {
      return part;
    }
    return part.replace(regex, '<mark class="search-highlight bg-yellow-200 dark:bg-yellow-800/60 text-inherit px-0.5 rounded-sm">$1</mark>');
  }).join('');
}

export function highlightText(text, query) {
  return highlightHebrew(text, query);
}


