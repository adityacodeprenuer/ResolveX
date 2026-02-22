"use strict";

(() => {
    const AUTH_KEY = "rx_auth_user";

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
    };

    const requireAuth = () => {
        const user = getAuthUser();
        if (!user) window.location.href = "login.html";
        return user;
    };

    const redirectIfAuthenticated = () => {
        if (getAuthUser()) window.location.href = "index.html";
    };

    window.RXAuth = {
        AUTH_KEY,
        getAuthUser,
        setAuthUser,
        clearAuth,
        requireAuth,
        redirectIfAuthenticated
    };
})();