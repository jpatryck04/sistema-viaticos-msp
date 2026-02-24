# Requisitos del API Mock - Sistema de Viáticos MSP

## ⚠️ IMPORTANTE

La aplicación Angular **NO incluye datos hardcodeados por defecto**. Todos los datos DEBEN venir de tu servidor mock en `localhost:3000`.

## Configuración Requerida

### 1. Servidor Mock debe estar corriendo en:
```
http://localhost:3000
```

### 2. Rutas del API que se esperan:

#### **GET /api/empleados/{cedula}**
Retorna un objeto Empleado:
```json
{
  "cedula": "001-1234567-8",
  "nombreCompleto": "JUAN CARLOS PEREZ GARCIA",
  "cargo": "TECNICO DE EPIDEMIOLOGIA",
  "asignacionDiaria": 4100.00,
  "departamento": "EPIDEMIOLOGIA",
  "sueldo": 45000.00,
  "activo": true
}
```

#### **GET /api/destinos**
Retorna un array de destinos:
```json
{
  "id": 1,
  "nombre": "Santo Domingo",
  "tipo": "normal",
  "costoTransporte": 500.00,
  "distanciaKm": 0,
  "activo": true
}
```

#### **POST /api/viaticos/individual**
Body: Array de viajes individuales
Retorna:
```json
{
  "mensaje": "Viáticos guardados correctamente",
  "ids": [1, 2, 3]
}
```

#### **POST /api/viaticos/grupal**
Body: Array de viajes grupales
Retorna:
```json
{
  "mensaje": "Todos los viáticos guardados correctamente",
  "totalRegistros": 3,
  "ids": [1, 2, 3]
}
```

#### **GET /api/viaticos/validar-dia**
Query params: `cedula`, `fecha` (YYYY-MM-DD)
Retorna:
```json
{
  "existe": false,
  "mensaje": "Fecha disponible"
}
```

#### **POST /api/documentos/upload**
FormData con documentos
Retorna:
```json
{
  "exitoso": true,
  "url": "/uploads/2026/01/documento.pdf"
}
```

#### **GET /api/reportes** ⭐ (NUEVA RUTA - VER MOCK_SERVER_UPDATE.md)
Query params opcionales: 
- `fechaInicio` (YYYY-MM-DD)
- `fechaFin` (YYYY-MM-DD)
- `cedula`
- `departamento`
- `estado` ('Pagado'|'Pendiente'|'Procesado')

Retorna array de ReporteItem:
```json
{
  "id": 1,
  "fecha": "15/01/2026",
  "empleado": "JUAN CARLOS PEREZ GARCIA",
  "cedula": "001-1234567-8",
  "destino": "Santiago",
  "totalDieta": 3280.00,
  "transporte": 800.00,
  "totalGeneral": 4080.00,
  "estado": "Pagado",
  "departamento": "EPIDEMIOLOGIA"
}
```

## Verificación

Para verificar que el API está respondiendo correctamente:

```bash
# Prueba de conexión básica a destinos
curl http://localhost:3000/api/destinos

# Búsqueda de empleado (con cédula ejemplo del mock)
curl http://localhost:3000/api/empleados/001-1234567-8

# Obtener todos los viáticos
curl http://localhost:3000/api/viaticos

# Obtener reportes con filtro de rango de fechas
curl "http://localhost:3000/api/reportes?fechaInicio=2026-01-01&fechaFin=2026-01-31"
```

## Notas Importantes

- ✅ Todos los datos se cargan dinámicamente desde el API
- ❌ NO hay datos por defecto en el código Angular (fueron removidos completamente)
- ✅ El MockInterceptor está DEPRECADO y no se usa
- ✅ La aplicación funciona como si estuviera en **producción**
- ✅ El módulo reportes carga datos desde el API en tiempo real
- ✅ Los cálculos de viáticos aplican las normas del **ARTÍCULO SEXTO** automáticamente

## Estructura de Datos Esperada

Ver archivo `MOCK_SERVER_UPDATE.md` para instrucciones sobre cómo agregar la ruta `/api/reportes` al `server.js` de tu mock.

## Variables de entorno

Ver `src/environments/environment.ts` para la configuración del API en desarrollo:
```typescript
apiUrl: 'http://localhost:3000/api'
```
