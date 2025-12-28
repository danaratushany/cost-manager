"use strict";

(function () {
    const DEFAULT_STORE = "costs";

    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function openCostsDB(databaseName, databaseVersion) {
        const openRequest = indexedDB.open(String(databaseName), Number(databaseVersion));

        openRequest.onupgradeneeded = () => {
            const db = openRequest.result;

            if (!db.objectStoreNames.contains(DEFAULT_STORE)) {
                const store = db.createObjectStore(DEFAULT_STORE, { keyPath: "id", autoIncrement: true });
                store.createIndex("year_month", ["year", "month"], { unique: false });
            }
        };

        return promisifyRequest(openRequest).then((db) => {
            function addCost(cost) {
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

                return promisifyRequest(store.add(costToSave)).then((id) => ({ id, ...costToSave }));
            }

            function getReport(year, month, currency) {
                const y = Number(year);
                const m = Number(month);

                const tx = db.transaction(DEFAULT_STORE, "readonly");
                const store = tx.objectStore(DEFAULT_STORE);
                const index = store.index("year_month");

                return promisifyRequest(index.getAll([y, m])).then((items) => {
                    const total = items.reduce((acc, c) => acc + Number(c.sum), 0);

                    return {
                        year: y,
                        month: m,
                        costs: items,
                        total: { currency: String(currency), total: Number(total.toFixed(2)) }
                    };
                });
            }

            return { addCost, getReport };
        });
    }

    window.idb = { openCostsDB };
})();