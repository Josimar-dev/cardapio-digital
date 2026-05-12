document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('registerNome').value.trim();
        const whatsapp = document.getElementById('registerWhatsapp').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPass').value;
        const confirmPass = document.getElementById('registerConfirmPass').value;
        const errorEl = document.getElementById('registerError');

        errorEl.textContent = '';
        errorEl.classList.remove('show');

        if (!nome) {
            errorEl.textContent = 'Digite seu nome completo.';
            errorEl.classList.add('show');
            return;
        }
        if (!whatsapp) {
            errorEl.textContent = 'Digite seu WhatsApp.';
            errorEl.classList.add('show');
            return;
        }
        if (!email) {
            errorEl.textContent = 'Digite seu e-mail.';
            errorEl.classList.add('show');
            return;
        }
        if (!password) {
            errorEl.textContent = 'Digite uma senha.';
            errorEl.classList.add('show');
            return;
        }
        if (password.length < 4) {
            errorEl.textContent = 'A senha deve ter no mínimo 4 caracteres.';
            errorEl.classList.add('show');
            return;
        }
        if (password !== confirmPass) {
            errorEl.textContent = 'As senhas não conferem.';
            errorEl.classList.add('show');
            return;
        }

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Cadastrando...';

            await Auth.register(nome, password, whatsapp, email);
            window.location.href = 'admin.html?registered=1';
        } catch (e) {
            errorEl.textContent = e.message;
            errorEl.classList.add('show');
        }
    });
});
