# GESTIÓN DE PERSONAL

**[Abrir GESTIÓN DE PERSONAL](https://controlesmineras.github.io/Gestion-de-Personal/)**

Producto independiente de SK-Web y Plaza Blending, con repositorio, backend y base D1 exclusivos. No utiliza el inicio de sesión de ChatGPT.

## Administración

Personal con documento, primer y segundo nombre, primer y segundo apellido, empresa, cargo, teléfono, disponibilidad, títulos y fortalezas individuales. Primer nombre, primer apellido y empresa son obligatorios. Empresa admite solo SK o E-SECURITY; cargo admite solo Director de seguridad, Jefe de seguridad, Supervisor, Escolta, Operador de seguridad y SST.

Servicios con inicio/finalización y horas; permisos y vacaciones por fechas inclusivas; sanciones y llamados de atención con motivo y fechas; historial por funcionario. Los permisos superiores a diez días registran los días adicionales y quién los autorizó. Solo los servicios suman horas trabajadas.

El acceso inicial del titular usa el usuario `admin`. Se permiten varios administradores, cada uno con su documento y contraseña. Al generar enlace se elige Administrador o Usuario laboral; el rol se activa cuando el funcionario confirma su documento y crea su contraseña. Los nuevos administradores pueden entrar desde el ingreso general o desde Administración usando su documento. Los administradores pueden gestionar personal, registros y enlaces; los usuarios laborales solo sus propios registros. El titular elige su contraseña inicial desde el enlace privado de configuración, válido para crearla una sola vez. La contraseña se guarda con salt y PBKDF2; los accesos usan sesiones firmadas de 24 horas. Generar enlace en Personal crea un enlace de activación válido 24 horas y de un solo uso. Copiar enlace permite entregarlo al funcionario, quien confirma su documento y elige su contraseña (8 a 128 caracteres). Regenerar reemplaza el enlace anterior. Los accesos previos siguen funcionando hasta que se activa el nuevo enlace; la activación reemplaza la contraseña e invalida las sesiones anteriores. La contraseña no se muestra al administrador y se guarda con salt y PBKDF2. Los enlaces se almacenan solo como hash. Las claves personales anteriores se conservan hasta la activación.

## Colaboradores y alimentos

Cada colaborador ingresa con su documento y contraseña. Solo consulta sus servicios, permisos y vacaciones y reporta su propia salida de permiso. No accede a los datos de otros colaboradores, sanciones ni administración.

Desayuno, almuerzo y comida se reportan para el siguiente día, hasta las 11:59 p. m. del día anterior, hora de Colombia. El servidor valida el día y el cierre; los reportes requieren conexión. Se pueden actualizar hasta cerrar el plazo. Permisos y vacaciones que coincidan con el día bloquean sus alimentos; los pedidos previos dejan de contar si posteriormente se registra la ausencia. Administración muestra totales y funcionarios sin reporte.

## Conservación de registros

Las migraciones agregan campos sin borrar perfiles, títulos, fortalezas ni movimientos existentes. Los nombres anteriores no se dividen automáticamente: al editar, completa los campos separados y la empresa. Los registros administrativos pendientes se conservan en el dispositivo hasta confirmar sincronización.

## Código y publicación

Código completo en `source/`. Compila la interfaz con `pnpm exec vite build --config vite.github.config.ts`; publica `github-dist/` en la raíz, conservando `source/`. GitHub Pages publica main, raíz. El backend independiente atiende `/api/data` y `/api/self` en `https://gestion-de-personal.nelsoncaste86.chatgpt.site`.

El secreto GP_ACCESS_HASH se configura solo en el backend. La API administrativa exige una sesión válida de admin y la API personal comprueba sesiones firmadas de 24 horas y la versión vigente de la clave individual. Los intentos de acceso están limitados. Las pruebas de reglas y API están en `tests/personnel-rules.cjs`; usa `node tests/personnel-rules.cjs`.

## Fichas y capacitaciones

Tocar una fila de Personal abre la ficha sencilla con nombre completo, documento, empresa, cargo, teléfono, disponibilidad, títulos, capacitaciones, fortalezas, observaciones, contrato y licencias. El historial queda desplegable. Contrato permite fecha de vencimiento o sin vencimiento.

Capacitaciones contiene Seguimiento del personal y Capacitaciones obligatorias. Administración agrega y edita requisitos para todo el personal. La vigencia en meses sugiere la fecha al registrar la obtención (12 meses = un año; 0 = sin vencimiento); la fecha real del certificado puede ajustarse. Los cambios de nombre conservan los certificados relacionados. Licencias de carro y moto siempre son obligatorias; sus categorías y vencimientos se registran según el documento.

El seguimiento muestra Pendiente, Próxima a vencer (hasta 30 días), Vencida y Vigente; filtra por funcionario, requisito y estado y excluye inactivos. Pendiente incluye ausencia de certificado o de fecha de vigencia. Se conservan títulos anteriores y datos al actualizar desde clientes antiguos. Usuarios laborales consultan su propia ficha y requisitos sin editar ni ver fichas ajenas.

## Carga y descanso

Inicio y fichas muestran horas efectivamente trabajadas en las últimas 24 horas móviles, horas desde el último servicio y alertas de sobrecarga/descanso pendiente. Solo cuentan servicios transcurridos, incluidos los activos; se excluyen permisos, vacaciones y servicios futuros y se unen intervalos superpuestos para evitar duplicar horas.

Después de finalizar un servicio, Disponible/Descanso pasa automáticamente a En descanso hasta cumplir el descanso configurado; luego vuelve a Disponible. Inactivo, No disponible, permisos y vacaciones conservan sus restricciones. Las alertas apoyan la decisión de asignación y no bloquean el registro. “Listos para asignar” excluye personal en descanso, ocupado, ausente o con sobrecarga.

Administración ajusta Carga y descanso para toda la app. Valores iniciales editables: 8 h mínimas de descanso y alerta desde 12 h trabajadas en 24 h. Los cambios se sincronizan entre dispositivos. En Servicios se muestra la carga actual del funcionario seleccionado; al reportar una finalización real se actualiza el cómputo con la fecha/hora registrada.

En Acciones de Personal solo aparece Dar acceso. Editar ficha sigue disponible dentro de la tarjeta.

## Registro disciplinario e historial de cambios

Sanciones y llamados de atención se consultan y registran desde la ficha del funcionario. El formulario fija el funcionario seleccionado; el servidor impide trasladar un registro existente a otra persona. El lápiz de edición queda arriba a la derecha de la ficha.

Historial de cambios muestra los últimos 500 cambios administrativos con fecha/hora de Colombia, funcionario, administrador autenticado y valores antes/después. El servidor toma la identidad de la sesión; la cuenta principal figura como admin. Las escrituras de datos y su auditoría se guardan en un lote atómico; un identificador persistido con cada operación evita repetir un cambio confirmado al reintentar. No se registran contraseñas ni tokens de enlace. El historial comienza desde esta versión; no se reconstruye autoría anterior.

## Preparación de alimentos

El cargo Preparación de alimentos tiene una pestaña administrativa aparte; al agregar desde esa pestaña se selecciona ese cargo. Se da acceso por enlace como a los demás usuarios laborales. Al ingresar, el personal con ese cargo ve cantidades de desayunos, almuerzos y comidas y los nombres completos de quienes los solicitaron por fecha, con actualización automática cada minuto. Conserva sus reportes personales. `/api/kitchen` comprueba la sesión y el cargo vigente; solo expone nombres, empresa y selección de alimentos, sin documentos, observaciones, contratos ni registros disciplinarios. Usuarios laborales de otros cargos no acceden a esa consulta.

Permiso extraordinario por calamidad se puede seleccionar en Disponibilidad, conserva la restricción al asignar servicios y excluye al funcionario de los alimentos mientras tenga ese estado.

Las licencias de conducción de carro y moto no se exigen al cargo Preparación de alimentos: se excluyen del formulario, la ficha y el seguimiento de requisitos para ese cargo. Al cambiar de cargo se conservan los certificados ya registrados. El curso de manipulación de alimentos queda pendiente de una futura decisión; no se crea ni exige todavía.

Las pestañas del personal son SEGURIDAD y COCINA. Permisos y vacaciones se consultan, agregan y editan desde la ficha del funcionario; el formulario fija su identidad. Los filtros de disponibilidad siguen incluyendo De permiso y De vacaciones. Cada registro del historial destaca el administrador y su documento; la cuenta principal aparece como admin.
