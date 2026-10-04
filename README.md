# GESTIÓN DE PERSONAL

**[Abrir GESTIÓN DE PERSONAL](https://controlesmineras.github.io/Gestion-de-Personal/)**

Producto independiente de SK-Web y Plaza Blending, con repositorio, backend y base D1 exclusivos. No utiliza el inicio de sesión de ChatGPT.

## Administración

Personal con documento, primer y segundo nombre, primer y segundo apellido, empresa, cargo, teléfono, disponibilidad, títulos y fortalezas individuales. Primer nombre, primer apellido y empresa son obligatorios. Empresa admite solo SK o E-SECURITY; cargo admite solo Director de seguridad, Jefe de seguridad, Supervisor, Escolta y Operador de seguridad.

Servicios con inicio/finalización y horas; permisos y vacaciones por fechas inclusivas; sanciones y llamados de atención con motivo y fechas; historial por funcionario. Los permisos superiores a diez días registran los días adicionales y quién los autorizó. Solo los servicios suman horas trabajadas.

El administrador entra con su clave privada. Generar clave en Personal crea una clave individual de colaborador, visible una sola vez. Entrégala únicamente al titular. Regenerarla invalida la anterior y las sesiones existentes. Las claves no se publican ni se guardan en texto plano en el servidor.

## Colaboradores y alimentos

Cada colaborador ingresa con su documento y clave personal. Solo consulta sus servicios, permisos y vacaciones y reporta su propia salida de permiso. No accede a los datos de otros colaboradores, sanciones ni administración.

Desayuno, almuerzo y comida se reportan para el siguiente día, hasta las 11:59 p. m. del día anterior, hora de Colombia. El servidor valida el día y el cierre; los reportes requieren conexión. Se pueden actualizar hasta cerrar el plazo. Permisos y vacaciones que coincidan con el día bloquean sus alimentos; los pedidos previos dejan de contar si posteriormente se registra la ausencia. Administración muestra totales y funcionarios sin reporte.

## Conservación de registros

Las migraciones agregan campos sin borrar perfiles, títulos, fortalezas ni movimientos existentes. Los nombres anteriores no se dividen automáticamente: al editar, completa los campos separados y la empresa. Los registros administrativos pendientes se conservan en el dispositivo hasta confirmar sincronización.

## Código y publicación

Código completo en `source/`. Compila la interfaz con `pnpm exec vite build --config vite.github.config.ts`; publica `github-dist/` en la raíz, conservando `source/`. GitHub Pages publica main, raíz. El backend independiente atiende `/api/data` y `/api/self` en `https://gestion-de-personal.nelsoncaste86.chatgpt.site`.

El secreto GP_ACCESS_HASH se configura solo en el backend. La API administrativa exige la clave privada y la API personal comprueba sesiones firmadas de 24 horas y la versión vigente de la clave individual. Los intentos de acceso están limitados. Las pruebas de reglas y API están en `tests/personnel-rules.cjs`; usa `node tests/personnel-rules.cjs`.
