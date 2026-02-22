"use strict";

document.addEventListener("DOMContentLoaded", () => {
    ResolveXCore.setupShell("tracking");

    let currentRatingId = null;
    let selectedRating = 0;

    const listEl = document.getElementById("tracking-list");
    const detailsTitle = document.getElementById("detailsModalTitle");
    const detailsBody = document.getElementById("detailsModalBody");
    const ratingModal = new bootstrap.Modal(document.getElementById("ratingModal"));
    const detailsModal = new bootstrap.Modal(document.getElementById("detailsModal"));

    const render = () => {
        const complaints = ResolveXCore.getComplaints();

        if (!complaints.length) {
            listEl.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No complaints available.</td></tr>';
            return;
        }

        listEl.innerHTML = complaints.map((c) => `
            <tr>
                <td class="fw-semibold text-primary">${ResolveXCore.esc(c.id)}</td>
                <td>${ResolveXCore.esc(c.name)}</td>
                <td>${ResolveXCore.esc(c.category)}</td>
                <td><span class="eta-pill">${ResolveXCore.etaLabel(c)}</span></td>
                <td>${ResolveXCore.getStatusBadge(c.status)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary action-view" data-id="${ResolveXCore.esc(c.id)}">View</button>
                    ${c.status === "Resolved" && !c.rating ? `<button class="btn btn-sm btn-primary action-rate" data-id="${ResolveXCore.esc(c.id)}">Rate</button>` : ""}
                </td>
            </tr>
        `).join("");
    };

    const paintStars = (count) => {
        document.querySelectorAll(".star-btn").forEach((star, idx) => {
            const active = idx < count;
            star.classList.toggle("fas", active);
            star.classList.toggle("far", !active);
            star.classList.toggle("active", active);
        });
    };

    listEl.addEventListener("click", (event) => {
        const complaints = ResolveXCore.getComplaints();

        const viewBtn = event.target.closest(".action-view");
        if (viewBtn) {
            const c = complaints.find((x) => x.id === viewBtn.dataset.id);
            if (!c) return;
            detailsTitle.textContent = `Complaint ${c.id}`;
            detailsBody.innerHTML = `
                <div class="mb-2">${ResolveXCore.getStatusBadge(c.status)}</div>
                <p class="mb-1"><strong>Name:</strong> ${ResolveXCore.esc(c.name)}</p>
                <p class="mb-1"><strong>Email:</strong> ${ResolveXCore.esc(c.email)}</p>
                <p class="mb-1"><strong>Category:</strong> ${ResolveXCore.esc(c.category)}</p>
                <p class="mb-1"><strong>Date:</strong> ${ResolveXCore.esc(c.createdAt)}</p>
                <p class="mb-1"><strong>ETA:</strong> ${ResolveXCore.etaLabel(c)}</p>
                <p class="mb-0"><strong>Description:</strong><br>${ResolveXCore.esc(c.description)}</p>
            `;
            detailsModal.show();
            return;
        }

        const rateBtn = event.target.closest(".action-rate");
        if (rateBtn) {
            currentRatingId = rateBtn.dataset.id;
            selectedRating = 0;
            paintStars(0);
            ratingModal.show();
        }
    });

    document.getElementById("rating-stars").addEventListener("click", (event) => {
        const star = event.target.closest(".star-btn");
        if (!star) return;
        selectedRating = Number(star.dataset.rating);
        paintStars(selectedRating);
    });

    document.getElementById("submit-rating").addEventListener("click", () => {
        if (!currentRatingId || !selectedRating) {
            ResolveXCore.showToast("Select a rating first.");
            return;
        }

        const complaints = ResolveXCore.getComplaints();
        const idx = complaints.findIndex((c) => c.id === currentRatingId);
        if (idx < 0) return;

        complaints[idx].rating = selectedRating;
        ResolveXCore.saveComplaints(complaints);
        ratingModal.hide();
        currentRatingId = null;
        selectedRating = 0;
        ResolveXCore.showToast("Feedback submitted.");
        render();
    });

    document.getElementById("refresh-btn").addEventListener("click", () => {
        render();
        ResolveXCore.showToast("Tracking refreshed.");
    });

    render();
});