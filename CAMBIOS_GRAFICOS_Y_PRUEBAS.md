# Gatitos & Peces — edición gráfica v.145

Esta edición parte de la versión corregida v.144. El README y los dos archivos de música se conservan byte por byte. Las reglas, precios, colisiones, controles y claves del progreso guardado se mantienen.

## Cambios aplicados

- Jugador y enemigos con cabeza gatuna, orejas, mejillas y contornos nuevos. La patita sigue apuntando y retrocediendo al disparar. Se conservan las expresiones y accesorios de los enemigos especiales.
- Peces con silueta y aletas más cuidadas. Los colores de críticos, bumerán, escudo y peces especiales siguen indicando sus estados. El escudo utiliza el nuevo dibujo y los accesorios de pez equipados.
- Skins con miniaturas dibujadas por las mismas funciones de la partida: 18 cosméticos y 7 aspectos normales. Se incluye también la categoría del jefe gato gigante. Sombrero ajustado, pajaritas sobre el nuevo personaje, cubos con borde suavizado y capa del demonio más visible.
- Los jefes conservan sus diseños reconocibles; se moderan algunos resplandores. No se sustituyen sus estados ni ataques.
- Menús y tarjetas con bordes y sombras más discretos, tipografía Nunito incluida, título ilustrado y HUD más compacto. Los niveles, fusiones, mejoras únicas, bloqueos y recomendaciones conservan sus clases visuales y colores. Se mantienen los temas claro y oscuro.
- Fondo violeta con peces y corazones animados, incluido el pez gigante ocasional. Menos puntos luminosos. Los degradados estáticos se guardan en una imagen interna que se recalcula al cambiar la resolución.
- Vida flotante junto al jugador conservada: se oculta con vida completa y mantiene los colores de aviso. Se conservan señales de daño, invulnerabilidad y objetivo fijado.
- Fuente local de respaldo para sistemas sin emojis. En esos sistemas algunos iconos aparecen en línea monocroma. Licencias de las fuentes incluidas en fonts/.

## Verificación de esta entrega

- 24/24 pruebas de regresión lógica: incluyen las 95 fusiones, recompensas, guardado, pausa, reinicio, muerte, victorias y tiempo de simulación.
- 19/19 pruebas funcionales en Chromium 153: teclado y ratón, música, menús, cuatro jefes, compras y fusión con clics, victoria/continuación, guardado tras recargar y ventanas de 800×600, 1366×768 y 1920×1080.
- Simulación acelerada de aproximadamente cinco minutos con protección de prueba; no equivale a una partida humana completa ni a una evaluación del equilibrio.
- Renderizado de las 18 skins y 25 miniaturas. Comprobación de que dibujar miniaturas no cambia el estado del juego. Renderizado de daño, estrella y Siete vidas, con modo ligero activado y desactivado.
- Prueba de dibujo con 100 enemigos y 180 peces. Su tiempo en un navegador de pruebas no permite garantizar una tasa de imágenes concreta en cualquier ordenador.
- Revisión de capturas reales del menú, partida, tienda clara/oscura, catálogo y jefe. Algunas primeras capturas agotaron el tiempo del automatizador; se repitieron usando captura directa y renderizado por software. No aparecieron excepciones del juego en las ejecuciones finales.

El ranking externo no se ha validado contra Firebase real en esta revisión gráfica. Las pruebas bloquean las conexiones externas para no publicar puntuaciones de prueba. Tampoco se ha probado esta edición dentro del iframe real de itch.io, en Safari/Firefox ni en móviles.

## Abrir y comprobar

Descomprime el ZIP completo; no separes index.html de sus recursos. Puedes abrir index.html en un navegador de escritorio. Para una prueba mediante servidor local, desde la carpeta del juego ejecuta `python -m http.server 8000` y abre http://localhost:8000.

El ZIP tiene index.html en la raíz, preparado para una subida HTML5. Mantener el mismo sitio y navegador conserva el acceso al progreso local; cambiar de dominio, puerto o navegador usa otro almacenamiento.

Las capturas de verificación están en verificacion/capturas/. Para repetir las pruebas lógicas: `node verificacion/regression.cjs`. Las pruebas de navegador requieren Node, Playwright y Chromium: `node verificacion/browser-tests.cjs`. Se puede indicar otro ejecutable con BROWSER_EXECUTABLE. `verificacion/visual-tests.cjs` reproduce los escenarios visuales preparados; sus posiciones y niveles se controlan para poder inspeccionarlos.

CAMBIOS_Y_PRUEBAS.md conserva el historial técnico de v.144. Los resultados JSON en verificacion/ corresponden a esta edición.
