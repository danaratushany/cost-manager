# Cost Manager

A simple Cost Manager web app built with **React + Vite + MUI** and **IndexedDB**.  
Track expenses, view monthly reports (with currency conversion), and visualize spending with charts.

---

## Features

- Add costs (sum, currency, category, description)
- Monthly report with **currency conversion** (table + total)
- Charts:
  - Pie chart: totals by category
  - Bar chart: totals by month (year view)
- Settings page to set the **exchange rates URL** (saved in `localStorage`)

---

## Tech Stack

- React + Vite
- Material UI (MUI)
- IndexedDB (browser database)
- Chart.js (via react-chartjs-2)

---

## Setup & Run (Local)

### 1) Install dependencies
```bash
npm install
2) Run the development server
bash
Copy code
npm run dev
Vite will print a local URL (usually):

http://localhost:5173

Open it in your browser.

Exchange Rates (rates.json)
The app converts currencies using a JSON file shaped like:

json
Copy code
{ "USD": 1, "GBP": 0.6, "EURO": 0.7, "ILS": 3.4 }
Meaning:

1 USD = rates[CURRENCY] units of that currency.

Default setup
The project uses /rates.json by default.

Place rates.json in the Vite public folder:

public/rates.json

Change rates URL in the app
Go to Settings and set ratesUrl (stored in localStorage).
Recommended value: /rates.json

Reset Database (IndexedDB)
If you changed DB logic and see old data:

Open DevTools (F12)

Application → IndexedDB

Delete costsdb

Refresh the page

Alternative: bump the DB version in App.jsx:

js
Copy code
openCostsDB("costsdb", 2);
Build for Production
bash
Copy code
npm run build
npm run preview
Build output goes to dist/

Deployment (Netlify)
Common Netlify settings for Vite:

Build command: npm run build

Publish directory: dist

After pushing to GitHub, Netlify will deploy automatically if Auto Deploy is enabled.

Project Structure (Relevant)
src/lib/idb.js — IndexedDB wrapper (React module)

src/pages/AddCostPage.jsx — add expense form

src/pages/ReportPage.jsx — monthly report table + total

src/pages/ChartsPage.jsx — pie + bar charts

src/pages/SettingsPage.jsx — rates URL setting

public/rates.json — exchange rates file

Notes
Currency conversion uses the rule: amount → USD → target currency

Totals are calculated in the selected currency.

The report table can display converted sums (via sumInTarget) while keeping original data in IndexedDB.

