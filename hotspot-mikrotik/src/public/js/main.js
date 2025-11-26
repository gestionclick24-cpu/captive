class HotspotApp {
    constructor() {
        this.token = localStorage.getItem('hotspot_token');
        this.user = null;
        this.appleAvailable = false;
        this.init();
    }

    async init() {
        await this.checkAppleAvailability();
        this.setupEventListeners();
        
        if (this.token) {
            await this.verifyToken();
        } else {
            this.showAuthSection();
        }
    }

    async checkAppleAvailability() {
        try {
            const response = await fetch('/auth/health');
            const data = await response.json();
            this.appleAvailable = data.apple;
            
            if (this.appleAvailable) {
                document.getElementById('apple-auth').classList.remove('hidden');
            }
        } catch (error) {
            console.log('Apple auth no disponible');
            document.getElementById('apple-auth').classList.add('hidden');
        }
    }

    setupEventListeners() {
        // Botón de Google Auth
        document.getElementById('google-auth').addEventListener('click', () => {
            this.openAuthWindow('/auth/google');
        });

        // Botón de Apple Auth
        document.getElementById('apple-auth').addEventListener('click', () => {
            this.openAuthWindow('/auth/apple');
        });

        // Botones de navegación
        document.getElementById('show-hotspots').addEventListener('click', () => {
            this.loadHotspots();
        });

        document.getElementById('show-plans').addEventListener('click', () => {
            this.loadPlans();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Escuchar mensajes de autenticación
        window.addEventListener('message', (event) => {
            if (event.data.type === 'auth_success' && event.data.token) {
                this.handleAuthSuccess(event.data.token);
            }
        });

        // Verificar si hay parámetros de error en la URL
        this.checkUrlParams();
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const message = urlParams.get('message');

        if (error === 'auth_failed') {
            this.showMessage('Error en la autenticación. Intenta nuevamente.', 'error');
        } else if (error === 'apple_not_configured') {
            this.showMessage('Apple Sign-In no está configurado en este momento.', 'info');
        } else if (error === 'no_token') {
            this.showMessage('Error en el proceso de autenticación.', 'error');
        }

        if (message === 'logged_out') {
            this.showMessage('Sesión cerrada correctamente.', 'success');
        }
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

    async verifyToken() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                this.showUserInfo();
            } else {
                this.handleInvalidToken();
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            this.handleInvalidToken();
        } finally {
            this.showLoading(false);
        }
    }

    handleInvalidToken() {
        localStorage.removeItem('hotspot_token');
        this.token = null;
        this.user = null;
        this.showAuthSection();
        this.showMessage('La sesión expiró. Inicia sesión nuevamente.', 'info');
    }

    async handleAuthSuccess(token) {
        this.token = token;
        localStorage.setItem('hotspot_token', token);
        await this.verifyToken();
    }

    async loadHotspots() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/mikrotik/hotspots', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displayHotspots(data.hotspots);
                this.showSection('hotspots-section');
            } else {
                this.showMessage('Error al cargar los hotspots', 'error');
            }
        } catch (error) {
            console.error('Error loading hotspots:', error);
            this.showMessage('Error de conexión', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadPlans() {
        try {
            this.showLoading(true);
            
            // En una implementación real, esto vendría de la API
            const plans = [
                { 
                    _id: '1', 
                    name: '1 Día', 
                    price: 100, 
                    days: 1, 
                    description: 'Acceso completo por 24 horas',
                    features: ['Velocidad máxima', 'Datos ilimitados', 'Soporte 24/7']
                },
                { 
                    _id: '2', 
                    name: '3 Días', 
                    price: 250, 
                    days: 3, 
                    description: 'Acceso por 3 días con mejor precio por día',
                    features: ['Ahorra 16%', 'Velocidad máxima', 'Datos ilimitados']
                },
                { 
                    _id: '3', 
                    name: '7 Días', 
                    price: 500, 
                    days: 7, 
                    description: 'Acceso por 1 semana - El más popular',
                    features: ['Ahorra 28%', 'Velocidad máxima', 'Soporte prioritario']
                },
                { 
                    _id: '4', 
                    name: '30 Días', 
                    price: 1500, 
                    days: 30, 
                    description: 'Acceso completo por 1 mes - Máximo ahorro',
                    features: ['Ahorra 50%', 'Velocidad máxima', 'Soporte VIP']
                }
            ];
            
            this.displayPlans(plans);
            this.showSection('plans-section');
        } catch (error) {
            console.error('Error loading plans:', error);
            this.showMessage('Error al cargar los planes', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayHotspots(hotspots = []) {
        const container = document.getElementById('hotspots-list');
        
        if (!hotspots || hotspots.length === 0) {
            container.innerHTML = `
                <div class="hotspot-card">
                    <h3>No hay hotspots disponibles</h3>
                    <p>Por el momento no hay hotspots activos. Intenta más tarde.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = hotspots.map(hotspot => `
            <div class="hotspot-card">
                <h3>${hotspot.name || 'Hotspot'}</h3>
                <p>📍 ${hotspot.location || 'Ubicación no especificada'}</p>
                <p>👥 ${hotspot.currentUsers || 0}/${hotspot.maxUsers || 50} usuarios conectados</p>
                <div class="hotspot-status ${(hotspot.currentUsers || 0) < (hotspot.maxUsers || 50) ? 'status-available' : 'status-full'}">
                    ${(hotspot.currentUsers || 0) < (hotspot.maxUsers || 50) ? '✅ Disponible' : '❌ Lleno'}
                </div>
                ${(hotspot.currentUsers || 0) < (hotspot.maxUsers || 50) ? 
                    `<button class="btn btn-primary" onclick="app.connectToHotspot('${hotspot.id}')" style="margin-top: 15px;">
                        Conectar
                    </button>` : 
                    ''
                }
            </div>
        `).join('');
    }

    displayPlans(plans = []) {
        const container = document.getElementById('plans-list');
        
        container.innerHTML = plans.map(plan => `
            <div class="plan-card">
                <h3>${plan.name}</h3>
                <p class="plan-description">${plan.description}</p>
                <div class="plan-price">$${plan.price}</div>
                <p class="plan-duration">${plan.days} día${plan.days > 1 ? 's' : ''} de acceso</p>
                <ul style="text-align: left; margin: 15px 0; padding-left: 20px; color: #555;">
                    ${(plan.features || []).map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <button class="btn btn-success" onclick="app.purchasePlan('${plan._id}')">
                    Comprar Plan
                </button>
            </div>
        `).join('');
    }

    async connectToHotspot(hotspotId) {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/mikrotik/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ hotspotId })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage(`¡Conectado exitosamente a ${data.hotspot.name}!`, 'success');
                this.user.credits = data.remainingCredits;
                this.updateUserInfo();
                
                // Mostrar credenciales
                this.showCredentials(data.credentials, data.hotspot);
            } else {
                this.showMessage(data.message || 'Error al conectar', 'error');
            }
        } catch (error) {
            console.error('Error connecting to hotspot:', error);
            this.showMessage('Error de conexión', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showCredentials(credentials, hotspot) {
        const message = `
            <div style="text-align: left;">
                <h4 style="margin-bottom: 10px; color: #28a745;">¡Conexión Exitosa!</h4>
                <p><strong>Hotspot:</strong> ${hotspot.name}</p>
                <p><strong>Usuario:</strong> ${credentials.username}</p>
                <p><strong>Contraseña:</strong> ${credentials.password}</p>
                <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    Usa estas credenciales para conectarte a la red WiFi.
                </p>
            </div>
        `;
        this.showMessage(message, 'success', 10000);
    }

    async purchasePlan(planId) {
        try {
            this.showLoading(true);
            
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
                window.location.href = data.initPoint || data.sandboxInitPoint;
            } else {
                this.showMessage(data.message || 'Error al crear el pago', 'error');
            }
        } catch (error) {
            console.error('Error purchasing plan:', error);
            this.showMessage('Error al procesar la compra', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showUserInfo() {
        document.getElementById('user-name').textContent = this.user.name;
        document.getElementById('user-credits').textContent = this.user.credits;
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('auth-section').classList.add('hidden');
        
        this.hideAllSections();
    }

    showAuthSection() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
        this.hideAllSections();
    }

    showSection(sectionId) {
        this.hideAllSections();
        document.getElementById(sectionId).classList.remove('hidden');
    }

    hideAllSections() {
        document.getElementById('hotspots-section').classList.add('hidden');
        document.getElementById('plans-section').classList.add('hidden');
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('hidden', !show);
    }

    updateUserInfo() {
        if (this.user) {
            document.getElementById('user-credits').textContent = this.user.credits;
        }
    }

    logout() {
        localStorage.removeItem('hotspot_token');
        this.token = null;
        this.user = null;
        
        // Hacer logout en el servidor
        fetch('/auth/logout', { method: 'GET' });
        
        this.showAuthSection();
        this.showMessage('Sesión cerrada correctamente', 'success');
    }

    showMessage(message, type = 'info', duration = 5000) {
        const container = document.getElementById('message-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = message;
        
        container.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, duration);
    }
}

// Inicializar la aplicación cuando se carga la página
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HotspotApp();
});
