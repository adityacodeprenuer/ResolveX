"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    await ResolveXCore.setupShell("home");

    const complaints = await ResolveXCore.getComplaints();
    const resolved = complaints.filter((c) => c.status === "Resolved").length;
    const pending = complaints.filter((c) => ResolveXCore.ACTIVE_STATUS.includes(c.status)).length;
    const rejected = complaints.filter((c) => c.status === "Rejected").length;
    const avg = ResolveXCore.avgRating(complaints).toFixed(1);

    document.getElementById("kpi-total").textContent = String(complaints.length);
    document.getElementById("kpi-pending").textContent = String(pending);
    document.getElementById("kpi-resolved").textContent = String(resolved);
    document.getElementById("kpi-rejected").textContent = String(rejected);
    document.getElementById("kpi-rating").textContent = `${avg} / 5`;
    ResolveXCore.animateCounters();

    const recent = complaints.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
    const recentWrap = document.getElementById("recent-list");

    if (!recent.length) {
        recentWrap.innerHTML = '<div class="text-muted">No complaints yet.</div>';
        return;
    }

    recentWrap.innerHTML = recent.map((c) => `
        <div class="d-flex justify-content-between align-items-center p-2 border rounded-3 mb-2 surface-muted">
            <div>
                <div class="fw-semibold">${ResolveXCore.esc(c.id)} - ${ResolveXCore.esc(c.category)}</div>
                <small class="text-muted">${ResolveXCore.esc(c.name)} | ${ResolveXCore.esc(c.createdAt)}</small>
            </div>
            <div>${ResolveXCore.getStatusBadge(c.status)}</div>
        </div>
    `).join("");
});
