// Elementos del DOM
document.addEventListener('DOMContentLoaded', () => {
    // Verificar estado de autenticación al cargar cualquier página
    checkUserState();
    
    // Manejar navegación móvil
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    // Detectar si estamos en página de login
    if (window.location.pathname.includes('login.html')) {
        initAuthForms();
    }

    // Detectar si estamos en dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        loadDashboardData();
    }

    // Actualizar contador de miembros
    updateMemberCount();
});

// Verificar estado del usuario
function checkUserState() {
    auth.onAuthStateChanged((user) => {
        const currentPath = window.location.pathname;
        
        // Actualizar UI de la página principal
        updateMainPageUI(user);
        
        if (user) {
            // Usuario logueado
            if (currentPath.includes('login.html')) {
                window.location.href = 'dashboard.html';
            }
            
            // Guardar datos del usuario
            const userData = {
                uid: user.uid,
                name: user.displayName || 'Usuario',
                email: user.email,
                avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Usuario')}&background=6c5ce7&color=fff`
            };
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Actualizar último login en Firestore
            db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                online: true
            }).catch(() => {
                // Si el documento no existe, lo creamos
                db.collection('users').doc(user.uid).set({
                    name: user.displayName || 'Usuario',
                    email: user.email,
                    avatar: userData.avatar,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    online: true,
                    role: 'miembro',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
        } else {
            // Usuario no logueado
            if (currentPath.includes('dashboard.html')) {
                window.location.href = 'login.html';
            }
            localStorage.removeItem('user');
        }
    });
}

// Actualizar UI de la página principal
function updateMainPageUI(user) {
    const authButtons = document.getElementById('authButtons');
    const heroButtons = document.getElementById('heroButtons');
    
    if (authButtons) {
        if (user) {
            authButtons.innerHTML = `
                <a href="dashboard.html" class="btn-dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                    Mi Dashboard
                </a>
            `;
        } else {
            authButtons.innerHTML = `
                <a href="login.html" class="btn-login">Iniciar Sesión</a>
                <a href="login.html?signup=true" class="btn-signup">Registrarse</a>
            `;
        }
    }
    
    if (heroButtons) {
        if (user) {
            heroButtons.innerHTML = `
                <a href="dashboard.html" class="btn-primary">
                    <i class="fas fa-tachometer-alt"></i>
                    Ir a mi Dashboard
                </a>
                <a href="#about" class="btn-secondary">
                    <i class="fas fa-info-circle"></i>
                    Conoce Más
                </a>
            `;
        } else {
            heroButtons.innerHTML = `
                <a href="login.html?signup=true" class="btn-primary">
                    <i class="fas fa-user-plus"></i>
                    Únete Ahora
                </a>
                <a href="#about" class="btn-secondary">
                    <i class="fas fa-info-circle"></i>
                    Conoce Más
                </a>
            `;
        }
    }
}

// Inicializar formularios de autenticación
function initAuthForms() {
    const urlParams = new URLSearchParams(window.location.search);
    const isSignup = urlParams.get('signup') === 'true';
    
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const toggleBtn = document.getElementById('toggleAuth');
    const toggleMessage = document.getElementById('toggleMessage');
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');

    if (isSignup) {
        showSignupForm();
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (loginForm.classList.contains('active')) {
                showSignupForm();
            } else {
                showLoginForm();
            }
        });
    }

    // Manejar login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                showLoading(loginForm.querySelector('button'));
                await auth.signInWithEmailAndPassword(email, password);
                showNotification('¡Bienvenido!', 'success');
            } catch (error) {
                handleAuthError(error);
            } finally {
                hideLoading(loginForm.querySelector('button'));
            }
        });
    }

    // Manejar registro
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;

            if (password !== confirmPassword) {
                showNotification('Las contraseñas no coinciden', 'error');
                return;
            }

            try {
                showLoading(signupForm.querySelector('button'));
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                await userCredential.user.updateProfile({
                    displayName: name
                });

                await db.collection('users').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=fff`,
                    role: 'miembro',
                    online: true
                });

                showNotification('¡Registro exitoso!', 'success');
            } catch (error) {
                handleAuthError(error);
            } finally {
                hideLoading(signupForm.querySelector('button'));
            }
        });
    }

    // Login con Gmail
    const gmailBtn = document.getElementById('gmailLogin');
    if (gmailBtn) {
        gmailBtn.addEventListener('click', async () => {
            try {
                showLoading(gmailBtn);
                const provider = new firebase.auth.GoogleAuthProvider();
                await auth.signInWithPopup(provider);
                showNotification('¡Bienvenido!', 'success');
            } catch (error) {
                handleAuthError(error);
            } finally {
                hideLoading(gmailBtn);
            }
        });
    }

    // Login con Facebook
    const facebookBtn = document.getElementById('facebookLogin');
    if (facebookBtn) {
        facebookBtn.addEventListener('click', async () => {
            try {
                showLoading(facebookBtn);
                const provider = new firebase.auth.FacebookAuthProvider();
                await auth.signInWithPopup(provider);
                showNotification('¡Bienvenido!', 'success');
            } catch (error) {
                handleAuthError(error);
            } finally {
                hideLoading(facebookBtn);
            }
        });
    }

    function showSignupForm() {
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
        formTitle.textContent = 'Crear Cuenta';
        formSubtitle.textContent = 'Únete a nuestra comunidad hoy';
        toggleMessage.textContent = '¿Ya tienes una cuenta?';
        toggleBtn.textContent = 'Iniciar Sesión';
    }

    function showLoginForm() {
        signupForm.classList.remove('active');
        loginForm.classList.add('active');
        formTitle.textContent = 'Iniciar Sesión';
        formSubtitle.textContent = 'Bienvenido de vuelta a la comunidad';
        toggleMessage.textContent = '¿No tienes una cuenta?';
        toggleBtn.textContent = 'Crear cuenta nueva';
    }
}

// Cargar datos del dashboard
async function loadDashboardData() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) return;

    // Actualizar UI con datos del usuario
    const userName = document.getElementById('userName');
    const welcomeName = document.getElementById('welcomeName');
    const userAvatar = document.getElementById('userAvatar');

    if (userName) userName.textContent = user.name;
    if (welcomeName) welcomeName.textContent = user.name.split(' ')[0];
    if (userAvatar) userAvatar.src = user.avatar;

    // Manejar logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                showNotification('Sesión cerrada correctamente', 'success');
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            }
        });
    }

    try {
        // Cargar todas las funcionalidades
        await loadDashboardStats();
        await loadUpcomingEvents();
        await loadMembersPreview();
        await loadRecentActivity();
        
        // Configurar navegación
        setupSidebarNavigation();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// ===== FUNCIONES CORREGIDAS (SIN DATOS DE EJEMPLO) =====

// Cargar estadísticas del dashboard
async function loadDashboardStats() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Contar miembros totales REALES
        const membersSnapshot = await db.collection('users').get();
        const totalMembers = membersSnapshot.size;
        
        // Actualizar elementos
        const totalMembersEl = document.getElementById('totalMembers');
        if (totalMembersEl) totalMembersEl.textContent = totalMembers;
        
        // Contar miembros activos (online ahora)
        const activeSnapshot = await db.collection('users')
            .where('online', '==', true)
            .get();
        
        const activeMembersEl = document.getElementById('activeMembers');
        if (activeMembersEl) {
            if (totalMembers === 1) {
                activeMembersEl.textContent = "1 (tú)";
            } else {
                activeMembersEl.textContent = activeSnapshot.size;
            }
        }
        
        // Eventos (0 por ahora)
        const upcomingEventsEl = document.getElementById('upcomingEvents');
        if (upcomingEventsEl) upcomingEventsEl.textContent = "0";
        
        // Mensajes (0 por ahora)
        const unreadMessagesEl = document.getElementById('unreadMessages');
        if (unreadMessagesEl) unreadMessagesEl.textContent = "0";
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Mostrar solo el usuario actual
        document.getElementById('totalMembers').textContent = "1";
        document.getElementById('activeMembers').textContent = "1 (tú)";
        document.getElementById('upcomingEvents').textContent = "0";
        document.getElementById('unreadMessages').textContent = "0";
    }
}

// Cargar actividad reciente REAL
async function loadRecentActivity() {
    const feedContainer = document.getElementById('activityFeed');
    if (!feedContainer) return;
    
    try {
        const activitiesSnapshot = await db.collection('activities')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        if (!activitiesSnapshot.empty) {
            let html = '';
            activitiesSnapshot.forEach(doc => {
                const data = doc.data();
                html += `
                    <div class="feed-item">
                        <img src="${data.userAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.userName) + '&background=6c5ce7&color=fff'}" 
                             alt="Avatar" class="activity-avatar">
                        <div class="feed-content">
                            <div class="feed-header">
                                <h4>${data.userName}</h4>
                                <span class="feed-time">${formatTime(data.timestamp)}</span>
                            </div>
                            <p>${data.action}</p>
                        </div>
                    </div>
                `;
            });
            feedContainer.innerHTML = html;
        } else {
            // Mensaje amigable cuando no hay actividades
            const user = JSON.parse(localStorage.getItem('user'));
            feedContainer.innerHTML = `
                <div class="feed-item welcome-message">
                    <img src="${user.avatar}" alt="${user.name}" class="activity-avatar">
                    <div class="feed-content">
                        <h4>¡Bienvenido a la comunidad!</h4>
                        <p>Comparte el link con amigos para que más personas se unan</p>
                        <button class="btn-share" onclick="shareCommunity()">
                            <i class="fas fa-share-alt"></i> Invitar amigos
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando actividades:', error);
        feedContainer.innerHTML = `
            <div class="feed-item">
                <div class="feed-content">
                    <p>Bienvenido a la comunidad. ¡Comparte y conoce gente nueva!</p>
                </div>
            </div>
        `;
    }
}

