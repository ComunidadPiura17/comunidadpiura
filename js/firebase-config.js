// Configuración de Firebase
const firebaseConfig = {
     apiKey: "AIzaSyCOUTG0zmjCzw4P6mtBltAHADDnRoN-bZ4",
  authDomain: "comunidad-piura-81534.firebaseapp.com",
  projectId: "comunidad-piura-81534",
  storageBucket: "comunidad-piura-81534.firebasestorage.app",
  messagingSenderId: "430270598863",
  appId: "1:430270598863:web:a323b12d70d2f2e1d8b1ba",
  measurementId: "G-BE99LLHGQ1"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener referencias a los servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar persistencia de autenticación
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error("Error configurando persistencia:", error);
    });

// Configurar proveedores
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Configurar alcances de Facebook (opcional)
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');