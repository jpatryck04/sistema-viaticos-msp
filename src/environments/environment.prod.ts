/**
 * CONFIGURACIÓN DE PRODUCCIÓN
 * 
 * ⚠️  IMPORTANTE:
 * - Reemplaza 'https://tu-dominio.com/api' con la URL real del API
 * - Asegúrate de usar HTTPS en producción
 * - No incluir secretos o credenciales aquí
 * - Gestionar autenticación a través de interceptores HTTP
 */

export const environment = {
  production: true,
  // ⬇️ REEMPLAZA CON TU URL DE API EN PRODUCCIÓN
  apiUrl: 'https://api.msp.gob.do/api',
  version: '1.0.0',
  appName: 'Sistema de Gestión de Viáticos - MSP',
  maxFileSize: 5242880, // 5 MB en bytes
  allowedFileTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};