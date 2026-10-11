# ההטבות שלי — פורטל מועדוני צרכנות מאוחד 💳🎁🏷️
## Unified Consumer Clubs Portal: Behatsdaa, UNIQ & Mastercard Day

> **Live Web Application:** [https://elonuziel.github.io/Behatsdaa-site-ai-mesh/](https://elonuziel.github.io/Behatsdaa-site-ai-mesh/)

A modern, lightning-fast React & TypeScript application unifying Israel's premier consumer clubs into a single high-performance discovery portal:
1. **בהצדעה (Behatsdaa)**: 1,040+ participating chain stores across rechargeable wallets, rotating time-limited deals and vouchers, and 10,650+ credit card statement discounts (הנחות במעמד החיוב powered by Max / Isracard).
2. **מועדון UNIQ (הייטק ואקדמיה)**: 4 dedicated views for UNIQ club members including participating brands, loaded cards (כרטיס נטען 15%), Max benefits, and student/alumni deals.
3. **Mastercard Day (יום המאסטרקארד)**: Real-time deals active on the 10th of every month (VOYE 25%, Airalo 20%, McDonald's 50%, Terminal X, etc.), countdowns, terms, and merchant voucher validations.
4. **Mega Search & Payment Advisor (מגה חיפוש ויועץ תשלום)**: Cross-club search with Hebrew normalization, intelligent category clustering, interactive Google Maps branch view, and an instant calculator showing the best payment method for maximum savings.
5. **AI Catalog Intelligence (סייר AI ויועץ חיסכון אישי)**: Grounded AI reasoning across 13,600+ catalog records, dynamic context sizing (10 / 40 / 80 items), dual-tier location search (local physical businesses + nationwide mall chains), and multi-provider support (Gemini, OpenAI, Claude, Groq, DeepSeek).

---

## 🚀 Key Features

Explore the portal live at: **[https://elonuziel.github.io/Behatsdaa-site-ai-mesh/](https://elonuziel.github.io/Behatsdaa-site-ai-mesh/)**

- 🤖 **AI Catalog Intelligence & Personal Financial Advisor**:
  - **13,600+ Grounded Catalog Records**: Powered by multi-club data ingestion across all 3 clubs.
  - **Dual-Tier Location Search**: City-based queries (e.g. "פיצה בפתח תקווה", "ספורט בחיפה") combine **Tier A (Local Physical Businesses)** from the 10,650+ billing directory with **Tier B (Nationwide Mall Chains)** that operate local branches in that city (e.g. Pizza Hut, Domino's, Mega Sport, Fox Home).
  - **Dynamic Context Sizing (10 → 40 → 80)**: Dynamically sizes AI prompt tokens based on intent (specific store queries = ~10 items, category/city searches = ~40 items, broad "list all" queries = ~80-90 items).
  - **Strict UI Card Capping**: Chat popup stays clean and fast by capping visual highlight cards to the top 3–4 items.
  - **Multi-Provider & Offline Fallback**: Direct support for Gemini, OpenAI, Claude, Groq, and DeepSeek, with offline Web Crypto AES-256 decryption and static client-side fallback reasoning.
- 🌐 **מגה חיפוש (Mega Search Dashboard)**:
  - **Cross-Club Filtering**: Search and compare deals across Behatsdaa, UNIQ, and Mastercard simultaneously.
  - **Intelligent Category Clustering**: Curated primary discovery categories with bi-directional matching between stores and deals.
  - **UI Density Modes**: Toggle between **מצב נקי (Clean Mode)** with responsive hero cards and **מצב מפורט (Detailed Mode)** with full filter bars and carousels.
  - **Interactive Map View**: Discover branches and stores geocoded across Israel with Google Maps & MarkerClusterer integration.
  - **Comparison View**: Cross-compare discounts between different payment cards and clubs side-by-side.
- 💡 **יועץ תשלומים חכם (Smart Payment Advisor)**:
  - Click any store to calculate whether it's best to pay with a loaded gift card (e.g., 20% ארנק רשתות), a credit card statement discount (הנחה במעמד חיוב), or an active coupon/voucher.
- 🎖️ **פורטל בהצדעה (Behatsdaa Hub)**:
  - **רשתות וכרטיסים נטענים**: 1,040+ participating store chains with loaded wallet discount rates.
  - **מבצעים ושוברים ייעודיים**: 1,920+ rotating food vouchers, holiday specials, attractions, and consumer goods.
  - **הנחות במעמד החיוב**: Virtualized, ultra-fast search across 10,650+ businesses and local shops.
- 🎓 **מועדון UNIQ (UNIQ Club)**:
  - Dedicated views for brands, loaded cards, Max ++ credit card deals, and academic partner promotions.
- 💳 **Mastercard Day**:
  - Live status for the monthly 10th-of-month promotion with merchant terms and direct redemption links.
- 🔗 **URL-as-State Deep Linking**:
  - Full synchronization of search queries, tabs, subtabs, categories, store modals, and deals via standard URL search parameters (`?q=...&tab=...&cat=...`). Supports seamless browser Back / Forward history navigation.
- 🌙 **Dark & Light Themes & RTL Support**:
  - Built with Tailwind CSS and full RTL Hebrew typography.

---

## 📁 Project Structure

```text
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── chat/               # Gemini AI assistant & chat modal
│   │   ├── favorites/          # Saved items and favorites management
│   │   ├── mastercard/         # Mastercard Day active deals and terms
│   │   ├── mega/               # Mega Search sub-views (AI, comparison, map)
│   │   ├── toolbar/            # Catalog filter & sort toolbars
│   │   ├── uniq/               # UNIQ club dedicated tabs
│   │   ├── views/              # Primary view tabs (MegaSearch, Behatsdaa, CleanModeHero)
│   │   ├── CategoryChips.tsx   # Category selection carousel with toggle support
│   │   ├── MapView.tsx         # Google Maps store locator
│   │   ├── Navbar.tsx          # Top navigation with live search suggestions
│   │   ├── PaymentAdvisorModal.tsx # Maximum discount payment calculator
│   │   └── StoreCard.tsx       # Store representation with club badges
│   ├── context/                # React context providers
│   │   ├── ChatContext.tsx     # AI chat state
│   │   ├── ClubContext.tsx     # Active clubs filter state
│   │   ├── FavoritesContext.tsx# Saved stores & deals
│   │   ├── SearchContext.tsx   # Search query, tabs, category, & URL synchronization
│   │   └── ThemeContext.tsx    # Light/Dark mode state
│   ├── hooks/                  # Custom React hooks
│   │   ├── useMiniSearch.ts    # High-performance search, clustering & Hebrew tokenizer
│   │   ├── useGoogleMap.ts     # Google Maps API hook
│   │   └── usePaymentAdvisor.ts# Optimal savings payment calculation
│   ├── utils/                  # Core utility modules
│   │   ├── crosslink.ts        # Store-deal crosslinking algorithms
│   │   ├── hebrew.ts           # Hebrew text normalization & final-letter handling
│   │   ├── israelCities.ts     # Geocoded city & store coordinate lookup
│   │   ├── paymentAdvisor.ts   # Discount engine
│   │   └── search.ts           # MiniSearch search engine instance
│   ├── types/                  # TypeScript interfaces and types
│   ├── App.tsx                 # Application root & tab routing
│   └── main.tsx                # Entry point
├── data/                       # Master datasets (stores, deals, billing, lexicon)
├── scripts/                    # Build scripts & data processors
├── tests/                      # Automated test suite
├── public/                     # Static assets and pre-computed indexes
└── package.json                # Project dependencies and npm scripts
```

---

## 💻 Local Development & Build

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/elonuziel/Behatsdaa-site-ai-mesh.git
cd Behatsdaa-site-ai-mesh

# Install dependencies
npm ci
```

### 3. Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🧪 Automated Testing & Verification

The project includes an automated test suite verifying search performance, data integrity, and normalization:

```bash
# Run unit & data integrity tests:
npm test

# Run UI & integration tests:
node tests/test_ui.js

# Run search benchmarks:
node tests/benchmark.js
```

---

## 📄 License & Attribution
Created for the benefit of Israeli reserve soldiers (Miluim) and club beneficiaries. Brand names, logos, and trademarks belong to their respective clubs: [בהצדעה](https://www.behatsdaa.org.il), [UNIQ](https://www.uniq.co.il), and [Mastercard](https://www.mastercard.co.il).
