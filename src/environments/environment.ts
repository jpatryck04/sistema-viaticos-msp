/**
 * CONFIGURACIÓN DE DESARROLLO
 * 
 * ⚙️ CONFIGURACIÓN REQUERIDA:
 * Establece la URL de tu servidor API en la variable 'apiUrl'.
 * 
 * 📌 ENDPOINTS ESPERADOS DEL API:
 * - GET  /api/empleados/:cedula         - Obtener datos de empleado
 * - GET  /api/destinos                   - Listar destinos disponibles
 * - POST /api/viaticos/individual       - Guardar viáticos individuales
 * - POST /api/viaticos/grupal           - Guardar viáticos grupales
 * - GET  /api/viaticos/validar-dia      - Validar disponibilidad en fecha
 * - POST /api/documentos/upload         - Subir archivos de documentos
 * - GET  /api/reportes                  - Obtener reportes (con filtros opcionales)
 * 
 * 🔒 IMPORTANTE: No incluir credenciales en este archivo.
 * Usar variables de entorno del sistema o configuración segura.
 */

export const environment = {
  production: false,
  // ⬇️ CONFIGURA LA URL DE TU API AQUÍ
  apiUrl: 'http://localhost:3000/api',
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