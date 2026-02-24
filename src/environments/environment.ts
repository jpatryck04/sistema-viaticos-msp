/**
 * CONFIGURACIÓN DE DESARROLLO
 * 
 * IMPORTANTE: El API mock debe estar corriendo en localhost:3000
 * Asegúrate de que tu servidor mock esté activo antes de iniciar la aplicación.
 * 
 * Todas las solicitudes HTTP se enviarán a: http://localhost:3000/api
 * 
 * Las rutas esperadas del API son:
 * - GET /api/empleados/{cedula} - Obtener empleado por cédula
 * - GET /api/destinos - Obtener lista de destinos
 * - POST /api/viaticos/individual - Guardar viáticos individuales
 * - POST /api/viaticos/grupal - Guardar viáticos grupales
 * - GET /api/viaticos/validar-dia - Validar disponibilidad de fecha
 * - POST /api/documentos/upload - Subir documentos
 */

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // URL del servidor mock local
  version: '1.0.0',
  appName: 'Sistema de Gestión de Viáticos MSP',
  maxFileSize: 5242880,
  allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};