// Función para compartir la comunidad
function shareCommunity() {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    showNotification('¡Link copiado! Compártelo con amigos', 'success');
}

// Cargar próximos eventos (vacíos por ahora)
async function loadUpcomingEvents() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    try {
        const today = new Date();
        const eventsSnapshot = await db.collection('events')
            .where('date', '>', today)
            .orderBy('date')
            .limit(5)
            .get();
        
        if (!eventsSnapshot.empty) {
            let html = '';
            eventsSnapshot.forEach(doc => {
                const data = doc.data();
                html += `
                    <div class="event-item" onclick="window.location.href='#event-${doc.id}'">
                        <div class="event-date">
                            <span class="event-day">${new Date(data.date).getDate()}</span>
                            <span class="event-month">${new Date(data.date).toLocaleString('es', { month: 'short' })}</span>
                        </div>
                        <div class="event-info">
                            <h4>${data.title}</h4>
                            <p><i class="fas fa-clock"></i> ${data.time}hs</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${data.location}</p>
                        </div>
                        <div class="event-attendees">
                            <i class="fas fa-users"></i>
                            <span>${data.attendees?.length || 0}</span>
                        </div>
                    </div>
                `;
            });
            eventsList.innerHTML = html;
        } else {
            // Mensaje para crear primer evento
            eventsList.innerHTML = `
                <div class="event-item create-event" onclick="showNotification('Pronto podrás crear eventos', 'info')">
                    <div class="event-info">
                        <h4>📅 No hay eventos programados</h4>
                        <p>¡Sé el primero en organizar un evento!</p>
                    </div>
                    <i class="fas fa-plus-circle" style="color: var(--primary); font-size: 2rem;"></i>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando eventos:', error);
        eventsList.innerHTML = `
            <div class="event-item">
                <div class="event-info">
                    <p>Próximamente podrás crear eventos</p>
                </div>
            </div>
        `;
    }
}

// Cargar miembros REALES
async function loadMembersPreview() {
    const membersPreview = document.getElementById('membersPreview');
    if (!membersPreview) return;
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        
        // Obtener SOLO usuarios REALES de Firestore
        const membersSnapshot = await db.collection('users')
            .orderBy('lastLogin', 'desc')
            .limit(6)
            .get();
        
        if (membersSnapshot.size > 1) { // Hay más miembros además del actual
            let html = '';
            membersSnapshot.forEach(doc => {
                const data = doc.data();
                const isCurrentUser = doc.id === currentUser.uid;
                html += `
                    <div class="member-item" onclick="window.location.href='#profile-${doc.id}'">
                        <img src="${data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=6c5ce7&color=fff`}" 
                             alt="${data.name}" class="member-avatar">
                        <div class="member-info">
                            <h4>${data.name} ${isCurrentUser ? '(tú)' : ''}</h4>
                            <span class="member-role">${data.role || 'Miembro'}</span>
                        </div>
                        <span class="member-status ${data.online ? 'online' : 'offline'}"></span>
                    </div>
                `;
            });
            membersPreview.innerHTML = html;
        } else {
            // Solo mostrar el usuario actual
            membersPreview.innerHTML = `
                <div class="member-item">
                    <img src="${currentUser.avatar}" alt="${currentUser.name}" class="member-avatar">
                    <div class="member-info">
                        <h4>${currentUser.name} (tú)</h4>
                        <span class="member-role">Fundador</span>
                    </div>
                    <span class="member-status online"></span>
                </div>
                <div class="member-item invite-card" onclick="shareCommunity()">
                    <div class="member-info">
                        <i class="fas fa-user-plus" style="color: var(--primary); font-size: 2rem; margin-bottom: 0.5rem;"></i>
                        <h4>Invitar amigos</h4>
                        <p>Comparte la comunidad</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando miembros:', error);
        // Mostrar solo el usuario actual
        const currentUser = JSON.parse(localStorage.getItem('user'));
        membersPreview.innerHTML = `
            <div class="member-item">
                <img src="${currentUser.avatar}" alt="${currentUser.name}" class="member-avatar">
                <div class="member-info">
                    <h4>${currentUser.name} (tú)</h4>
                    <span class="member-role">Fundador</span>
                </div>
                <span class="member-status online"></span>
            </div>
        `;
    }
}

