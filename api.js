"use strict";

(() => {
    const API_BASE = "http://localhost:5050/api";
    const ONLINE_CACHE_KEY = "rx_api_online";
    const BOOTSTRAP_KEY = "rx_seeded_from_json";

    const read = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    };

    const write = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const getOnlineCache = () => sessionStorage.getItem(ONLINE_CACHE_KEY) === "1";
    const setOnlineCache = (online) => sessionStorage.setItem(ONLINE_CACHE_KEY, online ? "1" : "0");

    const fetchJson = async (url, options = {}) => {
        const res = await fetch(url, {
            headers: { "Content-Type": "application/json" },
            ...options
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    const canReachBackend = async () => {
        if (getOnlineCache()) return true;
        try {
            const data = await fetchJson(`${API_BASE}/health`);
            const ok = data?.ok === true;
            setOnlineCache(ok);
            return ok;
        } catch {
            setOnlineCache(false);
            return false;
        }
    };

    const seedFromDbJson = async (storage, defaults) => {
        if (localStorage.getItem(BOOTSTRAP_KEY)) return;

        const hasLocalData = localStorage.getItem(storage.complaints) || localStorage.getItem(storage.ab) || localStorage.getItem(storage.settings);
        if (hasLocalData) {
            localStorage.setItem(BOOTSTRAP_KEY, "1");
            return;
        }

        try {
            const db = await fetchJson("db.json");
            write(storage.complaints, Array.isArray(db.complaints) ? db.complaints : defaults.complaints);
            write(storage.ab, db.ab || defaults.ab);
            write(storage.settings, db.settings || defaults.settings);
            localStorage.setItem(BOOTSTRAP_KEY, "1");
            window.dispatchEvent(new CustomEvent("rx:data-seeded"));
        } catch {
            write(storage.complaints, defaults.complaints);
            write(storage.ab, defaults.ab);
            write(storage.settings, defaults.settings);
            localStorage.setItem(BOOTSTRAP_KEY, "1");
        }
    };

    const pushSnapshot = async (snapshot) => {
        const online = await canReachBackend();
        if (!online) return false;

        try {
            await fetchJson(`${API_BASE}/db`, {
                method: "PUT",
                body: JSON.stringify(snapshot)
            });
            return true;
        } catch {
            setOnlineCache(false);
            return false;
        }
    };

    const pullSnapshot = async () => {
        const online = await canReachBackend();
        if (!online) return null;

        try {
            return await fetchJson(`${API_BASE}/db`);
        } catch {
            setOnlineCache(false);
            return null;
        }
    };

    const syncAll = async (storage, state) => {
        return pushSnapshot({
            complaints: state.complaints,
            ab: state.ab,
            settings: state.settings
        });
    };

    const saveComplaints = async (complaints) => {
        const online = await canReachBackend();
        if (!online) return false;
        try {
            await fetchJson(`${API_BASE}/complaints`, { method: "PUT", body: JSON.stringify(complaints) });
            return true;
        } catch {
            setOnlineCache(false);
            return false;
        }
    };

    const saveAb = async (ab) => {
        const online = await canReachBackend();
        if (!online) return false;
        try {
            await fetchJson(`${API_BASE}/ab`, { method: "PUT", body: JSON.stringify(ab) });
            return true;
        } catch {
            setOnlineCache(false);
            return false;
        }
    };

    const saveSettings = async (settings) => {
        const online = await canReachBackend();
        if (!online) return false;
        try {
            await fetchJson(`${API_BASE}/settings`, { method: "PUT", body: JSON.stringify(settings) });
            return true;
        } catch {
            setOnlineCache(false);
            return false;
        }
    };

    window.RXApi = {
        API_BASE,
        read,
        write,
        canReachBackend,
        seedFromDbJson,
        pullSnapshot,
        pushSnapshot,
        syncAll,
        saveComplaints,
        saveAb,
        saveSettings
    };
})();
