"use strict";

document.addEventListener("DOMContentLoaded", () => {
    ResolveXCore.setupShell("analytics");

    const complaints = ResolveXCore.getComplaints();
    const ab = ResolveXCore.getAbStats();

    const statusCounts = ResolveXCore.STATUS.map((s) => complaints.filter((c) => c.status === s).length);
    const categories = Array.from(new Set(complaints.map((c) => c.category)));
    const categoryCounts = categories.map((x) => complaints.filter((c) => c.category === x).length);

    document.getElementById("kpi-total").textContent = String(complaints.length);
    document.getElementById("kpi-avg").textContent = ResolveXCore.avgRating(complaints).toFixed(1);
    document.getElementById("kpi-pending").textContent = String(complaints.filter((c) => ResolveXCore.ACTIVE_STATUS.includes(c.status)).length);
    ResolveXCore.animateCounters();

    const ctx1 = document.getElementById("statusChart").getContext("2d");
    new Chart(ctx1, {
        type: "pie",
        data: {
            labels: ResolveXCore.STATUS,
            datasets: [{
                data: statusCounts,
                backgroundColor: ["#5b8def", "#f0ad4e", "#2f855a", "#20a779", "#d9534f"]
            }]
        },
        options: { plugins: { legend: { position: "bottom" } } }
    });

    const ctx2 = document.getElementById("categoryChart").getContext("2d");
    new Chart(ctx2, {
        type: "bar",
        data: {
            labels: categories,
            datasets: [{ label: "Complaints", data: categoryCounts, backgroundColor: "rgba(45, 86, 216, 0.85)", borderRadius: 8 }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

    document.getElementById("ab-a").textContent = String(ab.a);
    document.getElementById("ab-b").textContent = String(ab.b);
    const total = ab.a + ab.b;
    const winnerEl = document.getElementById("ab-winner");
    if (!total) {
        winnerEl.textContent = "No A/B interactions yet.";
    } else if (ab.a === ab.b) {
        winnerEl.textContent = `Tie with ${total} total interactions.`;
    } else {
        winnerEl.textContent = `${ab.a > ab.b ? "Version A" : "Version B"} leads with ${total} total interactions.`;
    }
});