// Configurar navegación del sidebar
function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const section = this.querySelector('span').textContent;
            
            // Acciones según la sección
            switch(section) {
                case 'Miembros':
                    loadMembersPreview();
                    showNotification('Sección de miembros', 'info');
                    break;
                case 'Eventos':
                    loadUpcomingEvents();
                    showNotification('Próximos eventos', 'info');
                    break;
                case 'Foro':
                    showNotification('Foro en construcción', 'info');
                    break;
                case 'Notificaciones':
                    showNotification('No tienes notificaciones', 'info');
                    break;
                case 'Configuración':
                    showNotification('Configuración próximamente', 'info');
                    break;
                default:
                    // Inicio - recargar
                    location.reload();
            }
        });
    });
}

// Formatear timestamp
function formatTime(timestamp) {
    if (!timestamp) return 'Recientemente';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'Justo ahora';
}

// Actualizar contador de miembros
async function updateMemberCount() {
    try {
        const memberCountElement = document.getElementById('memberCount');
        if (memberCountElement) {
            const snapshot = await db.collection('users').get();
            const count = snapshot.size;
            memberCountElement.textContent = count;
        }
    } catch (error) {
        console.error('Error actualizando contador:', error);
    }
}

// Utilidades
function showLoading(button) {
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }
}

