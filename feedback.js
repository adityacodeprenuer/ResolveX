"use strict";

document.addEventListener("DOMContentLoaded", () => {
    ResolveXCore.setupShell("feedback");

    const complaints = ResolveXCore.getComplaints();
    const resolved = complaints.filter((c) => c.status === "Resolved");
    const rated = resolved.filter((c) => Number.isInteger(c.rating));
    const avg = rated.length ? rated.reduce((a, c) => a + c.rating, 0) / rated.length : 0;

    document.getElementById("sum-resolved").textContent = String(resolved.length);
    document.getElementById("sum-rated").textContent = String(rated.length);
    document.getElementById("sum-avg").textContent = `${avg.toFixed(1)} / 5`;
    ResolveXCore.animateCounters();

    const dist = [1, 2, 3, 4, 5].map((n) => rated.filter((c) => c.rating === n).length);
    const distWrap = document.getElementById("rating-distribution");
    const max = Math.max(1, ...dist);

    distWrap.innerHTML = [1, 2, 3, 4, 5].map((n, i) => `
        <div class="d-flex align-items-center gap-2 mb-2">
            <div style="width:38px;" class="small">${n} <i class="fas fa-star text-warning"></i></div>
            <div class="flex-grow-1" style="height:10px; background:#e9efff; border-radius:8px; overflow:hidden;">
                <div style="height:100%; width:${(dist[i] / max) * 100}%; background:#2d56d8;"></div>
            </div>
            <div style="width:22px;" class="small text-muted">${dist[i]}</div>
        </div>
    `).join("");

    const listEl = document.getElementById("feedback-list");
    if (!resolved.length) {
        listEl.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No resolved complaints yet.</td></tr>';
        return;
    }

    listEl.innerHTML = resolved.map((c) => `
        <tr>
            <td class="fw-semibold text-primary">${ResolveXCore.esc(c.id)}</td>
            <td>${ResolveXCore.esc(c.name)}</td>
            <td>${ResolveXCore.esc(c.category)}</td>
            <td>${ResolveXCore.getStatusBadge(c.status)}</td>
            <td>${Number.isInteger(c.rating) ? `<span class="text-warning">${"<i class='fas fa-star'></i> ".repeat(c.rating)}</span>` : '<span class="text-muted">Awaiting rating</span>'}</td>
        </tr>
    `).join("");
});
