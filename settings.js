"use strict";

document.addEventListener("DOMContentLoaded", () => {
    ResolveXCore.setupShell("settings");

    const settings = ResolveXCore.getSettings();

    const theme = document.getElementById("setting-theme");
    const compact = document.getElementById("setting-compact");
    const toast = document.getElementById("setting-toast");
    const autoFeedback = document.getElementById("setting-autofeedback");

    const backendStatus = document.getElementById("backend-status");
    const pullBtn = document.getElementById("pull-backend");
    const pushBtn = document.getElementById("push-backend");

    const renderBackendStatus = async () => {
        if (!backendStatus) return;
        const online = await window.RXApi?.canReachBackend?.();
        backendStatus.textContent = online ? "Connected" : "Offline (local mode)";
        backendStatus.className = online ? "text-success fw-semibold" : "text-muted fw-semibold";
    };

    theme.value = settings.theme;
    compact.checked = Boolean(settings.compactMode);
    toast.checked = Boolean(settings.toastEnabled);
    autoFeedback.checked = Boolean(settings.autoPromptFeedback);

    const persist = () => {
        const next = {
            theme: theme.value,
            compactMode: compact.checked,
            toastEnabled: toast.checked,
            autoPromptFeedback: autoFeedback.checked
        };
        ResolveXCore.saveSettings(next);
        ResolveXCore.applySettings();
        ResolveXCore.showToast("Settings saved.");
    };

    [theme, compact, toast, autoFeedback].forEach((el) => {
        el.addEventListener("change", persist);
    });

    document.getElementById("reset-settings")?.addEventListener("click", () => {
        ResolveXCore.saveSettings({ theme: "light", compactMode: false, toastEnabled: true, autoPromptFeedback: true });
        window.location.reload();
    });

    document.getElementById("clear-all-data")?.addEventListener("click", () => {
        if (!confirm("This clears all complaints and A/B stats. Continue?")) return;
        ResolveXCore.saveComplaints([]);
        ResolveXCore.saveAbStats({ a: 0, b: 0 });
        ResolveXCore.showToast("All data cleared.");
    });

    pullBtn?.addEventListener("click", async () => {
        const ok = await ResolveXCore.pullFromBackend();
        ResolveXCore.showToast(ok ? "Pulled latest data from backend." : "Backend not available.");
        if (ok) setTimeout(() => window.location.reload(), 300);
        renderBackendStatus();
    });

    pushBtn?.addEventListener("click", async () => {
        const ok = await ResolveXCore.pushToBackend();
        ResolveXCore.showToast(ok ? "Pushed local data to backend." : "Backend not available.");
        renderBackendStatus();
    });

    document.getElementById("export-json")?.addEventListener("click", () => {
        const snapshot = {
            complaints: ResolveXCore.getComplaints(),
            ab: ResolveXCore.getAbStats(),
            settings: ResolveXCore.getSettings()
        };
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `resolvex_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        ResolveXCore.showToast("Backup exported.");
    });

    document.getElementById("import-json")?.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data.complaints)) throw new Error("Invalid complaints array");
            ResolveXCore.saveComplaints(data.complaints);
            ResolveXCore.saveAbStats(data.ab || { a: 0, b: 0 });
            ResolveXCore.saveSettings(data.settings || ResolveXCore.getSettings());
            ResolveXCore.showToast("Backup imported.");
            setTimeout(() => window.location.reload(), 250);
        } catch {
            ResolveXCore.showToast("Invalid JSON backup file.");
        }
    });

    renderBackendStatus();
});