function hideLoading(button) {
    if (button) {
        button.disabled = false;
        if (button.classList.contains('btn-auth')) {
            if (button.closest('#loginForm')) {
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            } else if (button.closest('#signupForm')) {
                button.innerHTML = '<i class="fas fa-user-plus"></i> Registrarse';
            }
        } else if (button.classList.contains('btn-social')) {
            if (button.classList.contains('gmail')) {
                button.innerHTML = '<i class="fab fa-google"></i> Gmail';
            } else if (button.classList.contains('facebook')) {
                button.innerHTML = '<i class="fab fa-facebook-f"></i> Facebook';
            }
        }
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00b894' : type === 'error' ? '#ff7675' : '#6c5ce7'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function handleAuthError(error) {
    let message = 'Error de autenticación';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'El correo ya está registrado';
            break;
        case 'auth/invalid-email':
            message = 'Correo electrónico inválido';
            break;
        case 'auth/user-not-found':
            message = 'Usuario no encontrado';
            break;
        case 'auth/wrong-password':
            message = 'Contraseña incorrecta';
            break;
        case 'auth/weak-password':
            message = 'La contraseña debe tener al menos 6 caracteres';
            break;
        case 'auth/account-exists-with-different-credential':
            message = 'Ya existe una cuenta con este correo usando otro método de inicio de sesión';
            break;
        case 'auth/popup-closed-by-user':
            message = 'Ventana de inicio de sesión cerrada';
            break;
        default:
            message = error.message;
    }

    showNotification(message, 'error');
}

// Agregar estilos adicionales
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .btn-dashboard {
        padding: 0.5rem 1.5rem;
        background: var(--primary);
        color: var(--light);
        border-radius: 25px;
        text-decoration: none;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }

    .btn-dashboard:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(108, 92, 231, 0.3);
    }

    .welcome-message {
        background: linear-gradient(135deg, rgba(108, 92, 231, 0.1), rgba(0, 206, 201, 0.1));
        border: 1px solid var(--primary);
    }

    .btn-share {
        background: var(--primary);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        margin-top: 0.5rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.3s ease;
    }

    .btn-share:hover {
        background: var(--primary-dark);
        transform: scale(1.05);
    }

    .invite-card {
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        cursor: pointer;
        text-align: center;
        justify-content: center;
    }

    .invite-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(108, 92, 231, 0.3);
    }

    .create-event {
        cursor: pointer;
        border: 2px dashed var(--primary);
    }

    .create-event:hover {
        background: rgba(108, 92, 231, 0.1);
    }

    .text-center {
        text-align: center;
    }
`;
document.head.appendChild(style);