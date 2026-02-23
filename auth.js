"use strict";

(() => {
    const AUTH_KEY = "rx_auth_user";
    const LANDING_KEY = "rx_landing_seen";

    const getAuthUser = () => {
        try {
            return JSON.parse(sessionStorage.getItem(AUTH_KEY) || "null");
        } catch {
            return null;
        }
    };

    const setAuthUser = (user) => {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
    };

    const clearAuth = () => {
        sessionStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(LANDING_KEY);
    };

    const hasSeenLanding = () => sessionStorage.getItem(LANDING_KEY) === "1";

    const requireAuth = () => {
        if (!hasSeenLanding()) {
            window.location.href = "landing.html";
            return null;
        }

        const user = getAuthUser();
        if (!user) {
            window.location.href = "login.html";
            return null;
        }

        return user;
    };

    const redirectIfAuthenticated = () => {
        if (!hasSeenLanding()) {
            window.location.href = "landing.html";
            return;
        }

        if (getAuthUser()) window.location.href = "index.html";
    };

    window.RXAuth = {
        AUTH_KEY,
        LANDING_KEY,
        getAuthUser,
        setAuthUser,
        clearAuth,
        requireAuth,
        redirectIfAuthenticated
    };
})();
