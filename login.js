"use strict";

document.addEventListener("DOMContentLoaded", () => {
    window.RXAuth.redirectIfAuthenticated();

    const form = document.getElementById("login-form");
    const nameEl = document.getElementById("login-name");
    const emailEl = document.getElementById("login-email");
    const passwordEl = document.getElementById("login-password");

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        if (passwordEl.value.trim() !== "admin123") {
            document.getElementById("login-error").textContent = "Invalid password. Demo password is admin123.";
            return;
        }

        window.RXAuth.setAuthUser({
            name: nameEl.value.trim(),
            email: emailEl.value.trim(),
            loginAt: new Date().toISOString()
        });

        window.location.href = "index.html";
    });
});