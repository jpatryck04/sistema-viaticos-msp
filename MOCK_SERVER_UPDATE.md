# Actualización del Mock Server - Ruta GET /api/reportes

Para que tu aplicación Angular funcione completamente, agrega esta ruta al `server.js` de tu mock server.

## Código a agregar en server.js

Agrega esta ruta ANTES de la línea `server.use('/api', router);`:

```javascript
// Función auxiliar para parsear fechas en formato ISO (YYYY-MM-DD) como zona horaria local
// Evita problemas de zona horaria UTC que restan un día
const parseDateLocal = (dateString) => {
  if (!dateString || dateString instanceof Date) return dateString;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Ruta de reportes - Genera reportes desde los viáticos guardados
server.get('/api/reportes', (req, res) => {
  const { fechaInicio, fechaFin, cedula, departamento, estado } = req.query;
  
  const viaticos = router.db.get('viaticos').value();
  const empleados = router.db.get('empleados').value();
  const destinos = router.db.get('destinos').value();
  
  // Generar reportes a partir de viáticos
  let reportes = viaticos.map(viatico => {
    const empleado = empleados.find(e => e.cedula === viatico.cedula);
    const destino = destinos.find(d => d.id === viatico.idDestino);
    
    // Calcular totales basado en horarios (según ARTÍCULO SEXTO)
    const fechaSalida = parseDateLocal(viatico.fechaSalida);
    const fechaRetorno = parseDateLocal(viatico.fechaRetorno);
    const horaSalida = viatico.horaSalida;
    const horaRetorno = viatico.horaRetorno;
    
    // Función auxiliar para convertir hora a número
    const convertirHoraANumero = (hora) => {
      const [time, modifier] = hora.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return hours + (minutes / 60);
    };
    
    const horaSalidaNum = convertirHoraANumero(horaSalida);
    const horaRetornoNum = convertirHoraANumero(horaRetorno);
    const asignacionDiaria = empleado ? empleado.asignacionDiaria : 0;
    
    // Aplicar normas de viáticos
    let desayuno = 0, almuerzo = 0, cena = 0, alojamiento = 0;
    
    // DESAYUNO: 6:00 AM a 10:00 AM
    if (horaSalidaNum >= 6 && horaSalidaNum <= 10) {
      desayuno = asignacionDiaria * 0.10;
    }
    
    // ALMUERZO: Debe estar en viaje durante hora de almuerzo (11 AM - 1 PM)
    if (horaSalidaNum < 13 && horaRetornoNum > 11) {
      almuerzo = asignacionDiaria * 0.25;
    }
    
    // CENA: Retorno >= 6:00 PM
    if (horaRetornoNum >= 18) {
      cena = asignacionDiaria * 0.20;
    }
    
    // ALOJAMIENTO: Si hay diferencia de fechas
    if (fechaRetorno > fechaSalida) {
      alojamiento = asignacionDiaria * 0.45;
    }
    
    // Aplicar incremento por provincia turística (5%)
    if (viatico.esTuristica) {
      desayuno *= 1.05;
      almuerzo *= 1.05;
      cena *= 1.05;
      alojamiento *= 1.05;
    }
    
    const totalDieta = desayuno + almuerzo + cena + alojamiento;
    const totalGeneral = totalDieta + (destino ? destino.costoTransporte : 0);
    
    return {
      id: viatico.id,
      fecha: parseDateLocal(viatico.fechaSalida).toLocaleDateString('es-ES'),
      empleado: empleado ? empleado.nombreCompleto : 'DESCONOCIDO',
      cedula: viatico.cedula,
      destino: destino ? destino.nombre : 'DESCONOCIDO',
      totalDieta: parseFloat(totalDieta.toFixed(2)),
      transporte: destino ? destino.costoTransporte : 0,
      totalGeneral: parseFloat(totalGeneral.toFixed(2)),
      estado: viatico.estado || 'Pendiente',
      departamento: empleado ? empleado.departamento : 'DESCONOCIDO'
    };
  });
  
  // Aplicar filtros si se proporcionan
  if (cedula) {
    reportes = reportes.filter(r => r.cedula === cedula);
  }
  
  if (departamento) {
    reportes = reportes.filter(r => 
      r.departamento.toLowerCase().includes(departamento.toLowerCase())
    );
  }
  
  if (estado) {
    reportes = reportes.filter(r => r.estado === estado);
  }
  
  if (fechaInicio || fechaFin) {
    reportes = reportes.filter(r => {
      // Convertir fecha formateada DD/MM/YYYY a YYYY-MM-DD para parseDate
      const [day, month, year] = r.fecha.split('/');
      const fechaReporte = parseDateLocal(`${year}-${month}-${day}`);
      
      if (fechaInicio) {
        const inicio = parseDateLocal(fechaInicio);
        if (fechaReporte < inicio) return false;
      }
      
      if (fechaFin) {
        const fin = parseDateLocal(fechaFin);
        if (fechaReporte > fin) return false;
      }
      
      return true;
    });
  }
  
  res.jsonp(reportes);
});
```

## Dónde insertar el código

Abre `server.js` y localiza esta línea (debe estar cerca del final):

```javascript
// Usar router para otras rutas
server.use('/api', router);
```

**JUSTO ANTES** de esa línea, agrega el código anterior.

El orden correcto debe ser:

```javascript
// ... otras rutas GET/POST ...

server.get('/api/reportes', (req, res) => {
  // ... código del reporte ...
});

// Usar router para otras rutas
server.use('/api', router);

// Iniciar servidor
const PORT = 3000;
```

## Lo que hace esta ruta

✅ Combina datos de **viaticos**, **empleados** y **destinos**
✅ Calcula automáticamente **totales y dietas** según ARTÍCULO SEXTO
✅ Aplica incremento del 5% por **provincias turísticas**
✅ Filtra por: `cedula`, `departamento`, `estado`, `fechaInicio`, `fechaFin`
✅ Retorna formato compatible con tu aplicación Angular

## Ejemplo de uso

```bash
# Obtener todos los reportes
curl http://localhost:3000/api/reportes

# Reportes filtrados por cédula
curl "http://localhost:3000/api/reportes?cedula=001-1234567-8"

# Reportes por rango de fechas
curl "http://localhost:3000/api/reportes?fechaInicio=2026-01-01&fechaFin=2026-01-31"

# Reportes por estado
curl "http://localhost:3000/api/reportes?estado=Pagado"

# Reportes por departamento
curl "http://localhost:3000/api/reportes?departamento=EPIDEMIOLOGIA"
```
