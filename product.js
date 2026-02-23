"use strict";

document.addEventListener("DOMContentLoaded", () => {
    ResolveXCore.setupShell("product");

    const complaints = ResolveXCore.getComplaints();
    const categoryCount = ResolveXCore.CATEGORY.reduce((acc, cat) => {
        acc[cat] = complaints.filter((c) => c.category === cat).length;
        return acc;
    }, {});

    const products = [
        {
            id: "PD001",
            name: "Wireless Earbuds Pro",
            category: "Product",
            serviceRating: 4.6,
            slaDays: 2,
            stock: "In Stock",
            priceRange: "$59-$89",
            image: "https://images.unsplash.com/photo-1606220838315-056192d5e927?auto=format&fit=crop&w=900&q=80",
            description: "High-fidelity earbuds with active noise cancellation and app controls.",
            highlights: ["Bluetooth 5.3", "30-hour battery", "Fast charging"],
            issues: ["Connectivity drop", "Charging case issue", "Left bud no sound"]
        },
        {
            id: "PD002",
            name: "MagSafe Power Bank",
            category: "Delivery",
            serviceRating: 4.3,
            slaDays: 4,
            stock: "Low Stock",
            priceRange: "$39-$49",
            image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80",
            description: "Compact wireless power bank with magnetic alignment for fast charging.",
            highlights: ["5000mAh", "USB-C PD", "Pocket-size"],
            issues: ["Late shipment", "Damaged box", "Missing cable"]
        },
        {
            id: "PD003",
            name: "Mechanical Keyboard K87",
            category: "Technical",
            serviceRating: 4.5,
            slaDays: 3,
            stock: "In Stock",
            priceRange: "$79-$129",
            image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80",
            description: "Hot-swappable mechanical keyboard with per-key RGB profiles.",
            highlights: ["Hot-swappable switches", "RGB backlight", "USB-C detachable cable"],
            issues: ["Firmware update failed", "LED color mismatch", "Double key press"]
        },
        {
            id: "PD004",
            name: "4K USB-C Hub",
            category: "Service",
            serviceRating: 4.2,
            slaDays: 5,
            stock: "In Stock",
            priceRange: "$45-$69",
            image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80",
            description: "Multi-port dock with HDMI, SD reader, Ethernet, and power passthrough.",
            highlights: ["4K HDMI", "Gigabit Ethernet", "100W pass-through"],
            issues: ["Port not detecting", "Overheating", "Adapter replacement"]
        },
        {
            id: "PD005",
            name: "Screen Protector Pack",
            category: "Billing",
            serviceRating: 4.1,
            slaDays: 4,
            stock: "In Stock",
            priceRange: "$12-$19",
            image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80",
            description: "Tempered glass protection with installation frame and cleaning kit.",
            highlights: ["9H hardness", "Bubble-free fit", "2-pack included"],
            issues: ["Wrong item billed", "Refund delay", "Invoice mismatch"]
        },
        {
            id: "PD006",
            name: "Smart Tracker Tag",
            category: "Other",
            serviceRating: 4.0,
            slaDays: 5,
            stock: "Pre-order",
            priceRange: "$24-$34",
            image: "https://images.unsplash.com/photo-1468495244123-6c6f8f95c0f4?auto=format&fit=crop&w=900&q=80",
            description: "Bluetooth tracker tag for keys, bags, and wallets with crowd-find support.",
            highlights: ["120m range", "Replaceable battery", "Ring alert"],
            issues: ["App pairing", "Battery alert bug", "General inquiry"]
        }
    ];

    const kpisEl = document.getElementById("product-kpis");
    const cardsEl = document.getElementById("product-cards");
    const featuredEl = document.getElementById("featured-products");
    const searchEl = document.getElementById("product-search");
    const sortEl = document.getElementById("product-sort");
    const modalBody = document.getElementById("product-modal-body");
    const modalTitle = document.getElementById("productModalTitle");
    const productModal = new bootstrap.Modal(document.getElementById("productModal"));

    const renderKpis = () => {
        const avgRating = products.reduce((sum, p) => sum + p.serviceRating, 0) / products.length;
        const fastestSla = products.reduce((min, p) => Math.min(min, p.slaDays), 99);
        const totalTickets = Object.values(categoryCount).reduce((a, b) => a + b, 0);

        kpisEl.innerHTML = `
            <div class="col-sm-6 col-xl-3"><div class="stat-card card h-100"><div class="small text-muted">Supported Products</div><div class="stat-value">${products.length}</div></div></div>
            <div class="col-sm-6 col-xl-3"><div class="stat-card card h-100"><div class="small text-muted">Complaint Tickets Mapped</div><div class="stat-value">${totalTickets}</div></div></div>
            <div class="col-sm-6 col-xl-3"><div class="stat-card card h-100"><div class="small text-muted">Avg Service Rating</div><div class="stat-value">${avgRating.toFixed(1)}</div></div></div>
            <div class="col-sm-6 col-xl-3"><div class="stat-card card h-100"><div class="small text-muted">Fastest SLA</div><div class="stat-value">${fastestSla} days</div></div></div>
        `;
        ResolveXCore.animateCounters(kpisEl);
    };

    const renderFeatured = () => {
        const featured = [...products].sort((a, b) => b.serviceRating - a.serviceRating).slice(0, 3);
        featuredEl.innerHTML = featured.map((item) => `
            <div class="col-md-4">
                <div class="card p-2 h-100">
                    <img src="${ResolveXCore.esc(item.image)}" alt="${ResolveXCore.esc(item.name)}" class="section-image mb-2">
                    <div class="px-1 pb-1">
                        <h6 class="mb-1">${ResolveXCore.esc(item.name)}</h6>
                        <p class="small text-muted mb-2">${ResolveXCore.esc(item.description)}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="soft-chip"><i class="fas fa-star"></i> ${item.serviceRating.toFixed(1)}</span>
                            <button class="btn btn-sm btn-outline-primary" data-view-id="${item.id}">Details</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join("");
    };

    const getFilteredProducts = () => {
        const q = searchEl.value.trim().toLowerCase();
        const sortBy = sortEl.value;

        const filtered = products.filter((p) => {
            const target = `${p.name} ${p.category} ${p.description} ${p.highlights.join(" ")} ${p.issues.join(" ")}`.toLowerCase();
            return target.includes(q);
        });

        const sorted = [...filtered].sort((a, b) => {
            if (sortBy === "tickets") return (categoryCount[b.category] || 0) - (categoryCount[a.category] || 0);
            if (sortBy === "rating") return b.serviceRating - a.serviceRating;
            if (sortBy === "sla") return a.slaDays - b.slaDays;
            return a.name.localeCompare(b.name);
        });

        return sorted;
    };

    const renderProducts = () => {
        const items = getFilteredProducts();

        if (!items.length) {
            cardsEl.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info mb-0"><i class="fas fa-info-circle me-2"></i>No product matched your search. Try another keyword.</div>
                </div>
            `;
            return;
        }

        cardsEl.innerHTML = items.map((item) => {
            const ticketCount = categoryCount[item.category] || 0;
            return `
                <div class="col-md-6 col-xl-4">
                    <div class="card p-3 h-100">
                        <img src="${ResolveXCore.esc(item.image)}" alt="${ResolveXCore.esc(item.name)}" class="section-image mb-3">
                        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <h6 class="mb-0">${ResolveXCore.esc(item.name)}</h6>
                            <span class="soft-chip"><i class="fas fa-tags"></i> ${ResolveXCore.esc(item.priceRange)}</span>
                        </div>
                        <p class="small text-muted mb-2">${ResolveXCore.esc(item.description)}</p>
                        <div class="d-flex flex-wrap gap-2 small mb-2">
                            <span class="soft-chip"><i class="fas fa-folder-open"></i> ${ResolveXCore.esc(item.category)}</span>
                            <span class="soft-chip"><i class="fas fa-clipboard-list"></i> ${ticketCount} Tickets</span>
                            <span class="soft-chip"><i class="fas fa-clock"></i> ${item.slaDays}d SLA</span>
                            <span class="soft-chip"><i class="fas fa-warehouse"></i> ${ResolveXCore.esc(item.stock)}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-auto pt-2">
                            <span class="small"><i class="fas fa-star text-warning me-1"></i>${item.serviceRating.toFixed(1)} Service</span>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary" data-view-id="${item.id}">View</button>
                                <button class="btn btn-sm btn-primary" data-complaint-id="${item.id}">Raise</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    };

    const openProductModal = (id) => {
        const item = products.find((p) => p.id === id);
        if (!item) return;

        modalTitle.textContent = item.name;
        modalBody.innerHTML = `
            <div class="row g-3">
                <div class="col-md-5">
                    <img src="${ResolveXCore.esc(item.image)}" alt="${ResolveXCore.esc(item.name)}" class="hero-image">
                </div>
                <div class="col-md-7">
                    <p class="text-muted mb-2">${ResolveXCore.esc(item.description)}</p>
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <span class="soft-chip"><i class="fas fa-folder-open"></i> ${ResolveXCore.esc(item.category)}</span>
                        <span class="soft-chip"><i class="fas fa-tags"></i> ${ResolveXCore.esc(item.priceRange)}</span>
                        <span class="soft-chip"><i class="fas fa-star"></i> ${item.serviceRating.toFixed(1)}</span>
                        <span class="soft-chip"><i class="fas fa-clock"></i> ${item.slaDays} days SLA</span>
                    </div>
                    <h6 class="mb-2">Top Highlights</h6>
                    <ul class="small text-muted mb-3">${item.highlights.map((h) => `<li>${ResolveXCore.esc(h)}</li>`).join("")}</ul>
                    <h6 class="mb-2">Common Support Topics</h6>
                    <ul class="small text-muted mb-0">${item.issues.map((i) => `<li>${ResolveXCore.esc(i)}</li>`).join("")}</ul>
                </div>
            </div>
        `;
        productModal.show();
    };

    document.getElementById("go-submit")?.addEventListener("click", () => {
        window.location.href = "submit.html";
    });

    cardsEl.addEventListener("click", (event) => {
        const viewBtn = event.target.closest("[data-view-id]");
        if (viewBtn) {
            openProductModal(viewBtn.dataset.viewId);
            return;
        }

        const raiseBtn = event.target.closest("[data-complaint-id]");
        if (raiseBtn) {
            const id = raiseBtn.dataset.complaintId;
            const item = products.find((p) => p.id === id);
            if (item) sessionStorage.setItem("rx_prefill_category", item.category);
            ResolveXCore.showToast("Product mapped. Opening complaint form.");
            setTimeout(() => { window.location.href = "submit.html"; }, 350);
        }
    });

    featuredEl.addEventListener("click", (event) => {
        const viewBtn = event.target.closest("[data-view-id]");
        if (!viewBtn) return;
        openProductModal(viewBtn.dataset.viewId);
    });

    searchEl.addEventListener("input", renderProducts);
    sortEl.addEventListener("change", renderProducts);

    renderKpis();
    renderFeatured();
    renderProducts();
});
