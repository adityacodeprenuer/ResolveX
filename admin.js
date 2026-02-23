"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    await ResolveXCore.setupShell("admin");

    const statsEl = document.getElementById("stats-cards");
    const tableEl = document.getElementById("admin-list");

    const controls = {
        search: document.getElementById("search-text"),
        status: document.getElementById("filter-status"),
        category: document.getElementById("filter-category"),
        sort: document.getElementById("sort-date")
    };

    const applyFilters = (rows) => {
        const q = controls.search.value.trim().toLowerCase();
        const status = controls.status.value;
        const category = controls.category.value;
        const sort = controls.sort.value;

        const filtered = rows.filter((c) => {
            const statusMatch = status === "All" || c.status === status;
            const catMatch = category === "All" || c.category === category;
            const txt = `${c.id} ${c.name} ${c.email} ${c.description}`.toLowerCase();
            const textMatch = !q || txt.includes(q);
            return statusMatch && catMatch && textMatch;
        });

        filtered.sort((a, b) => {
            const da = new Date(a.createdAt).getTime();
            const db = new Date(b.createdAt).getTime();
            return sort === "newest" ? db - da : da - db;
        });

        return filtered;
    };

    const renderStats = (complaints) => {
        const total = complaints.length;
        const pending = complaints.filter((c) => ResolveXCore.ACTIVE_STATUS.includes(c.status)).length;
        const resolved = complaints.filter((c) => c.status === "Resolved").length;
        const rejected = complaints.filter((c) => c.status === "Rejected").length;
        const avg = ResolveXCore.avgRating(complaints).toFixed(1);

        statsEl.innerHTML = `
            <div class="col-md-3"><div class="stat-card"><div class="d-flex justify-content-between"><span>Total</span><span class="kpi-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-folder-open"></i></span></div><div class="stat-value mt-2">${total}</div></div></div>
            <div class="col-md-3"><div class="stat-card"><div class="d-flex justify-content-between"><span>Pending</span><span class="kpi-icon bg-warning bg-opacity-10 text-warning"><i class="fas fa-clock"></i></span></div><div class="stat-value mt-2">${pending}</div></div></div>
            <div class="col-md-2"><div class="stat-card"><div class="d-flex justify-content-between"><span>Resolved</span><span class="kpi-icon bg-success bg-opacity-10 text-success"><i class="fas fa-check"></i></span></div><div class="stat-value mt-2">${resolved}</div></div></div>
            <div class="col-md-2"><div class="stat-card"><div class="d-flex justify-content-between"><span>Rejected</span><span class="kpi-icon bg-danger bg-opacity-10 text-danger"><i class="fas fa-ban"></i></span></div><div class="stat-value mt-2">${rejected}</div></div></div>
            <div class="col-md-2"><div class="stat-card"><div class="d-flex justify-content-between"><span>Rating</span><span class="kpi-icon bg-info bg-opacity-10 text-info"><i class="fas fa-star"></i></span></div><div class="stat-value mt-2">${avg}</div></div></div>
        `;
        ResolveXCore.animateCounters(statsEl);
    };

    const renderTable = async () => {
        const complaints = await ResolveXCore.getComplaints();
        renderStats(complaints);
        const rows = applyFilters(complaints);

        if (!rows.length) {
            tableEl.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No matching complaints.</td></tr>';
            return;
        }

        tableEl.innerHTML = rows.map((c) => `
            <tr>
                <td class="fw-semibold text-primary">${ResolveXCore.esc(c.id)}</td>
                <td><div>${ResolveXCore.esc(c.name)}</div><small class="text-muted">${ResolveXCore.esc(c.email)}</small></td>
                <td>${ResolveXCore.esc(c.category)}</td>
                <td>${ResolveXCore.esc(c.createdAt)}</td>
                <td>
                    <select class="form-select form-select-sm status-changer" data-id="${ResolveXCore.esc(c.id)}">
                        ${ResolveXCore.STATUS.map((s) => `<option value="${s}" ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}
                    </select>
                </td>
                <td>${Number.isInteger(c.rating) ? `<span class="text-warning"><i class="fas fa-star"></i> ${c.rating}</span>` : '<span class="text-muted">-</span>'}</td>
                <td><button class="btn btn-sm btn-outline-danger delete-btn" data-id="${ResolveXCore.esc(c.id)}"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join("");
    };

    [controls.search, controls.status, controls.category, controls.sort].forEach((el) => {
        el.addEventListener("input", renderTable);
        el.addEventListener("change", renderTable);
    });

    document.getElementById("export-btn").addEventListener("click", async () => {
        const complaints = await ResolveXCore.getComplaints();
        ResolveXCore.downloadCsv(applyFilters(complaints), "admin_export");
        await ResolveXCore.showToast("CSV exported.");
    });

    tableEl.addEventListener("change", async (event) => {
        const select = event.target.closest(".status-changer");
        if (!select) return;
        const complaints = await ResolveXCore.getComplaints();
        const idx = complaints.findIndex((c) => c.id === select.dataset.id);
        if (idx < 0) return;
        complaints[idx].status = select.value;
        await ResolveXCore.saveComplaints(complaints);
        const settings = await ResolveXCore.getSettings();
        if (select.value === "Resolved" && settings.autoPromptFeedback) {
            await ResolveXCore.showToast("Marked resolved. Ask customer to submit a rating in Tracking.");
        } else {
            await ResolveXCore.showToast(`Status updated to ${select.value}`);
        }
        await renderTable();
    });

    tableEl.addEventListener("click", async (event) => {
        const del = event.target.closest(".delete-btn");
        if (!del) return;
        if (!confirm(`Delete complaint ${del.dataset.id}?`)) return;

        const rows = (await ResolveXCore.getComplaints()).filter((c) => c.id !== del.dataset.id);
        await ResolveXCore.saveComplaints(rows);
        await ResolveXCore.showToast("Complaint deleted.");
        await renderTable();
    });

    await renderTable();
});
