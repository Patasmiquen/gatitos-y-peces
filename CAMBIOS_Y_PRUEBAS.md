# Correcciones y verificación — v.144

Fecha: 18/09/2026.

Se ha trabajado sobre una copia. Se conservan los recursos originales, controles principales, contenidos, catálogo de mejoras/fusiones y diseño del juego. No se ha publicado ninguna versión ni escrito puntuaciones en el Firebase real.

## Correcciones aplicadas

1. **Logros de fusiones:** las parejas diferentes se registran de forma persistente entre partidas. Las fusiones maximizadas también. No se cuentan dos veces las nuevas parejas repetidas, ni se confunde una fusión recién creada con una fusión maximizada.
2. **Compatibilidad del progreso:** se mantienen estadísticas y fases de logros anteriores, cosméticos válidos, selección, nombre, récord, escamas y ajustes. Como la versión anterior no almacenaba las identidades de las fusiones históricas, sus contadores se conservan como crédito inicial; desde esta versión las parejas nuevas sí quedan identificadas. No es posible reconstruir identidades que nunca se guardaron, y una pareja antigua podría contarse de nuevo la primera vez que se registre en esta versión.
3. **Recompensas:** las subidas de nivel y el gato arcoíris usan una cola; ambas elecciones se entregan cuando coinciden. La recompensa del cuarto jefe se resuelve antes de mostrar la victoria.
4. **Muerte y reinicio:** terminar una partida interrumpe inmediatamente la actualización. No se recoge curación ni se vuelve a finalizar en ese mismo paso. Reiniciar limpia pausa, objetivo seleccionado, entradas, efectos y colas.
5. **Guardado resistente:** validación de datos y tipos, números válidos y cosméticos poseídos. Si el navegador bloquea el almacenamiento, se puede jugar con progreso temporal y aparece un aviso. Los logros se guardan agrupando cambios y al terminar/ocultar la página.
6. **Música:** pausa y reanudación coherentes en mejoras, tienda y pausa; recuperación de la música de rondas tras los jefes. Se cancelan fundidos anteriores para evitar conflictos.
7. **Ratón y teclado:** el clic derecho selecciona objetivo sin activar disparo sostenido. Soltarlo no cancela el botón izquierdo. La repetición de la barra espaciadora no alterna continuamente la pausa. Perder foco pausa una partida activa y limpia las teclas.
8. **Resultados:** las victorias también actualizan logros de puntuación y ronda. Al continuar se concede el incremento de escamas que corresponda, manteniendo el límite total de 150 por partida.
9. **Pausa y tiempo:** las protecciones, cadencias, Zoomies y ráfagas del pato utilizan tiempo de simulación. Los temporizadores jugables no avanzan al pausar. Las ráfagas pendientes pertenecen al jefe que las genera.
10. **Daño real:** las estadísticas distinguen los golpes bloqueados de la vida realmente perdida; las recomendaciones dejan de contar daño evitado por invulnerabilidad.
11. **Modo infinito:** las rondas limpias cuentan para las rachas sin daño.
12. **Rendimiento y consistencia:** simulación a pasos fijos de 60 Hz y menor reconstrucción/guardado de logros durante combate. Se conserva un límite de recuperación de tiempo tras bloqueos largos para evitar espirales de procesamiento.
13. **Ranking y arranque:** Firebase se carga como dependencia opcional; un fallo de su CDN no bloquea el juego. Las consultas usan páginas de 100 resultados y un botón para cargar más, en lugar de descargar toda la colección. Se descartan respuestas antiguas de consultas superpuestas. La versión de puntuación se actualiza a v.144.
14. **Otros casos encontrados:** resolución de la muerte de la foca por su propio daño; protección frente a doble eliminación de orbes; mensaje de lata solo cuando aparece una; callbacks antiguos aislados tras reiniciar; foco visible y activación por teclado en tarjetas de pausa/ranking.
15. **Documentación y carga:** notas v.144, versión centralizada y URLs estables de scripts. Se aclara que el piloto automático histórico está desactivado en esta edición.

## Pruebas ejecutadas

**24/24 regresiones de lógica superadas**, con Node y un entorno controlado de DOM/audio/almacenamiento:

