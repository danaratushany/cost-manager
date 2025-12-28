"use strict";

const DEFAULT_STORE = "costs";
const RATES_KEY = "ratesUrl";

function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function fetchRates() {
    const url = (localStorage.getItem(RATES_KEY) || "").trim();
    if (!url) {
        throw new Error("Rates URL is not set. Please set it in Settings.");
    }

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch rates (HTTP ${res.status}).`);
    }

    const data = await res.json(); // {USD:1, GBP:0.6, EURO:0.7, ILS:3.4}
    return data;
}
function convert(sum, fromCurrency, toCurrency, rates) {
    const from = String(fromCurrency);
    const to = String(toCurrency);

    const n = Number(sum);
    if (!Number.isFinite(n)) return 0;
    if (from === to) return n;

    const fromRate = rates[from];
    const toRate = rates[to];

    if (typeof fromRate !== "number" || typeof toRate !== "number") {
        throw new Error("Unsupported currency in rates response.");
    }

    // rates: 1 USD = X <currency>
    // from -> USD: sum / fromRate
    // USD -> to: * toRate
    const usd = n / fromRate;
    return usd * toRate;
}

export async function openCostsDB(databaseName, databaseVersion) {
    const openRequest = indexedDB.open(databaseName, databaseVersion);

    openRequest.onupgradeneeded = () => {
        const db = openRequest.result;

        if (!db.objectStoreNames.contains(DEFAULT_STORE)) {
            const store = db.createObjectStore(DEFAULT_STORE, {
                keyPath: "id",
                autoIncrement: true
            });
            store.createIndex("year_month", ["year", "month"], { unique: false });
        }
    };
    const db = await promisifyRequest(openRequest);

    async function addCost(cost) {
        const now = new Date();

        const costToSave = {
            sum: Number(cost.sum),
            currency: String(cost.currency),
            category: String(cost.category),
            description: String(cost.description),
            createdAt: now.toISOString(),
            year: now.getFullYear(),
            month: now.getMonth() + 1
        };

        const tx = db.transaction(DEFAULT_STORE, "readwrite");
        const store = tx.objectStore(DEFAULT_STORE);
        const id = await promisifyRequest(store.add(costToSave));

        return { id, ...costToSave };
    }

    async function getReport(year, month, currency) {
        const y = Number(year);
        const m = Number(month);
        const targetCurrency = String(currency);

        const tx = db.transaction(DEFAULT_STORE, "readonly");
        const store = tx.objectStore(DEFAULT_STORE);
        const index = store.index("year_month");
        const items = await promisifyRequest(index.getAll([y, m]));
        const needsRates = items.some((c) => String(c.currency) !== targetCurrency);
        const rates = needsRates ? await fetchRates() : null;

        const costs = items.map((c) => {
            const sumOriginal = Number(c.sum);
            const sumInTarget = needsRates
                ? convert(sumOriginal, c.currency, targetCurrency, rates)
                : sumOriginal;

            return {
                ...c,
                sumInTarget: Number(sumInTarget.toFixed(2)),
                targetCurrency
            };
        });

        const total = costs.reduce((acc, c) => acc + Number(c.sumInTarget), 0);

        return {
            year: y,
            month: m,
            costs,
            total: { currency: targetCurrency, total: Number(total.toFixed(2)) }
        };
    }
    async function getCategoryTotals(year, month, currency) {
        const r = await getReport(year, month, currency);

        const map = new Map();
        for (const c of r.costs) {
            const cat = String(c.category || "Other");
            const val = Number.isFinite(Number(c.sumInTarget)) ? Number(c.sumInTarget) : Number(c.sum);
            map.set(cat, (map.get(cat) || 0) + val);
        }

        return Array.from(map.entries()).map(([category, total]) => ({
            category,
            total: Number(total.toFixed(2))
        }));
    }

    async function getYearMonthlyTotals(year, currency) {
        const y = Number(year);
        const results = [];

        for (let m = 1; m <= 12; m++) {
            const r = await getReport(y, m, currency);
            results.push(Number(r.total.total));
        }

        return results;
    }

    return { addCost, getReport, getCategoryTotals, getYearMonthlyTotals };
}