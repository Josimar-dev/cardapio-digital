const Auth = {
    SESSION_KEY: 'cardapio_admin_session',
    TOKEN_KEY: 'cardapio_admin_token',

    async login(username, password) {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                sessionStorage.setItem(this.SESSION_KEY, 'true');
                sessionStorage.setItem(this.TOKEN_KEY, data.token);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.TOKEN_KEY);
        window.location.href = 'admin.html';
    },

    isAuthenticated() {
        return sessionStorage.getItem(this.SESSION_KEY) === 'true';
    },

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'admin.html';
        }
    },

    redirectIfAuth() {
        if (this.isAuthenticated()) {
            window.location.href = 'admin.html?panel=dashboard';
        }
    },

    async forgotPassword(username) {
        const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    async register(nomeCompleto, password, whatsapp, email) {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: nomeCompleto, password, nomeCompleto, whatsapp, email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    async resetPassword(username, token, newPassword) {
        const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, token, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }
};
