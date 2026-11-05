// Configuration Firebase (projet revente-pfc). Ces valeurs sont publiques par conception :
// la protection vient des comptes (mot de passe) et des règles Firestore.
window.PFC_CONFIG = {
  FIREBASE: {
    apiKey: "AIzaSyA6i8QkbOQyRwwXU6rDSgf5HPNGOCvheMk",
    authDomain: "revente-pfc.firebaseapp.com",
    projectId: "revente-pfc",
    storageBucket: "revente-pfc.firebasestorage.app",
    messagingSenderId: "802402150704",
    appId: "1:802402150704:web:3c7386d2f3d6df116d00f5"
  },
  // Un compte par personne, créé dans Firebase Authentication (même e-mail, un mot de passe différent chacun).
  USERS: [
    { name: "Rachid",  email: "rachid@parisfc-revente.fr" },
    { name: "Sylvain", email: "sylvain@parisfc-revente.fr" }
  ]
};
