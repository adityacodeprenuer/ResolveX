"use strict";

document.addEventListener("DOMContentLoaded", () => {
    ResolveXCore.setupShell("product");

    const complaints = ResolveXCore.getComplaints();
    const byCategory = ResolveXCore.CATEGORY.map((cat) => ({
        cat,
        count: complaints.filter((c) => c.category === cat).length
    }));

    const list = document.getElementById("product-cards");
    list.innerHTML = byCategory.map((x) => `
        <div class="col-md-6 col-xl-4">
            <div class="card p-3 h-100">
                <h6 class="mb-1">${ResolveXCore.esc(x.cat)} Module</h6>
                <p class="text-muted small mb-2">Complaints handled in this category.</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="soft-chip"><i class="fas fa-layer-group"></i> ${x.count} Tickets</span>
                    <a href="submit.html" class="btn btn-sm btn-outline-primary">Create</a>
                </div>
            </div>
        </div>
    `).join("");
});