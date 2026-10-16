# ClaimGuard: guía para explicarlo en una entrevista

## Qué es Apex

Apex es el lenguaje del servidor de Salesforce. Su sintaxis se parece a Java, pero trabaja dentro de Salesforce con sus objetos, consultas SOQL, permisos y límites de recursos. Salesforce aloja y ejecuta el código. Oracle APEX es otra tecnología: una plataforma para construir aplicaciones sobre Oracle Database.

El anuncio proporcionado no identifica cuál de las dos tecnologías usa el empleador. La expresión «lenguaje de programación APEX» motivó elegir Salesforce, pero hay que confirmarlo con reclutamiento. Saber Oracle SQL o Java facilita partes del aprendizaje, pero no equivale a tener experiencia profesional con Apex.

## Presentación de 45 segundos

Usa esta versión mientras todavía falta validar el proyecto en Salesforce:

> Estoy trabajando en ClaimGuard, un proyecto de portafolio en Salesforce Apex para gestionar reclamos bancarios. Incluye una API con reintentos idempotentes, reglas de prioridad, un flujo de investigación y auditoría. El código y los componentes pasan las comprobaciones locales; mi siguiente hito es ejecutar las pruebas y validar el despliegue en una organización de desarrollo. Lo preparé con asistencia de IA y estoy revisando y aprendiendo sus decisiones técnicas.

Después de desplegarlo, ejecutar las pruebas y poder explicarlo con tus palabras:

> Desarrollé y validé un proyecto de portafolio en Salesforce Apex para gestionar reclamos bancarios. La solución evita duplicados cuando una integración reintenta una solicitud, calcula prioridades y vencimientos, y exige justificar cada cierre. Diseñé el flujo para respetar permisos por registro y procesar colecciones sin consultas dentro de ciclos. Utilicé asistencia de IA y verifiqué la implementación en una organización de desarrollo.

No uses «desarrollé y validé» hasta que hayas hecho esa validación. Personaliza «diseñé» o cualquier afirmación de autoría según las decisiones que realmente hayas revisado y comprendido.

## Dónde está el impacto

| Problema operativo | Resultado que el proyecto busca demostrar | Cómo comprobarlo |
| --- | --- | --- |
| Un canal reintenta una solicitud | Se mantiene un solo reclamo y un solo evento inicial | Enviar el mismo cuerpo y clave dos veces; comparar ID y conteo |
| Se cierra un reclamo sin investigación | La transición se rechaza y el registro conserva su estado | Intentar New → Resolved |
| Dos agentes trabajan con una pantalla desactualizada | El segundo cambio no sobrescribe un estado más reciente | Enviar expectedStatus antiguo |
| Se cambia el monto original de un reclamo | La modificación se rechaza | Editar Amount después de crear |
| Los vencimientos requieren revisión manual | El batch detecta vencidos abiertos y registra una escalación única | Ejecutar pruebas de tiempo y batch en Salesforce |
| Una importación contiene 200 reclamos | Se procesan como colección con uso constante de sentencias en el trigger | Ejecutar la prueba bulk y revisar sus aserciones |
| Un agente intenta consultar información de otro | El registro privado y su auditoría no aparecen | Ejecutar pruebas con usuarios pares |

Esto demuestra capacidades técnicas y valor operativo potencial. No permite afirmar ahorros económicos, clientes atendidos, uso por un banco o una mejora porcentual real sin haberlos medido.

## Demostración de cinco minutos

1. **Problema, 30 segundos.** «Quise que una solicitud duplicada o un vencimiento no quedaran escondidos en un proceso manual».
2. **Consola, 60 segundos.** Crea un reclamo sintético Unauthorized. Explica por qué recibe prioridad Critical y cuatro horas de plazo. No lo presentes como una predicción de fraude.
3. **Flujo y auditoría, 60 segundos.** Inicia la revisión, intenta cerrar con una justificación corta y corrígela. Muestra eventos de creación y cambio de estado.
4. **API, 60 segundos.** Ejecuta Create, Replay y Conflict en Postman. Explica por qué una clave única en base de datos también protege una carrera entre solicitudes simultáneas.
5. **Pruebas y decisiones, 90 segundos.** Muestra el resultado real de Salesforce. Explica permisos, 200 registros, rollback y reconsulta con bloqueo del batch. Indica las limitaciones pendientes.