- Creación y maximización de las 95 fusiones: costes correctos y estadísticas numéricas finitas.
- Progreso entre partidas y migración de guardados antiguos.
- Datos corruptos y almacenamiento bloqueado.
- Recompensas simultáneas, varias subidas y cambio de ronda.
- Cuatro jefes, cuarto jefe con victoria, final de progresión e infinito.
- Muerte durante un paso con una curación coincidente y protección del perro.
- Daño bloqueado/reducido, ratón, música y protecciones durante la pausa.
- Resultados de victoria, escamas incrementales y rachas en infinito.
- Reducción de escrituras por disparo.
- Movimiento equivalente durante diez segundos a 30, 60 y 120 fotogramas de render por segundo.

**22/22 comprobaciones de navegador superadas**, usando Chromium 153.0.8010.0 en modo headless:

- Inicio, validación del nombre y cuatro desplegables.
- Movimiento y disparo con eventos reales de teclado y ratón.
- Pausa, reanudación y reproducción de las pistas mediante las API reales de audio del navegador.
- Dos elecciones reales de tarjetas al coincidir gato arcoíris y subida de nivel.
- Aparición, actividad y derrota controlada de los cuatro jefes; recompensa, tienda y retorno de la música.
- Compra y fusión mediante el menú de dos pasos.
- Recompensa del cuarto jefe antes de la victoria, continuación, Game Over, reinicio y menú.
- Cosméticos, logros, nombre y volumen después de recargar.
- Uso del menú a 800×600, 1366×768 y 1920×1080.
- Recuperación con datos corruptos y con acceso a Storage bloqueado.
- Recorrido acelerado de 18.000 iteraciones, con invulnerabilidad controlada para mantenerlo en marcha y render periódico.
- Paginación con 230 puntuaciones y envío de una puntuación contra un backend simulado dentro del navegador; no contra Firebase real.
- Compra final de la tienda que abre la pantalla de juego completado.
- Ausencia de errores JavaScript no capturados y de errores recuperados registrados por el juego.

En el primer recorrido de navegador hubo dos timeouts de automatización: una captura de pantalla y una interacción después del cambio de resolución. Esos recorridos se repitieron de forma aislada y pasaron. Los resultados finales por comprobación figuran en `verificacion/browser-results.json`.

También se ha inspeccionado visualmente el menú y la partida mediante capturas. El navegador de pruebas no tiene la misma colección de fuentes emoji que Windows, por lo que no se usa esa diferencia de fuentes para modificar el arte del juego. La comprobación del audio verifica reproducción, tiempo y estados; no es una escucha humana ni una valoración de mezcla.

## Límites de esta entrega

- Las pruebas controladas y aceleradas comprueban errores y transiciones; no certifican el equilibrio de dificultad ni sustituyen todas las combinaciones posibles durante una partida humana larga.
- Se ha ejecutado Chromium. No se han certificado Firefox, Safari, móviles ni el iframe real de itch.io.
- El juego sigue orientado a teclado y ratón; no se han añadido controles táctiles.
- Se conservan los límites existentes de enemigos/proyectiles/objetos para no cambiar el diseño de saturación de la partida. No se ha realizado una reestructuración completa del archivo de juego ni del CSS.
- La seguridad y permisos del ranking real dependen de las reglas de Firebase y de su backend. El ZIP no contiene esas reglas. El cliente sigue calculando puntuaciones y usando nombres libres; este parche no convierte el ranking en un sistema protegido contra trampas. Se ha mantenido su configuración para conservar la integración existente.
- No se puede garantizar que nunca quede otro fallo: esta entrega incluye las correcciones descritas y evidencia reproducible de sus pruebas.

## Repetir las pruebas (opcional)

Con Node instalado, desde la raíz del juego:

```sh
node verificacion/regression.cjs
```

Las pruebas de navegador requieren Playwright y Chromium. Una vez instalados, se ejecutan con:

```sh
node verificacion/browser-tests.cjs
```

Puede indicarse la ruta de un Chromium ya instalado mediante la variable `BROWSER_EXECUTABLE`. El script levanta un servidor local temporal en el puerto 8765 y bloquea todas las peticiones externas. Los estados de prueba y el backend simulado son locales a esa ejecución.
