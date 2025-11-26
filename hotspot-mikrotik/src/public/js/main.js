class HotspotApp {
    constructor() {
        this.token = localStorage.getItem('hotspot_token');
        this.user = null;
        this.init();
    }

    async init() {
        if (this.token) {
            await this.loadUserProfile();
        } else {
            this.showAuthSection();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botones de autenticación
        document.getElementById('google-auth').addEventListener('click', () => {
            this.openAuthWindow('/auth/google');
        });

        document.getElementById('apple-auth').addEventListener('click', () => {
            this.openAuthWindow('/auth/apple');
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Escuchar mensajes de autenticación
        window.addEventListener('message', (event) => {
            if (event.data.token) {
                this.handleAuthSuccess(event.data.token);
            }
        });
    }

    openAuthWindow(url) {
        const width = 500;
        const height = 600;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        window.open(
            url,
            'authWindow',
            `width=${width},height=${height},left=${left},top=${top}`
        );
    }

    async handleAuthSuccess(token) {
        this.token = token;
        localStorage.setItem('hotspot_token', token);
        await this.loadUserProfile();
    }

    async loadUserProfile() {
        try {
            // En una implementación real, harías una llamada API para obtener el perfil
            this.user = { name: 'Usuario', credits: 0 }; // Placeholder
            this.showUserInfo();
            await this.loadHotspots();
            await this.loadPlans();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Error al cargar el perfil');
        }
    }

    async loadHotspots() {
        try {
            const response = await fetch('/api/mikrotik/hotspots', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displayHotspots(data.hotspots);
            }
        } catch (error) {
            console.error('Error loading hotspots:', error);
        }
    }

    async loadPlans() {
        try {
            // En una implementación real, obtendrías los planes de la API
            const plans = [
                { _id: '1', name: '1 Día', price: 100, days: 1, description: 'Acceso por 24 horas' },
                { _id: '2', name: '7 Días', price: 500, days: 7, description: 'Acceso por 1 semana' },
                { _id: '3', name: '30 Días', price: 1500, days: 30, description: 'Acceso por 1 mes' }
            ];
            this.displayPlans(plans);
        } catch (error) {
            console.error('Error loading plans:', error);
        }
    }

    displayHotspots(hotspots) {
        const container = document.getElementById('hotspots-list');
        container.innerHTML = hotspots.map(hotspot => `
            <div class="hotspot-card">
                <h3>${hotspot.name}</h3>
                <p>📍 ${hotspot.location}</p>
                <p>👥 ${hotspot.currentUsers}/${hotspot.maxUsers} usuarios</p>
            </div>
        `).join('');
        
        document.getElementById('hotspots-section').classList.remove('hidden');
    }

    displayPlans(plans) {
        const container = document.getElementById('plans-list');
        container.innerHTML = plans.map(plan => `
            <div class="plan-card">
                <h3>${plan.name}</h3>
                <p>${plan.description}</p>
                <div class="plan-price">$${plan.price}</div>
                <button class="btn btn-success" onclick="app.purchasePlan('${plan._id}')">
                    Comprar Plan
                </button>
            </div>
        `).join('');
        
        document.getElementById('plans-section').classList.remove('hidden');
    }

    async purchasePlan(planId) {
        try {
            const response = await fetch('/api/payments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ planId })
            });

            const data = await response.json();
            
            if (data.success) {
                // Redirigir a MercadoPago
                window.location.href = data.initPoint;
            } else {
                this.showError('Error al crear el pago');
            }
        } catch (error) {
            console.error('Error purchasing plan:', error);
            this.showError('Error al procesar la compra');
        }
    }

    showUserInfo() {
        document.getElementById('user-name').textContent = this.user.name;
        document.getElementById('user-credits').textContent = this.user.credits;
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('auth-section').classList.add('hidden');
    }

    showAuthSection() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('hotspots-section').classList.add('hidden');
        document.getElementById('plans-section').classList.add('hidden');
    }

    logout() {
        localStorage.removeItem('hotspot_token');
        this.token = null;
        this.user = null;
        this.showAuthSection();
        
        // Hacer logout en el servidor
        fetch('/auth/logout', { method: 'GET' });
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        
        document.querySelector('main').prepend(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Inicializar la aplicación
const app = new HotspotApp();