/**
 * Configuración de ambiente de desarrollo
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  azureSasUrl: 'https://pachamama-sas-func.azurewebsites.net/api/sas',
  azureStorageBaseUrl: 'https://sapachamama001.blob.core.windows.net/admin-uploads',
  firebase: {
    apiKey: 'AIzaSyDxZshF6sa_oB8SmE3OygU6Zi9EnQ30RWg',
    authDomain: 'pachamama-mvp.firebaseapp.com',
    projectId: 'pachamama-mvp',
    storageBucket: 'pachamama-mvp.firebasestorage.app',
    messagingSenderId: '1091949587458',
    appId: '1:1091949587458:web:587f5aa58892fe06080b1b',
  },
};
