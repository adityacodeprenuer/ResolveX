"use strict";

document.addEventListener("DOMContentLoaded", () => {
    ResolveXCore.setupShell("settings");

    const settings = ResolveXCore.getSettings();

    const theme = document.getElementById("setting-theme");
    const compact = document.getElementById("setting-compact");
    const toast = document.getElementById("setting-toast");
    const autoFeedback = document.getElementById("setting-autofeedback");

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

    document.getElementById("reset-settings").addEventListener("click", () => {
        ResolveXCore.saveSettings({ theme: "light", compactMode: false, toastEnabled: true, autoPromptFeedback: true });
        window.location.reload();
    });

    document.getElementById("clear-all-data").addEventListener("click", () => {
        if (!confirm("This clears all complaints and A/B stats. Continue?")) return;
        ResolveXCore.saveComplaints([]);
        ResolveXCore.saveAbStats({ a: 0, b: 0 });
        ResolveXCore.showToast("All data cleared.");
    });
});