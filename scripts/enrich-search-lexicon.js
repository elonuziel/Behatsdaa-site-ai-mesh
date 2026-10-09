import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const lexiconFile = path.join(dataDir, 'search_lexicon.json');

console.log('🔍 Starting Search Lexicon Enrichment...');

// 1. Read existing lexicon
let lexicon = { transliterations: {}, synonyms: {}, brand_aliases: {} };
if (fs.existsSync(lexiconFile)) {
  try {
    lexicon = JSON.parse(fs.readFileSync(lexiconFile, 'utf-8'));
    console.log('✅ Loaded existing search_lexicon.json');
  } catch (e) {
    console.error('❌ Failed to parse search_lexicon.json:', e.message);
  }
}

// 2. Load data
const loadData = (filename) => {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.stores || data.deals || [];
  } catch (e) {
    console.warn(`⚠️ Failed reading ${filename}`);
    return [];
  }
};

const stores = loadData('stores.json');
const deals = loadData('deals.json');
const billing = loadData('billing_stores.json');
const allItems = [...stores, ...deals, ...billing];

// 3. Extract Categories and English Words
const extractedCategories = new Set();
const extractedEngWords = new Set();
const allCategoriesRaw = {};
const allEngWordsRaw = {};

allItems.forEach(item => {
  const cat = item.category || 'כללי';
  extractedCategories.add(cat);
  allCategoriesRaw[cat] = (allCategoriesRaw[cat] || 0) + 1;

  const text = `${item.name || item.title || ''} ${item.description || ''} ${item.supplier || ''}`;
  const engMatches = text.match(/[A-Za-z0-9]+/g) || [];
  engMatches.forEach(word => {
    if (word.length > 2 && !/^\d+$/.test(word)) { // filter out pure numbers and tiny strings
      const lower = word.toLowerCase();
      extractedEngWords.add(lower);
      allEngWordsRaw[lower] = (allEngWordsRaw[lower] || 0) + 1;
    }
  });
});

console.log(`\n📊 Extracted ${extractedCategories.size} unique categories and ${extractedEngWords.size} unique English words/brands.`);

// 4. Validate Lexicon
let missingSynonyms = 0;
for (const cat of extractedCategories) {
  if (cat !== 'כללי' && !lexicon.synonyms[cat]) {
    missingSynonyms++;
  }
}

console.log(`\n⚠️ Missing synonyms mapping for ${missingSynonyms} native categories.`);
if (missingSynonyms > 0) {
    console.log('💡 Example unmapped categories to consider:');
    const sortedCats = Object.keys(allCategoriesRaw).sort((a,b) => allCategoriesRaw[b] - allCategoriesRaw[a]);
    let printed = 0;
    for (const cat of sortedCats) {
        if (cat !== 'כללי' && !lexicon.synonyms[cat]) {
            console.log(`   - "${cat}" (appears ${allCategoriesRaw[cat]} times)`);
            printed++;
            if (printed >= 5) break;
        }
    }
}

// 5. Output common english words that might need transliteration/aliases
console.log(`\n💡 Most common English terms found in DB (consider adding to transliterations or brand_aliases):`);
const sortedEng = Object.keys(allEngWordsRaw).sort((a,b) => allEngWordsRaw[b] - allEngWordsRaw[a]);
let printedEng = 0;
for (const word of sortedEng) {
    if (!lexicon.transliterations[word] && !Object.values(lexicon.brand_aliases).flat().includes(word) && !Object.keys(lexicon.brand_aliases).map(k=>k.toLowerCase()).includes(word)) {
        console.log(`   - "${word}" (appears ${allEngWordsRaw[word]} times)`);
        printedEng++;
        if (printedEng >= 10) break;
    }
}

// 6. Update/Save the lexicon back to ensure formatting and structure
// Make sure it preserves all existing and maybe sorts keys for cleaner look
const sortedLexicon = {
  transliterations: Object.keys(lexicon.transliterations).sort().reduce((acc, k) => { acc[k] = lexicon.transliterations[k]; return acc; }, {}),
  synonyms: Object.keys(lexicon.synonyms).sort().reduce((acc, k) => { acc[k] = lexicon.synonyms[k]; return acc; }, {}),
  brand_aliases: Object.keys(lexicon.brand_aliases).sort().reduce((acc, k) => { acc[k] = lexicon.brand_aliases[k]; return acc; }, {})
};

fs.writeFileSync(lexiconFile, JSON.stringify(sortedLexicon, null, 2), 'utf-8');
console.log(`\n💾 Saved validated lexicon to ${lexiconFile}`);
