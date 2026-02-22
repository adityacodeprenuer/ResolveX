"use strict";

document.addEventListener("DOMContentLoaded", () => {
    ResolveXCore.setupShell("submit");

    const form = document.getElementById("complaint-form");
    const idEl = document.getElementById("comp-id");
    const dateEl = document.getElementById("comp-date");
    const abWrap = document.getElementById("ab-test-container");

    const fillMeta = () => {
        const complaints = ResolveXCore.getComplaints();
        idEl.value = ResolveXCore.getNextId(complaints);
        dateEl.value = new Date().toISOString().slice(0, 10);
    };

    const renderAbButton = () => {
        const variant = Math.random() < 0.5 ? "a" : "b";
        abWrap.innerHTML = variant === "a"
            ? '<button type="submit" class="btn btn-primary w-100 ab-btn" data-version="a">Submit Complaint</button>'
            : '<button type="submit" class="btn btn-success w-100 rounded-pill ab-btn" data-version="b">Create Ticket <i class="fas fa-arrow-right ms-1"></i></button>';
    };

    fillMeta();
    renderAbButton();

    form.addEventListener("click", (event) => {
        const btn = event.target.closest(".ab-btn");
        if (!btn) return;

        const ab = ResolveXCore.getAbStats();
        const version = btn.dataset.version;
        if (version === "a" || version === "b") {
            ab[version] += 1;
            ResolveXCore.saveAbStats(ab);
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const complaints = ResolveXCore.getComplaints();
        complaints.push({
            id: idEl.value,
            name: document.getElementById("comp-name").value.trim(),
            email: document.getElementById("comp-email").value.trim(),
            category: document.getElementById("comp-category").value,
            description: document.getElementById("comp-description").value.trim(),
            status: "Submitted",
            rating: null,
            createdAt: dateEl.value
        });

        ResolveXCore.saveComplaints(complaints);
        ResolveXCore.showToast(`Complaint ${idEl.value} submitted.`);

        form.reset();
        form.classList.remove("was-validated");
        fillMeta();
        renderAbButton();

        setTimeout(() => {
            window.location.href = "tracking.html";
        }, 500);
    });
});