## Preguntas que debes poder responder

**¿Por qué no es suficiente with sharing?**

Porque controla el acceso por registro. El acceso al objeto y a sus campos también se debe aplicar. Por eso la API y el controlador usan operaciones explícitas en modo usuario.

**¿Qué es un governor limit y cómo lo manejas?**

Salesforce limita recursos por transacción en su plataforma compartida. El trigger acumula eventos y hace una sola inserción de auditoría por ejecución. No consulta ni escribe una vez por cada reclamo. Los valores máximos dependen del contexto; explica la estrategia y muestra las métricas reales de la prueba.

**¿Por qué revisas la clave y además la haces única?**

La consulta permite devolver la respuesta original en un reintento. El índice único protege la carrera en que dos solicitudes consultan antes de que alguna haya insertado. Si la carrera termina en colisión, se devuelve conflicto y el cliente puede reintentar.

**¿Se bloquean todos los duplicados de una transacción?**

No. Se evita repetir la misma solicitud cuando conserva su clave. Dos claves diferentes pueden representar la misma transacción. Detectar esos duplicados exige una regla de negocio adicional.

**¿Qué pasa si otro usuario ya tiene esa clave?**

El registro no se devuelve si está fuera del alcance del usuario. El índice impide crear otro y la API devuelve un conflicto genérico, sin revelar su identificador.

**¿Por qué el batch vuelve a consultar?**

Porque el reclamo pudo cerrarse después de seleccionar candidatos. La segunda consulta bloquea la fila y comprueba su estado actual antes de escalarla. También impide registrar dos veces la misma escalación.

**¿La auditoría es inviolable?**

La aplicación impide que sus usuarios modifiquen los eventos. Un administrador con control del código y de la organización sigue dentro del límite de confianza. Un banco real necesitaría evaluar una exportación a un sistema independiente con la retención apropiada.

**¿Por qué usaste objetos propios y no Case?**

Para ofrecer un paquete de portafolio autónomo sin depender del modelo Service Cloud de una empresa. En un proyecto real primero evaluaría Case, Entitlements y la plataforma existente.

**¿Qué mejorarías después?**

Configuración aprobada de políticas, días y horas hábiles, asignación al equipo adecuado, alertas, paginación, exportación de auditoría y medición con datos sintéticos representativos. No implementaría todo sin conocer los requisitos.

## Medición honesta

La prueba de 200 registros contiene aserciones de 0 consultas SOQL en el trigger y 2 sentencias DML en total, incluida la inserción que inicia el flujo. Hasta ejecutarla en Salesforce, es un objetivo comprobable escrito en el código, no un resultado observado. La cobertura porcentual también está pendiente.

Una vez ejecutado, registra el test-run ID, cantidad de pruebas aprobadas, cobertura por clase y métricas obtenidas. Si comparas tiempos manuales y automáticos, define antes el mismo conjunto de tareas, registra varias repeticiones y aclara que es un experimento de portafolio.

## Texto para el CV

Después de validar y comprender el proyecto, una descripción posible es:

**ClaimGuard — Salesforce Apex, SOQL y Lightning Web Components**

Proyecto de portafolio para gestión de reclamos bancarios: API con idempotencia, reglas de prioridad y vencimiento, flujo de investigación, auditoría y Batch Apex. Implementación de acceso por registro y campos; pruebas de permisos, concurrencia lógica y procesamiento de 200 registros.

Añade «30 pruebas ejecutadas» o una cobertura concreta únicamente cuando tengas los resultados. Presenta Apex como habilidad de proyecto o formación práctica; este trabajo no sustituye un año de experiencia laboral exigido por una vacante.
