"use strict";

const ResolveXCore = (() => {
    const STORAGE = {
        complaints: "rx_complaints",
        ab: "rx_ab_stats",
        settings: "rx_settings"
    };

    const STATUS = ["Submitted", "In Review", "In Progress", "Resolved", "Rejected"];
    const ACTIVE_STATUS = ["Submitted", "In Review", "In Progress"];
    const CATEGORY = ["Delivery", "Billing", "Product", "Service", "Technical", "Other"];
    const ETA_DAYS = { "Submitted": 5, "In Review": 4, "In Progress": 2, "Resolved": 0, "Rejected": 0 };

    const defaultComplaints = [
        { id: "CMP001", name: "Ava Johnson", email: "ava@example.com", category: "Delivery", description: "Package arrived late", status: "Resolved", rating: 4, createdAt: "2026-02-14" },
        { id: "CMP002", name: "Noah Williams", email: "noah@example.com", category: "Billing", description: "Duplicate charge", status: "In Review", rating: null, createdAt: "2026-02-16" },
        { id: "CMP003", name: "Mia Brown", email: "mia@example.com", category: "Technical", description: "App crashes on login", status: "Submitted", rating: null, createdAt: "2026-02-18" }
    ];

    const defaultSettings = {
        theme: "light",
        compactMode: false,
        toastEnabled: true,
        autoPromptFeedback: true
    };

    const safeParse = (raw, fallback) => {
        if (raw == null) return fallback;
        try {
            const parsed = JSON.parse(raw);
            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    };

    const getComplaints = () => safeParse(localStorage.getItem(STORAGE.complaints), defaultComplaints.slice());
    const saveComplaints = (data) => {
        localStorage.setItem(STORAGE.complaints, JSON.stringify(data));
        window.RXApi?.saveComplaints?.(data);
    };

    const getAbStats = () => safeParse(localStorage.getItem(STORAGE.ab), { a: 0, b: 0 });
    const saveAbStats = (data) => {
        localStorage.setItem(STORAGE.ab, JSON.stringify(data));
        window.RXApi?.saveAb?.(data);
    };

    const getSettings = () => ({ ...defaultSettings, ...safeParse(localStorage.getItem(STORAGE.settings), {}) });
    const saveSettings = (data) => {
        const merged = { ...defaultSettings, ...data };
        localStorage.setItem(STORAGE.settings, JSON.stringify(merged));
        window.RXApi?.saveSettings?.(merged);
    };

    const seedIfNeeded = () => {
        if (!localStorage.getItem(STORAGE.complaints)) saveComplaints(defaultComplaints.slice());
        if (!localStorage.getItem(STORAGE.ab)) saveAbStats({ a: 0, b: 0 });
        if (!localStorage.getItem(STORAGE.settings)) saveSettings(defaultSettings);

        // Optional JSON bootstrap + backend sync support.
        window.RXApi?.seedFromDbJson?.(STORAGE, {
            complaints: defaultComplaints.slice(),
            ab: { a: 0, b: 0 },
            settings: defaultSettings
        });
    };

    const pullFromBackend = async () => {
        const snapshot = await window.RXApi?.pullSnapshot?.();
        if (!snapshot) return false;

        localStorage.setItem(STORAGE.complaints, JSON.stringify(Array.isArray(snapshot.complaints) ? snapshot.complaints : []));
        localStorage.setItem(STORAGE.ab, JSON.stringify(snapshot.ab || { a: 0, b: 0 }));
        localStorage.setItem(STORAGE.settings, JSON.stringify({ ...defaultSettings, ...(snapshot.settings || {}) }));
        return true;
    };

    const pushToBackend = async () => {
        return Boolean(await window.RXApi?.syncAll?.(STORAGE, {
            complaints: getComplaints(),
            ab: getAbStats(),
            settings: getSettings()
        }));
    };

    const getNextId = (complaints) => {
        const maxNum = complaints.reduce((max, c) => {
            const n = Number(String(c.id || "").replace("CMP", ""));
            return Number.isFinite(n) ? Math.max(max, n) : max;
        }, 0);
        return `CMP${String(maxNum + 1).padStart(3, "0")}`;
    };

    const getStatusBadge = (status) => {
        const map = {
            "Submitted": "badge-submitted",
            "In Review": "badge-review",
            "In Progress": "badge-progress",
            "Resolved": "badge-resolved",
            "Rejected": "badge-rejected"
        };
        return `<span class="badge ${map[status] || "bg-secondary"} px-3 py-2">${status}</span>`;
    };

    const etaLabel = (complaint) => {
        if (complaint.status === "Resolved") return "Resolved";
        if (complaint.status === "Rejected") return "Closed";

        const created = new Date(`${complaint.createdAt}T00:00:00`);
        const eta = new Date(created);
        eta.setDate(eta.getDate() + (ETA_DAYS[complaint.status] ?? 4));

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const diff = Math.ceil((eta - now) / 86400000);
        if (diff < 0) return `Overdue ${Math.abs(diff)} day(s)`;
        if (diff === 0) return "Due today";
        return `${diff} day(s) left`;
    };

    const avgRating = (complaints) => {
        const ratings = complaints.filter((c) => Number.isInteger(c.rating)).map((c) => c.rating);
        if (!ratings.length) return 0;
        return ratings.reduce((a, b) => a + b, 0) / ratings.length;
    };

    const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

    const complaintsToCsv = (rows) => {
        const header = ["id", "name", "email", "category", "description", "status", "rating", "createdAt"];
        return [
            header.join(","),
            ...rows.map((r) => [r.id, r.name, r.email, r.category, r.description, r.status, r.rating ?? "", r.createdAt]
                .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
        ].join("\n");
    };

    const downloadCsv = (rows, filenamePrefix = "complaints") => {
        const csv = complaintsToCsv(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const setupShell = (activePage) => {
        const user = window.RXAuth?.requireAuth ? window.RXAuth.requireAuth() : { name: "Admin User", email: "admin@resolvex.com" };
        if (!user && window.RXAuth?.requireAuth) return;

        seedIfNeeded();
        applySettings();
        applyNavIcons();
        setupRevealAnimations();
        setupPageTransitions();

        const dateEl = document.getElementById("current-date");
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });
        }

        const userNameEl = document.getElementById("nav-user-name");
        if (userNameEl) userNameEl.textContent = user?.name || "Admin User";

        const profileName = document.getElementById("profile-name");
        const profileEmail = document.getElementById("profile-email");
        const profileLastLogin = document.getElementById("profile-last-login");
        if (profileName) profileName.textContent = user?.name || "Admin User";
        if (profileEmail) profileEmail.textContent = user?.email || "admin@resolvex.com";
        if (profileLastLogin) profileLastLogin.textContent = new Date(user?.loginAt || Date.now()).toLocaleString();

        document.querySelectorAll("[data-page]").forEach((link) => {
            link.classList.toggle("active", link.dataset.page === activePage);
        });

        document.getElementById("menu-toggle")?.addEventListener("click", () => {
            document.getElementById("wrapper")?.classList.toggle("toggled");
        });

        document.getElementById("logout-link")?.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.RXAuth?.clearAuth) window.RXAuth.clearAuth();
            window.location.href = "landing.html";
        });

        document.getElementById("go-settings")?.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "settings.html";
        });
    };

    const applyNavIcons = () => {
        const iconMap = {
            home: "fa-house",
            submit: "fa-plus-circle",
            product: "fa-box-open",
            tracking: "fa-list-check",
            admin: "fa-sliders",
            analytics: "fa-chart-pie",
            feedback: "fa-star",
            settings: "fa-gear"
        };

        document.querySelectorAll("[data-page]").forEach((link) => {
            if (link.querySelector("i")) return;
            const page = link.dataset.page;
            const icon = iconMap[page];
            if (!icon) return;
            link.innerHTML = `<i class="fas ${icon} me-2"></i>${link.textContent.trim()}`;
        });
    };

    const setupRevealAnimations = () => {
        const targets = document.querySelectorAll(".card, .quick-link, .hero-banner, .stats-grid > div");
        targets.forEach((el) => el.classList.add("reveal"));

        if (!("IntersectionObserver" in window)) {
            targets.forEach((el) => el.classList.add("show"));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        targets.forEach((el) => observer.observe(el));
    };

    const setupPageTransitions = () => {
        document.body.classList.add("transition-enabled");
        requestAnimationFrame(() => {
            document.body.classList.add("page-ready");
        });

        if (!document.getElementById("page-transition-overlay")) {
            const overlay = document.createElement("div");
            overlay.id = "page-transition-overlay";
            overlay.className = "page-transition-overlay";
            document.body.appendChild(overlay);
        }

        const overlayEl = document.getElementById("page-transition-overlay");
        document.querySelectorAll('a[href$=".html"]').forEach((link) => {
            link.addEventListener("click", (event) => {
                if (
                    event.defaultPrevented ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    link.target === "_blank"
                ) {
                    return;
                }

                const href = link.getAttribute("href");
                if (!href || href.startsWith("http")) return;
                if (href === window.location.pathname.split("/").pop()) return;

                event.preventDefault();
                overlayEl?.classList.add("show");
                document.body.classList.add("page-leave");
                setTimeout(() => {
                    window.location.href = href;
                }, 220);
            });
        });
    };

    const animateCounters = (root = document) => {
        const elements = root.querySelectorAll(".stat-value");
        elements.forEach((el) => {
            const finalText = String(el.textContent || "").trim();
            const match = finalText.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
            if (!match) return;

            const end = Number(match[1]);
            if (!Number.isFinite(end)) return;
            const suffix = match[2] || "";
            const decimals = match[1].includes(".") ? 1 : 0;
            const duration = 700;
            const startTime = performance.now();

            const tick = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = end * eased;
                el.textContent = `${current.toFixed(decimals)}${suffix}`;
                if (progress < 1) requestAnimationFrame(tick);
            };

            requestAnimationFrame(tick);
        });
    };

    const showToast = (msg) => {
        const toastEl = document.getElementById("appToast");
        const bodyEl = document.getElementById("toast-body");
        const settings = getSettings();
        if (!toastEl || !bodyEl || !settings.toastEnabled) return;
        bodyEl.textContent = msg;
        const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2200 });
        toast.show();
    };

    const applySettings = () => {
        const settings = getSettings();
        document.documentElement.setAttribute("data-theme", settings.theme);
        document.body.classList.toggle("compact", Boolean(settings.compactMode));
    };

    return {
        STORAGE,
        STATUS,
        ACTIVE_STATUS,
        CATEGORY,
        seedIfNeeded,
        getComplaints,
        saveComplaints,
        getAbStats,
        saveAbStats,
        getSettings,
        saveSettings,
        getNextId,
        getStatusBadge,
        etaLabel,
        avgRating,
        esc,
        downloadCsv,
        setupShell,
        showToast,
        applySettings,
        animateCounters,
        pullFromBackend,
        pushToBackend
    };
})();
