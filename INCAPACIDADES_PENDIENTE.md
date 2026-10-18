# Incorporación de incapacidades: preparada, sin publicar

Esta rama agrega Incapacidad como un periodo fechado, con registro desde la ficha por un administrador, filtro Incapacitados, regreso previsto y conservación del historial. SEGURIDAD consulta su propio registro. La ausencia excluye servicios simultáneos, horas trabajadas y alimentos, siguiendo el comportamiento de los demás periodos de ausencia.

Antes de publicar esta rama en GitHub Pages, debe actualizarse el servidor del proyecto appgprj_6ac2756ee88481919a7e0a716d2124ba (https://gestion-de-personal.nelsoncaste86.chatgpt.site) con el mismo código de source. No se requiere migrar ni eliminar datos: events.kind y people.status ya son columnas de texto. El servidor publicado actualmente rechaza Incapacidad y no debe activarse el formulario hasta actualizarlo.

Pendiente por indisponibilidad del entorno de ejecución para abrir/sincronizar el repositorio fuente de Sites. Las credenciales temporales no forman parte del código ni de esta rama.

Validación: node tests/incapacity.cjs, node tests/absence-return.cjs, node tests/workload.cjs y las pruebas existentes de permisos y acceso.
