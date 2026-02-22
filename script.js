"use strict";

const ResolveX = (() => {
    const STORAGE_KEYS = {
        complaints: "rx_complaints",
        abStats: "rx_ab_stats"
    };

    const STATUS = ["Submitted", "In Review", "In Progress", "Resolved", "Rejected"];
    const ACTIVE_STATUS = ["Submitted", "In Review", "In Progress"];
    const ETA_DAYS = {
        "Submitted": 5,
        "In Review": 4,
        "In Progress": 2,
        "Resolved": 0,
        "Rejected": 0
    };

    const sampleComplaints = [
        { id: "CMP001", name: "Ava Johnson", email: "ava@example.com", category: "Delivery", description: "Package arrived late.", status: "Resolved", rating: 4, createdAt: "2026-02-14" },
        { id: "CMP002", name: "Noah Williams", email: "noah@example.com", category: "Billing", description: "Duplicate card charge.", status: "In Review", rating: null, createdAt: "2026-02-16" },
        { id: "CMP003", name: "Mia Brown", email: "mia@example.com", category: "Technical", description: "App crashes at login.", status: "Submitted", rating: null, createdAt: "2026-02-18" }
    ];

    let complaints = [];
    let abStats = { a: 0, b: 0 };
    let statusChart = null;
    let categoryChart = null;
    let currentRatingId = null;
    let selectedRating = 0;

    const user = window.RXAuth.requireAuth();

    const el = {
        navLinks: document.querySelectorAll("#sidebar-wrapper .nav-link"),
        sections: document.querySelectorAll(".app-section"),
        complaintForm: document.getElementById("complaint-form"),
        compId: document.getElementById("comp-id"),
        compDate: document.getElementById("comp-date"),
        compName: document.getElementById("comp-name"),
        compEmail: document.getElementById("comp-email"),
        compCategory: document.getElementById("comp-category"),
        compDescription: document.getElementById("comp-description"),
        abTestContainer: document.getElementById("ab-test-container"),
        currentDate: document.getElementById("current-date"),
        navUserName: document.getElementById("nav-user-name"),
        profileBody: document.getElementById("profile-body"),
        complaintsList: document.getElementById("complaints-list"),
        adminComplaintsList: document.getElementById("admin-complaints-list"),
        feedbackList: document.getElementById("feedback-list"),
        feedbackSummary: document.getElementById("feedback-summary"),
        statsCards: document.getElementById("stats-cards"),
        filterStatus: document.getElementById("filter-status"),
        filterCategory: document.getElementById("filter-category"),
        sortDate: document.getElementById("sort-date"),
        searchText: document.getElementById("search-text"),
        exportCsvBtn: document.getElementById("export-csv-btn"),
        refreshComplaintsBtn: document.getElementById("refresh-complaints"),
        menuToggle: document.getElementById("menu-toggle"),
        wrapper: document.getElementById("wrapper"),
        clearDataBtn: document.getElementById("clear-data-btn"),
        profileLink: document.getElementById("profile-link"),
        settingsLink: document.getElementById("settings-link"),
        logoutLink: document.getElementById("logout-link"),
        detailsTitle: document.getElementById("detailsModalTitle"),
        detailsBody: document.getElementById("detailsModalBody"),
        starsWrap: document.getElementById("rating-stars"),
        submitRatingBtn: document.getElementById("submit-rating"),
        clicksA: document.getElementById("clicks-a"),
        clicksB: document.getElementById("clicks-b"),
        abWinnerMsg: document.getElementById("ab-winner-msg"),
        toastBody: document.getElementById("toast-body"),
        toast: document.getElementById("appToast")
    };

    const modal = {
        details: new bootstrap.Modal(document.getElementById("detailsModal")),
        rating: new bootstrap.Modal(document.getElementById("ratingModal")),
        profile: new bootstrap.Modal(document.getElementById("profileModal")),
        settings: new bootstrap.Modal(document.getElementById("settingsModal"))
    };
    const toast = new bootstrap.Toast(el.toast, { delay: 2200 });

    const showToast = (msg) => {
        el.toastBody.textContent = msg;
        toast.show();
    };

    const loadData = () => {
        complaints = JSON.parse(localStorage.getItem(STORAGE_KEYS.complaints)) || sampleComplaints;
        abStats = JSON.parse(localStorage.getItem(STORAGE_KEYS.abStats)) || { a: 0, b: 0 };
        saveAll();
    };

    const saveAll = () => {
        localStorage.setItem(STORAGE_KEYS.complaints, JSON.stringify(complaints));
        localStorage.setItem(STORAGE_KEYS.abStats, JSON.stringify(abStats));
    };

    const getNextComplaintId = () => {
        const max = complaints.reduce((acc, c) => {
            const n = Number((c.id || "").replace("CMP", ""));
            return Number.isFinite(n) ? Math.max(acc, n) : acc;
        }, 0);
        return `CMP${String(max + 1).padStart(3, "0")}`;
    };

    const updateDateFields = () => {
        const now = new Date();
        el.currentDate.textContent = now.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
        el.compDate.value = now.toISOString().slice(0, 10);
        el.compId.value = getNextComplaintId();
    };

    const etaLabel = (complaint) => {
        if (complaint.status === "Resolved") return "Resolved";
        if (complaint.status === "Rejected") return "Closed";

        const created = new Date(`${complaint.createdAt}T00:00:00`);
        const eta = new Date(created);
        eta.setDate(eta.getDate() + ETA_DAYS[complaint.status]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diff = Math.ceil((eta.getTime() - today.getTime()) / 86400000);
        if (diff < 0) return `Overdue by ${Math.abs(diff)} day(s)`;
        if (diff === 0) return "Due today";
        return `${diff} day(s) left`;
    };

    const navigate = (sectionId, syncHash = true) => {
        el.sections.forEach((section) => section.classList.add("d-none"));
        const target = document.getElementById(sectionId);
        if (target) target.classList.remove("d-none");

        el.navLinks.forEach((link) => {
            link.classList.toggle("active", link.dataset.section === sectionId);
        });

        if (syncHash) window.location.hash = sectionId;

        if (sectionId === "tracking-section") renderTracking();
        if (sectionId === "admin-section") renderDashboard();
        if (sectionId === "analytics-section") renderAnalytics();
        if (sectionId === "feedback-section") renderFeedbackSection();
    };

    const getStatusBadge = (status) => {
        const classMap = {
            "Submitted": "badge-submitted",
            "In Review": "badge-review",
            "In Progress": "badge-progress",
            "Resolved": "badge-resolved",
            "Rejected": "badge-rejected"
        };
        return `<span class="badge ${classMap[status] || "bg-secondary"} px-3 py-2">${status}</span>`;
    };

    const renderSubmitButtonVariant = () => {
        const version = Math.random() < 0.5 ? "a" : "b";
        const html = version === "a"
            ? `<button type="submit" class="btn btn-primary btn-lg w-100 ab-btn" data-version="a">Submit Complaint</button>`
            : `<button type="submit" class="btn btn-success btn-lg w-100 rounded-pill ab-btn" data-version="b">Send Request <i class="fas fa-arrow-right ms-1"></i></button>`;
        el.abTestContainer.innerHTML = html;
    };

    const getFilteredSortedComplaints = () => {
        const status = el.filterStatus.value;
        const category = el.filterCategory.value;
        const sort = el.sortDate.value;
        const query = el.searchText.value.trim().toLowerCase();

        const filtered = complaints.filter((item) => {
            const statusMatch = status === "All" || item.status === status;
            const categoryMatch = category === "All" || item.category === category;
            const textPool = `${item.name} ${item.email} ${item.description} ${item.id}`.toLowerCase();
            const searchMatch = !query || textPool.includes(query);
            return statusMatch && categoryMatch && searchMatch;
        });

        filtered.sort((a, b) => {
            const aDate = new Date(a.createdAt).getTime();
            const bDate = new Date(b.createdAt).getTime();
            return sort === "newest" ? bDate - aDate : aDate - bDate;
        });

        return filtered;
    };

    const averageRating = () => {
        const ratings = complaints.filter((c) => Number.isInteger(c.rating)).map((c) => c.rating);
        if (!ratings.length) return 0;
        return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    };

    const renderStatsCards = () => {
        const total = complaints.length;
        const pending = complaints.filter((c) => ACTIVE_STATUS.includes(c.status)).length;
        const resolved = complaints.filter((c) => c.status === "Resolved").length;
        const rejected = complaints.filter((c) => c.status === "Rejected").length;
        const avg = averageRating();

        el.statsCards.innerHTML = [
            statCard("Total Complaints", total, "fa-folder-open", "primary"),
            statCard("Pending", pending, "fa-clock", "warning"),
            statCard("Resolved", resolved, "fa-check-circle", "success"),
            statCard("Rejected", rejected, "fa-circle-xmark", "danger"),
            statCard("Avg Satisfaction", `${avg.toFixed(1)} / 5`, "fa-star", "info")
        ].join("");
    };

    const statCard = (title, value, icon, color) => `
        <div class="col-xl col-md-4 col-sm-6">
            <div class="card stat-card border-0 shadow-sm rounded-4 p-3 h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="p-2 rounded-3 bg-${color} bg-opacity-10 text-${color}"><i class="fas ${icon}"></i></div>
                </div>
                <h6 class="text-muted mb-1">${title}</h6>
                <h3 class="fw-bold mb-0">${value}</h3>
            </div>
        </div>
    `;

    const renderTracking = () => {
        if (!complaints.length) {
            el.complaintsList.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No complaints submitted yet.</td></tr>';
            return;
        }

        el.complaintsList.innerHTML = complaints.map((c) => `
            <tr>
                <td class="fw-bold text-primary">${c.id}</td>
                <td>${c.name}</td>
                <td>${c.category}</td>
                <td><span class="eta-pill">${etaLabel(c)}</span></td>
                <td>${getStatusBadge(c.status)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary action-view" data-id="${c.id}">View</button>
                    ${c.status === "Resolved" && !c.rating ? `<button class="btn btn-sm btn-primary action-rate" data-id="${c.id}">Rate</button>` : ""}
                </td>
            </tr>
        `).join("");
    };

    const renderAdminTable = () => {
        const rows = getFilteredSortedComplaints();

        if (!rows.length) {
            el.adminComplaintsList.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">No data matches selected filters.</td></tr>';
            return;
        }

        el.adminComplaintsList.innerHTML = rows.map((c) => `
            <tr>
                <td class="fw-bold text-primary">${c.id}</td>
                <td>
                    <div class="fw-semibold">${c.name}</div>
                    <small class="text-muted">${c.email}</small>
                </td>
                <td><span class="badge bg-light text-dark border">${c.category}</span></td>
                <td>${c.createdAt}</td>
                <td>
                    <select class="form-select form-select-sm status-changer" data-id="${c.id}">
                        ${STATUS.map((s) => `<option value="${s}" ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}
                    </select>
                </td>
                <td>${Number.isInteger(c.rating) ? `<span class="text-warning"><i class="fas fa-star"></i> ${c.rating}</span>` : '<span class="text-muted">Not rated</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-light border action-view" data-id="${c.id}"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-light border text-danger action-delete" data-id="${c.id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `).join("");
    };

    const renderDashboard = () => {
        renderStatsCards();
        renderAdminTable();
        renderFeedbackSection();
        renderAnalytics();
    };

    const renderFeedbackSection = () => {
        const resolved = complaints.filter((c) => c.status === "Resolved");
        const rated = resolved.filter((c) => Number.isInteger(c.rating));
        const unrated = resolved.filter((c) => !Number.isInteger(c.rating));
        const avg = rated.length ? (rated.reduce((sum, c) => sum + c.rating, 0) / rated.length).toFixed(1) : "0.0";

        el.feedbackSummary.innerHTML = `
            <div class="col-md-4"><div class="feedback-card"><h6>Resolved Cases</h6><h3>${resolved.length}</h3></div></div>
            <div class="col-md-4"><div class="feedback-card"><h6>Ratings Collected</h6><h3>${rated.length}</h3></div></div>
            <div class="col-md-4"><div class="feedback-card"><h6>Average Rating</h6><h3>${avg} / 5</h3></div></div>
            <div class="col-12"><small class="text-muted">Unrated resolved complaints: ${unrated.length}</small></div>
        `;

        if (!resolved.length) {
            el.feedbackList.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No resolved complaints yet.</td></tr>';
            return;
        }

        el.feedbackList.innerHTML = resolved.map((c) => `
            <tr>
                <td class="fw-bold text-primary">${c.id}</td>
                <td>${c.name}</td>
                <td>${c.category}</td>
                <td>${getStatusBadge(c.status)}</td>
                <td>${Number.isInteger(c.rating) ? `<span class="text-warning">${"<i class='fas fa-star'></i> ".repeat(c.rating)}</span>` : '<span class="text-muted">Awaiting rating</span>'}</td>
            </tr>
        `).join("");
    };

    const renderAnalytics = () => {
        const statusCounts = STATUS.map((s) => complaints.filter((c) => c.status === s).length);
        const categories = Array.from(new Set(complaints.map((c) => c.category)));
        const categoryCounts = categories.map((cat) => complaints.filter((c) => c.category === cat).length);

        if (statusChart) statusChart.destroy();
        if (categoryChart) categoryChart.destroy();

        const statusCtx = document.getElementById("statusChart").getContext("2d");
        statusChart = new Chart(statusCtx, {
            type: "pie",
            data: {
                labels: STATUS,
                datasets: [{
                    data: statusCounts,
                    backgroundColor: ["#5b8def", "#f0ad4e", "#2f855a", "#20a779", "#d9534f"]
                }]
            },
            options: { plugins: { legend: { position: "bottom" } } }
        });

        const catCtx = document.getElementById("categoryChart").getContext("2d");
        categoryChart = new Chart(catCtx, {
            type: "bar",
            data: {
                labels: categories,
                datasets: [{
                    label: "Complaints",
                    data: categoryCounts,
                    backgroundColor: "rgba(91, 141, 239, 0.85)",
                    borderRadius: 8
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

        el.clicksA.textContent = String(abStats.a);
        el.clicksB.textContent = String(abStats.b);
        const total = abStats.a + abStats.b;
        if (!total) {
            el.abWinnerMsg.className = "alert alert-info border-0 mb-0";
            el.abWinnerMsg.textContent = "Not enough data to determine a winner.";
        } else {
            const winner = abStats.a === abStats.b ? "Tie" : (abStats.a > abStats.b ? "Version A" : "Version B");
            el.abWinnerMsg.className = `alert ${winner === "Tie" ? "alert-info" : "alert-success"} border-0 mb-0`;
            el.abWinnerMsg.textContent = `Current result: ${winner}. Total tracked clicks: ${total}.`;
        }
    };

    const exportCsv = () => {
        const rows = getFilteredSortedComplaints();
        if (!rows.length) {
            showToast("No rows to export.");
            return;
        }

        const header = ["id", "name", "email", "category", "status", "rating", "createdAt"];
        const csv = [
            header.join(","),
            ...rows.map((r) => [r.id, r.name, r.email, r.category, r.status, r.rating ?? "", r.createdAt]
                .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `complaints_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("CSV exported successfully.");
    };

    const showDetails = (id) => {
        const c = complaints.find((item) => item.id === id);
        if (!c) return;

        el.detailsTitle.textContent = `Complaint ${c.id}`;
        el.detailsBody.innerHTML = `
            <div class="mb-3">${getStatusBadge(c.status)}</div>
            <p class="mb-1"><strong>Name:</strong> ${c.name}</p>
            <p class="mb-1"><strong>Email:</strong> ${c.email}</p>
            <p class="mb-1"><strong>Category:</strong> ${c.category}</p>
            <p class="mb-1"><strong>Date:</strong> ${c.createdAt}</p>
            <p class="mb-1"><strong>ETA:</strong> ${etaLabel(c)}</p>
            <p class="mb-0"><strong>Description:</strong><br>${c.description}</p>
        `;
        modal.details.show();
    };

    const openRatingModal = (id) => {
        const complaint = complaints.find((c) => c.id === id);
        if (!complaint || complaint.status !== "Resolved") return;

        currentRatingId = id;
        selectedRating = 0;
        paintStars(0);
        modal.rating.show();
    };

    const paintStars = (count) => {
        el.starsWrap.querySelectorAll(".star-btn").forEach((star, index) => {
            const active = index < count;
            star.classList.toggle("fas", active);
            star.classList.toggle("far", !active);
            star.classList.toggle("active", active);
        });
    };

    const bindEvents = () => {
        el.navLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                navigate(link.dataset.section);
            });
        });

        document.querySelectorAll(".navigate-btn").forEach((btn) => {
            btn.addEventListener("click", () => navigate(btn.dataset.section));
        });

        window.addEventListener("hashchange", () => {
            const section = window.location.hash.replace("#", "") || "landing-section";
            if (document.getElementById(section)) navigate(section, false);
        });

        el.menuToggle.addEventListener("click", () => {
            el.wrapper.classList.toggle("toggled");
        });

        el.complaintForm.addEventListener("click", (event) => {
            const button = event.target.closest(".ab-btn");
            if (!button) return;
            const version = button.dataset.version;
            if (version === "a" || version === "b") {
                abStats[version] += 1;
                saveAll();
            }
        });

        el.complaintForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!el.complaintForm.checkValidity()) {
                el.complaintForm.classList.add("was-validated");
                return;
            }

            const complaint = {
                id: el.compId.value,
                name: el.compName.value.trim(),
                email: el.compEmail.value.trim(),
                category: el.compCategory.value,
                description: el.compDescription.value.trim(),
                status: "Submitted",
                rating: null,
                createdAt: el.compDate.value
            };

            complaints.push(complaint);
            saveAll();

            el.complaintForm.reset();
            el.complaintForm.classList.remove("was-validated");
            updateDateFields();
            renderSubmitButtonVariant();
            renderDashboard();
            renderTracking();
            navigate("tracking-section");
            showToast(`Complaint ${complaint.id} submitted.`);
        });

        el.refreshComplaintsBtn.addEventListener("click", () => {
            renderTracking();
            showToast("Tracking list refreshed.");
        });

        el.complaintsList.addEventListener("click", (event) => {
            const viewBtn = event.target.closest(".action-view");
            if (viewBtn) {
                showDetails(viewBtn.dataset.id);
                return;
            }

            const rateBtn = event.target.closest(".action-rate");
            if (rateBtn) openRatingModal(rateBtn.dataset.id);
        });

        el.adminComplaintsList.addEventListener("click", (event) => {
            const viewBtn = event.target.closest(".action-view");
            if (viewBtn) {
                showDetails(viewBtn.dataset.id);
                return;
            }

            const deleteBtn = event.target.closest(".action-delete");
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                if (confirm(`Delete complaint ${id}?`)) {
                    complaints = complaints.filter((c) => c.id !== id);
                    saveAll();
                    renderDashboard();
                    renderTracking();
                    showToast(`Complaint ${id} deleted.`);
                }
            }
        });

        el.adminComplaintsList.addEventListener("change", (event) => {
            const select = event.target.closest(".status-changer");
            if (!select) return;

            const complaint = complaints.find((c) => c.id === select.dataset.id);
            if (!complaint) return;
            complaint.status = select.value;
            saveAll();
            renderDashboard();
            renderTracking();
            showToast(`Status updated to ${select.value}.`);

            if (select.value === "Resolved" && !complaint.rating) {
                openRatingModal(complaint.id);
            }
        });

        [el.filterStatus, el.filterCategory, el.sortDate].forEach((control) => {
            control.addEventListener("change", renderDashboard);
        });
        el.searchText.addEventListener("input", renderDashboard);

        el.exportCsvBtn.addEventListener("click", exportCsv);

        el.starsWrap.addEventListener("click", (event) => {
            const star = event.target.closest(".star-btn");
            if (!star) return;
            selectedRating = Number(star.dataset.rating);
            paintStars(selectedRating);
        });

        el.submitRatingBtn.addEventListener("click", () => {
            if (!selectedRating || !currentRatingId) {
                showToast("Select a rating first.");
                return;
            }

            const complaint = complaints.find((c) => c.id === currentRatingId);
            if (!complaint) return;
            complaint.rating = selectedRating;
            saveAll();
            modal.rating.hide();
            currentRatingId = null;
            selectedRating = 0;
            renderDashboard();
            renderTracking();
            showToast("Feedback saved. Thank you.");
        });

        el.profileLink.addEventListener("click", (event) => {
            event.preventDefault();
            modal.profile.show();
        });

        el.settingsLink.addEventListener("click", (event) => {
            event.preventDefault();
            modal.settings.show();
        });

        el.logoutLink.addEventListener("click", (event) => {
            event.preventDefault();
            if (confirm("Logout now?")) {
                window.RXAuth.clearAuth();
                window.location.href = "login.html";
            }
        });

        el.clearDataBtn.addEventListener("click", () => {
            if (!confirm("This will clear all stored complaints and A/B stats. Continue?")) return;
            localStorage.removeItem(STORAGE_KEYS.complaints);
            localStorage.removeItem(STORAGE_KEYS.abStats);
            complaints = [];
            abStats = { a: 0, b: 0 };
            saveAll();
            updateDateFields();
            renderSubmitButtonVariant();
            renderDashboard();
            renderTracking();
            showToast("All complaint data cleared.");
        });
    };

    const renderUserProfile = () => {
        const safeName = user?.name || "Admin User";
        const safeEmail = user?.email || "admin@resolvex.com";
        el.navUserName.textContent = safeName;
        el.profileBody.innerHTML = `
            <p class="mb-1"><strong>Name:</strong> ${safeName}</p>
            <p class="mb-1"><strong>Email:</strong> ${safeEmail}</p>
            <p class="mb-1"><strong>Role:</strong> System Administrator</p>
            <p class="mb-0"><strong>Last Login:</strong> ${new Date(user.loginAt || Date.now()).toLocaleString()}</p>
        `;
    };

    const init = () => {
        loadData();
        updateDateFields();
        renderSubmitButtonVariant();
        renderUserProfile();
        bindEvents();
        renderDashboard();
        renderTracking();

        const start = window.location.hash.replace("#", "") || "landing-section";
        navigate(document.getElementById(start) ? start : "landing-section", false);
    };

    return { init };
})();

document.addEventListener("DOMContentLoaded", ResolveX.init);