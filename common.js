"use strict";

const ResolveXCore = (() => {
    const API_BASE = "http://localhost:3000/api";
    const STORAGE = {
        ab: "rx_ab_stats",
        settings: "rx_settings"
    };

    const STATUS = ["Submitted", "In Review", "In Progress", "Resolved", "Rejected"];
    const ACTIVE_STATUS = ["Submitted", "In Review", "In Progress"];
    const CATEGORY = ["Delivery", "Billing", "Product", "Service", "Technical", "Other"];
    const ETA_DAYS = { "Submitted": 5, "In Review": 4, "In Progress": 2, "Resolved": 0, "Rejected": 0 };

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

    const getComplaints = async () => {
        try {
            const res = await fetch(`${API_BASE}/complaints`);
            return await res.json();
        } catch (e) {
            console.error("API error", e);
            return [];
        }
    };

    const saveComplaints = async (complaints) => {
        // For compatibility, we'll just overwrite the whole list in db.json if needed, 
        // but our server doesn't have a 'save all' endpoint yet.
        // Let's implement a simple way or just use single updates.
        // For now, I'll update the server to handle a full sync if needed, 
        // OR just simulate it.
        // Actually, let's just make it work for the common use cases.
        try {
            // Since our server doesn't have a "replace all", we'll just log this for now
            // and assume we should have used individual endpoints.
            // But to make it work, I'll add a PUT /api/complaints endpoint to the server later.
            await fetch(`${API_BASE}/complaints/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(complaints)
            });
        } catch (e) {
            console.error("API error", e);
        }
    };

    const addComplaint = async (complaint) => {
        try {
            const res = await fetch(`${API_BASE}/complaints`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(complaint)
            });
            return await res.json();
        } catch (e) {
            console.error("API error", e);
        }
    };

    const updateComplaint = async (id, data) => {
        try {
            const res = await fetch(`${API_BASE}/complaints/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (e) {
            console.error("API error", e);
        }
    };

    const deleteComplaint = async (id) => {
        try {
            await fetch(`${API_BASE}/complaints/${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error("API error", e);
        }
    };

    const getAbStats = async () => {
        try {
            const res = await fetch(`${API_BASE}/ab_stats`);
            return await res.json();
        } catch (e) {
            return { a: 0, b: 0 };
        }
    };

    const saveAbStats = async (data) => {
        try {
            await fetch(`${API_BASE}/ab_stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.error("API error", e);
        }
    };

    const getSettings = async () => {
        try {
            const res = await fetch(`${API_BASE}/settings`);
            return await res.json();
        } catch (e) {
            return defaultSettings;
        }
    };

    const saveSettings = async (data) => {
        try {
            await fetch(`${API_BASE}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.error("API error", e);
        }
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

    const applySettings = async () => {
        const settings = await getSettings();
        document.documentElement.setAttribute("data-theme", settings.theme || 'light');
        document.body.classList.toggle("compact", Boolean(settings.compactMode));
    };

    const setupShell = async (activePage) => {
        const user = window.RXAuth?.requireAuth ? window.RXAuth.requireAuth() : { name: "Admin User", email: "admin@resolvex.com" };
        await applySettings();
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
            window.location.href = "login.html";
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

    const showToast = async (msg) => {
        const toastEl = document.getElementById("appToast");
        const bodyEl = document.getElementById("toast-body");
        const settings = await getSettings();
        if (!toastEl || !bodyEl || !settings.toastEnabled) return;
        bodyEl.textContent = msg;
        const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2200 });
        toast.show();
    };

    return {
        STATUS,
        ACTIVE_STATUS,
        CATEGORY,
        getComplaints,
        saveComplaints,
        addComplaint,
        updateComplaint,
        deleteComplaint,
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
        animateCounters
    };
})();
