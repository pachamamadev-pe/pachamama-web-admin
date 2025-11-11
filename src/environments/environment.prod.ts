/**
 * Configuración de ambiente de producción
 */
export const environment = {
  production: true,
  apiUrl: 'https://pachamama-api-admin-java-480f89dc7333.herokuapp.com',
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
