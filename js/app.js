// Elementos del DOM
document.addEventListener('DOMContentLoaded', () => {
    checkUserState();
    
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    if (window.location.pathname.includes('login.html')) {
        initAuthForms();
    }

    if (window.location.pathname.includes('dashboard.html')) {
        loadDashboardData();
    }

    updateMemberCount();
});

// Verificar estado del usuario
function checkUserState() {
    auth.onAuthStateChanged(async (user) => {
        const currentPath = window.location.pathname;
        
        updateMainPageUI(user);
        
        if (user) {
            if (currentPath.includes('login.html')) {
                window.location.href = 'dashboard.html';
            }
            
            const userData = {
                uid: user.uid,
                name: user.displayName || 'Usuario',
                email: user.email,
                avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Usuario')}&background=6c5ce7&color=fff`
            };
            localStorage.setItem('user', JSON.stringify(userData));
            
            // VERIFICAR Y ACTUALIZAR USUARIO EN FIRESTORE
            try {
                const userRef = db.collection('users').doc(user.uid);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    // Si es nuevo, crear documento
                    await userRef.set({
                        name: user.displayName || 'Usuario',
                        email: user.email,
                        avatar: userData.avatar,
                        role: 'miembro', // CAMBIADO de 'fundador' a 'miembro'
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        online: true,
                        isActive: true
                    });
                } else {
                    // Si ya existe, actualizar último login y online
                    await userRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        online: true,
                        isActive: true
                    });
                }
            } catch (error) {
                console.error("Error actualizando usuario:", error);
            }
            
        } else {
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

                // GUARDAR CORRECTAMENTE EN FIRESTORE
                await db.collection('users').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=fff`,
                    role: 'miembro', // CAMBIADO a 'miembro' en lugar de 'fundador'
                    online: true,
                    isActive: true
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
                const result = await auth.signInWithPopup(provider);
                
                // Guardar usuario de Google en Firestore
                const user = result.user;
                const userRef = db.collection('users').doc(user.uid);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    await userRef.set({
                        name: user.displayName,
                        email: user.email,
                        avatar: user.photoURL,
                        role: 'miembro',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        online: true,
                        isActive: true
                    });
                } else {
                    await userRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        online: true
                    });
                }
                
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
                const result = await auth.signInWithPopup(provider);
                
                // Guardar usuario de Facebook en Firestore
                const user = result.user;
                const userRef = db.collection('users').doc(user.uid);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    await userRef.set({
                        name: user.displayName,
                        email: user.email,
                        avatar: user.photoURL,
                        role: 'miembro',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        online: true,
                        isActive: true
                    });
                } else {
                    await userRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        online: true
                    });
                }
                
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
                // Marcar como offline antes de salir
                if (user) {
                    await db.collection('users').doc(user.uid).update({
                        online: false,
                        lastLogout: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
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
        await loadDashboardStats();
        await loadUpcomingEvents();
        await loadMembersPreview();
        await loadRecentActivity();
        setupSidebarNavigation();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// ===== FUNCIONES CORREGIDAS CON DATOS REALES =====

// Cargar estadísticas del dashboard
async function loadDashboardStats() {
    try {
        // Contar miembros totales REALES
        const membersSnapshot = await db.collection('users').get();
        const totalMembers = membersSnapshot.size;
        
        // Contar miembros activos (online = true)
        const activeSnapshot = await db.collection('users')
            .where('online', '==', true)
            .get();
        const activeMembers = activeSnapshot.size;
        
        // Contar miembros con isActive = true (como respaldo)
        const activeSnapshot2 = await db.collection('users')
            .where('isActive', '==', true)
            .get();
        
        // Usar el que tenga más sentido
        const finalActiveCount = activeMembers > 0 ? activeMembers : activeSnapshot2.size;
        
        // Actualizar elementos
        const totalMembersEl = document.getElementById('totalMembers');
        if (totalMembersEl) totalMembersEl.textContent = totalMembers;
        
        const activeMembersEl = document.getElementById('activeMembers');
        if (activeMembersEl) {
            activeMembersEl.textContent = finalActiveCount;
        }
        
        // Eventos (por ahora 0)
        const upcomingEventsEl = document.getElementById('upcomingEvents');
        if (upcomingEventsEl) upcomingEventsEl.textContent = "0";
        
        // Mensajes no leídos (por ahora 0)
        const unreadMessagesEl = document.getElementById('unreadMessages');
        if (unreadMessagesEl) unreadMessagesEl.textContent = "0";
        
        console.log(`Estadísticas: ${totalMembers} totales, ${finalActiveCount} activos`);
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar miembros REALES
async function loadMembersPreview() {
    const membersPreview = document.getElementById('membersPreview');
    if (!membersPreview) return;
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        
        // Obtener TODOS los usuarios REALES de Firestore
        const membersSnapshot = await db.collection('users')
            .orderBy('lastLogin', 'desc')
            .get();
        
        if (membersSnapshot.size > 0) {
            let html = '';
            membersSnapshot.forEach(doc => {
                const data = doc.data();
                const isCurrentUser = doc.id === currentUser.uid;
                html += `
                    <div class="member-item">
                        <img src="${data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=6c5ce7&color=fff`}" 
                             alt="${data.name}" class="member-avatar">
                        <div class="member-info">
                            <h4>${data.name} ${isCurrentUser ? '(tú)' : ''}</h4>
                            <span class="member-role">${data.role || 'Miembro'}</span>
                        </div>
                        <span class="member-status ${data.online ? 'online' : 'offline'}" 
                              title="${data.online ? 'En línea' : 'Desconectado'}"></span>
                    </div>
                `;
            });
            membersPreview.innerHTML = html;
            
            console.log(`Mostrando ${membersSnapshot.size} miembros`);
            
        } else {
            // Esto no debería pasar porque al menos está el usuario actual
            membersPreview.innerHTML = `
                <div class="member-item">
                    <img src="${currentUser.avatar}" alt="${currentUser.name}" class="member-avatar">
                    <div class="member-info">
                        <h4>${currentUser.name} (tú)</h4>
                        <span class="member-role">Miembro</span>
                    </div>
                    <span class="member-status online"></span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando miembros:', error);
    }
}

// Cargar actividad reciente
async function loadRecentActivity() {
    const feedContainer = document.getElementById('activityFeed');
    if (!feedContainer) return;
    
    try {
        // Buscar actividades de los últimos 7 días
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const activitiesSnapshot = await db.collection('activities')
            .where('timestamp', '>', sevenDaysAgo)
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
            // Crear actividad de bienvenida
            const user = JSON.parse(localStorage.getItem('user'));
            
            // Guardar actividad de bienvenida en Firestore
            await db.collection('activities').add({
                userName: user.name,
                userAvatar: user.avatar,
                action: 'se unió a la comunidad',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            feedContainer.innerHTML = `
                <div class="feed-item welcome-message">
                    <img src="${user.avatar}" alt="${user.name}" class="activity-avatar">
                    <div class="feed-content">
                        <h4>${user.name}</h4>
                        <p>se unió a la comunidad</p>
                        <span class="feed-time">Justo ahora</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando actividades:', error);
    }
}

// Cargar próximos eventos
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
                    <div class="event-item">
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
                            <span>${data.attendees || 0}</span>
                        </div>
                    </div>
                `;
            });
            eventsList.innerHTML = html;
        } else {
            eventsList.innerHTML = `
                <div class="event-item" onclick="showNotification('Pronto podrás crear eventos', 'info')">
                    <div class="event-info" style="text-align: center; width: 100%;">
                        <i class="fas fa-calendar-plus" style="font-size: 2rem; color: var(--primary); margin-bottom: 0.5rem;"></i>
                        <h4>No hay eventos programados</h4>
                        <p>Próximamente podrás crear eventos</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando eventos:', error);
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
            
            switch(section) {
                case 'Miembros':
                    loadMembersPreview();
                    showNotification('Lista de miembros', 'info');
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
                    location.reload();
            }
        });
    });
}

// Formatear timestamp
function formatTime(timestamp) {
    if (!timestamp) return 'Recientemente';
    
    try {
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
    } catch (error) {
        return 'Recientemente';
    }
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

// Estilos adicionales
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

    .member-status.online {
        background: #00b894;
        box-shadow: 0 0 10px #00b894;
        animation: pulse 2s infinite;
    }

    .member-status.offline {
        background: #b2bec3;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
`;
document.head.appendChild(style);
