window.PATCH_NOTES = [
{"version":"v.204","date":"02/10/2026","title":"Terminología unificada de mejoras máximas","changes":["Todas las mejoras normales que alcanzan su nivel máximo muestran DEFINITIVA, tanto en las subidas de nivel normales como mediante Voluntad Oscura.","Las combinaciones mantienen el término FUSIÓN; no se modifican niveles, estadísticas, costes ni mecánicas."]},
{"version":"v.203","date":"02/10/2026","title":"Límite de disparos manuales entre Bloquitos","changes":["Máximo de 100 disparos manuales mientras Bloquito se recarga; los intentos adicionales no generan proyectiles.","Al lanzar un Bloquito completamente cargado, el límite se reinicia y vuelven a estar disponibles otros 100 disparos manuales.","Bloquito puede lanzarse siempre que esté cargado, incluso al alcanzar el límite; el contador de disparos permanece oculto.","El disparo automático normal y las demás mecánicas se mantienen sin cambios."]},
{"version":"v.202","date":"02/10/2026","title":"Pausa compacta y fusiones recomendadas primero","changes":["La pausa muestra cuatro tarjetas por fila en pantallas amplias y se adapta a tres, dos o una columna según el espacio disponible.","Continuar aparece arriba a la izquierda y Acabar aquí, Reiniciar y Volver al menú se agrupan en un desplegable superior derecho.","Las fusiones recomendadas se ordenan primero por puntuación tanto al elegir la primera mejora como al elegir su pareja, antes de aplicar la paginación de nueve tarjetas.","No se modifican la lógica de las recomendaciones, los costes, las fusiones ni las mecánicas de la partida."]},
{"version":"v.201","date":"02/10/2026","title":"Descripciones claras y coherentes","changes":["Reescritas las descripciones de 22 mejoras normales, 6 mejoras únicas y 107 fusiones: efecto principal en una o dos frases y condiciones relevantes sin párrafos redundantes.","Las tarjetas muestran los efectos sin repetir precios, niveles ni requisitos ya visibles; se elimina el bloque automático de bonus y el duplicado de precio en la elección de fusiones.","Menú de pausa: explicación breve al frente y valores actuales en el reverso, sin repetir niveles ni estados que ya aparecen en la tarjeta.","Unificadas las descripciones de mejoras únicas entre subida de nivel, tienda, gato arcoíris y pausa; ningún cambio de daño, probabilidades, economía ni desbloqueos."]},
{"version":"v.200","date":"02/10/2026","title":"Cosméticos y cohesión visual","changes":["Tres nuevos packs temáticos con ocho skins cada uno: Pirata, Bioluminiscente y Celestial. Los 24 diseños incorporan detalles dibujados sobre los personajes, adaptados a sus siluetas.","El pulpo pirata lleva parche, sombrero y detalles marineros; el bioluminiscente muestra marcas luminosas en cabeza y tentáculos.","Tienda con filtros Todas, Compradas y Por desbloquear, y galerías de los ocho personajes de cada pack antes de comprar.","Precios de packs descontados únicamente sobre las skins que faltan; conservadas las compras y selecciones anteriores.","Lenguaje visual unificado entre inicio, cosméticos y pausa; botones con foco visible, jerarquía de acciones y diseños adaptables.","Dibujos adicionales mediante Canvas sin alterar los archivos de imagen originales, la física ni el funcionamiento de las mejoras."]},

{"version":"v.199","date":"02/10/2026","title":"Fusiones, recompensas y modo infinito","changes":["Retorno crítico añade una onda dorada controlada al impactar con peces críticos y boomerang, con límite de tres enemigos y enfriamiento de 0,55 segundos.","Salmuera helada transmite un efecto salino debilitado a un máximo de tres gatos cercanos al morir el objetivo; los contagios no vuelven a propagarse.","Cada uno de los cinco jefes concede un cofre temático con monedas y una bonificación temporal de 20 segundos de juego.","Tres variantes de ronda en el modo infinito: invasión de gatos normales, gatos veloces con menos vida y rondas con más enemigos especiales. Se respetan rondas de jefe y avalanchas.","Tres nuevos desafíos persistentes: jefes sin recibir daño, bajas por sal y apariciones del Leviatán.","Reducidos los efectos simultáneos del Leviatán para mejorar la claridad y el rendimiento en rondas avanzadas.","Actualizadas las descripciones de Retorno crítico y Salmuera helada; conservados tienda, gato arcoíris, menús, IA y recursos originales."]},

{"version":"v.198","date":"01/10/2026","title":"Leviatán más expresivo","changes":["Redibujado EL GRAN PEZ con cuerpo morado sombreado, silueta más agresiva, pinchos superiores e inferiores y aletas definidas.","Boca abierta mucho más visible, mandíbula inferior separada, dientes grandes y ojo amarillo con ceja inclinada para reforzar su expresión enfadada.","Se mantienen intactos su tamaño, duración, velocidad, probabilidad de aparición, daño y comportamiento. No depende de la skin equipada."]},
{"version":"v.197","date":"01/10/2026","title":"Escamas saladas y nuevas fusiones","changes":["Eliminada Patita automática, sus fusiones, sus estados especiales y todas sus referencias en la IA, la tienda, las subidas de nivel y la interfaz.","Patita nerviosa aumenta ahora la cadencia un 19 % por nivel, con límite de +145 % al completar su progresión fusionada.","Nueva mejora Escamas saladas (5 niveles): cada pez que impacta deja daño continuo durante 2,4 segundos; nuevos impactos renuevan el efecto sin acumularlo.","Añadidas seis fusiones de Escamas saladas con Mimos potentes, Patita nerviosa, Pez boomerang, Arena fresquita, Besito vampiro y Metralladora gatuna; cada una tiene un efecto específico y progresión compatible con el sistema de fusiones.","Integrados el daño continuo, las bajas, los jefes, las recompensas, la tienda, el gato arcoíris, la IA automática, las recomendaciones y el panel de pausa; sin cambiar el resto de mecánicas."]},

{"version":"v.196","date":"30/09/2026","title":"Retirada del gato estudioso","changes":["El gato estudioso se elimina completamente del juego por no aportar suficiente valor jugable.","Retirados su porcentaje de aparición, escalado, estados de estudio, daño especial, recompensa adicional, dibujo, indicadores y prioridades específicas de la IA.","Su probabilidad no se reasigna a otro enemigo especial: ese espacio vuelve a ser una aparición normal, evitando introducir un cambio de dificultad oculto al retirar el enemigo.","Limpiadas las propiedades y referencias residuales asociadas al antiguo tipo de enemigo."]},

{"version":"v.195","date":"30/09/2026","title":"Filtros de la sardina","changes":["Corregidos los filtros rojo, verde y amarillo de la sardina realista: el color se aplica únicamente sobre los píxeles visibles del pez y nunca sobre el rectángulo transparente que ocupa la imagen.","El tintado se genera en una superficie transparente independiente y se reutiliza en caché, evitando que la composición tome como máscara el fondo del juego.","El brillo de los estados especiales sigue la silueta del pez y ya no crea una caja rectangular de color."]},

{"version":"v.194","date":"30/09/2026","title":"Contacto y demonio","changes":["El propio gato hace ahora una cantidad pequeña de daño corporal al permanecer en contacto con enemigos y jefes.","Si el jugador está dentro del demonio cuando nace Círculo oscuro, su daño corporal rompe inmediatamente las bolas normales que aparecen sobre él. Las reforzadas pierden una capa y reciben una breve protección de contacto para poder salir del cuerpo del jugador.","Los impactos de varias bolas del demonio en el mismo instante quedan separados por una ventana mínima de 0,18 s, evitando acumulaciones de daño de un único frame.","Al morir, el HUD se actualiza inmediatamente a 0 de vida antes de abrir la pantalla de derrota, evitando que la barra roja quede visualmente llena."]},

{"version":"v.193","date":"29/09/2026","title":"Limpieza interna del código","changes":["Eliminados los comentarios de desarrollo no funcionales de game.js y style.css para reducir ruido y líneas sin alterar ninguna mecánica.","Se conserva el formato legible del código y no se ha minificado, facilitando futuras modificaciones sin cargar el proyecto con anotaciones históricas."]},

{"version":"v.192","date":"29/09/2026","title":"Indicadores simplificados","changes":["Toda opción sugerida utiliza una única señal visual: el pequeño círculo con 👍 en la esquina del botón de acción. Se eliminan los estilos heredados de antiguas etiquetas y textos de recomendación.","El mensaje Modo ligero activo se elimina por completo de la interfaz, junto con su elemento, estilos y temporizador visual. El modo ligero continúa funcionando internamente cuando el rendimiento lo requiere."]},

{"version":"v.191","date":"29/09/2026","title":"Recomendación visual unificada","changes":["Eliminadas las variantes visibles RECOMENDADO, MEJOR ENCAJE y BUENA OPCIÓN, junto con sus textos explicativos en las tarjetas.","Toda recomendación se representa ahora de una única forma: un pequeño círculo con 👍 en la esquina superior derecha del botón de acción de la mejora o fusión.","La tarjeta completa ya no cambia de borde o brillo por estar recomendada; el círculo del botón es el único indicador visual.","La lógica interna que decide qué opciones encajan mejor con la partida se conserva."]},

{"version":"v.190","date":"29/09/2026","title":"Auditoría integral de estabilidad","changes":["Revisados de extremo a extremo los sistemas de partida, oleadas, cinco jefes, IA, proyectiles, colisiones, fusiones, recomendaciones, cosméticos, guardado, ranking, HUD, audio y rendimiento.","Corregido el panel de objetivos: su función existía pero nunca se ejecutaba, por lo que el texto podía quedarse congelado. Ahora se actualiza solo cuando cambia el estado relevante.","Las recomendaciones ya no desaparecen en tienda o fusiones cuando sí existen opciones válidas: si no hay una ventaja clara, se muestra MEJOR ENCAJE en vez de fingir una recomendación fuerte.","Corregida la avalancha garantizada posterior a cada jefe: vuelve a aplicarse en 6, 11, 16, 21, 26... como indicaba la propia regla del juego, sin reactivarse después de terminar.","La skin Low Poly respeta ahora el amarillo del escudo a nivel alto, igual que el aspecto normal y la Sardina realista.","Normalizado el estado interno de guardado de victoria para evitar mezclar booleanos y claves de puntuación; robustecido Firebase para no depender de variables globales implícitas.","El aviso Modo ligero activo vuelve a mostrarse brevemente cuando el juego entra realmente en modo de rendimiento reducido.","Actualizados los cache-busters de JavaScript y CSS a v190 para evitar cargar recursos antiguos tras actualizar el ZIP."]},

{"version":"v.189","date":"29/09/2026","title":"Corrección de Sardina realista en partida","changes":["Corregido el render de la Sardina realista: el juego seguía intentando recortar el nuevo PNG transparente con coordenadas pertenecientes a la antigua fotografía, por lo que durante la partida solo se veía una mancha/óvalo con borde.","La sardina se dibuja ahora directamente desde el PNG completo, respetando su transparencia, proporción y orientación hacia la derecha.","Eliminado el contorno elíptico artificial. Los filtros rojo, verde y amarillo se aplican únicamente sobre los píxeles visibles de la sardina."]},

{"version":"v.188","date":"29/09/2026","title":"Escala de Sardina realista","changes":["Reducido y centrado el icono fotográfico de Peces · Sardina realista para que tenga una escala visual equivalente a las demás skins de peces en la tienda, manteniendo intacta la fotografía y su proporción."]},

{"version":"v.187","date":"29/09/2026","title":"Sardina realista integrada","changes":["La imagen de la sardina realista está ahora incluida físicamente dentro del juego como assets/sardina-realista.png, con fondo transparente y mirando hacia la derecha.","La skin, su icono y sus variantes de color ya no dependen de Wikimedia ni de una conexión a Internet.","Se mantienen los filtros rojo para crítico, verde para boomerang y amarillo para Retorno crítico y los pececitos amarillos del escudo."]},

{"version":"v.186","date":"29/09/2026","title":"Icono fotográfico de la sardina","changes":["La skin Peces · Sardina realista muestra ahora como icono de la tienda la fotografía original de Sardina pilchardus utilizada por la propia skin, en lugar de una previsualización dibujada o un emoji."]},

{"version":"v.185","date":"29/09/2026","title":"Rastro de Bloquito más legible","changes":["Aumentada notablemente la separación entre los peces del rastro de Bloquito: pasan de estar separados aproximadamente 17–29 px a 42–58 px.","Cada silueta se distingue ahora individualmente sin formar una masa continua; duración, ralentización y área efectiva del rastro no cambian."]},

{"version":"v.184.10","date":"29/09/2026","title":"Sardina realista","changes":["Añadida la skin Peces · Sardina realista, manteniendo la silueta lateral y la orientación de disparo hacia la derecha.","La sardina realista recibe filtro rojo al ser crítica, verde al ser boomerang y amarillo cuando Retorno crítico combina ambas propiedades.","Los pececitos del escudo con su nivel amarillo también aplican el mismo filtro amarillo cuando está equipada la sardina realista.","La skin conserva estos filtros en Bloquito y en los demás proyectiles que heredan crítico, boomerang o disparo de escudo."]},

{"version":"v.184.9","date":"29/09/2026","title":"IA: residuales tácticos","changes":["La IA deja de disparar residuales de Bloquito continuamente: ahora evalúa distancia, presión de enemigos, amenazas especiales, proyectiles peligrosos, vida restante y situación del jefe.","Límite exclusivo para la IA de 2 residuales por segundo como máximo; normalmente usa entre 0,8 y 1,4 por segundo cuando realmente hacen falta.","Un jefe aislado ya no provoca spam de residuales. Se reservan para peligro real, enemigos cercanos, tentáculos, situaciones de presión o rematar un jefe con muy poca vida.","El límite manual del jugador sigue siendo 10 disparos por segundo y no se ha reducido."]},

{"version":"v.184.8","date":"29/09/2026","title":"Rastro de Bloquito","changes":["El rastro del Bloquito completamente cargado ahora está formado por pequeñas siluetas de peces orientadas siguiendo su trayectoria, en lugar de una franja azul continua.","El rastro conserva sus 1,6 segundos de duración y la ralentización del 15 %; el cambio es visual y no altera su área efectiva."]},

{"version":"v.184.7","date":"29/09/2026","title":"Skins más visuales","changes":["Eliminadas las descripciones de todas las skins: cada tarjeta muestra únicamente el nombre, la categoría, la vista previa y su acción de compra o equipamiento.","Revisadas las vistas previas para conservar el dibujo real de cada aspecto como elemento principal, sin añadir texto redundante."]},

{"version": "v.184.6", "date": "29/09/2026", "title": "Reconstrucción estable desde v183", "changes": ["Reconstruida sobre la interfaz estable de v183, manteniendo su HTML y CSS.", "Reintegrados el pulpo, los cinco jefes, Suerte sobre el pez gigante, IA, Bloquito y tentáculos progresivos de v184.3.", "Añadido Gato jefe · Duque de marfil al Pack Elegante sin modificar el layout general."]},
{"version": "v.184.3", "date": "29/09/2026", "title": "Tentáculos progresivos", "changes": ["El pulpo lanza 1, 2, 3 y 4 golpes por tanda a partir de las rondas 10, 20, 30 y 40.", "Los tentáculos y el radio de sus golpes crecen un 8 % cada diez rondas desde la 10, hasta un 60 % adicional. Los avisos muestran el área real del ataque.", "Las inmersiones generan progresivamente más tentáculos, hasta ocho, que emergen y atacan en grupos sincronizados. Se mantienen las skins y el límite de ocho ataques activos."]},
{"version": "v.184.2", "date": "29/09/2026", "title": "Cosméticos del pulpo", "changes": ["Nueva sección Jefe pulpo con aspecto normal y tres skins: Almirante de marfil, Octágono abisal y Tinta de plata. Cada skin cuesta 280 escamas y adapta también los tentáculos.", "Integradas en los packs Elegante, Low Poly y Escala de grises, con precios completos de 1424, 1455 y 1455 escamas. Se descuentan automáticamente los cosméticos que ya tengas.", "Compatibles con vista previa, compra individual, equipamiento de packs, selección aleatoria, guardado y restablecimiento de aspecto."]},
{"version": "v.184.1", "date": "29/09/2026", "title": "Cinco jefes sin repeticiones", "changes": ["Hasta derrotar a los cinco jefes, la selección aleatoria solo incluye jefes pendientes. Después se excluye siempre el último jefe; la fusión del perro respeta ambas reglas.", "Revisados el primer final, los logros, el ranking y el paso a mid game con cinco jefes. El escalado de mid game toma como referencia la ronda 25 en lugar de la 20.", "Las rondas continúan mientras viva el jefe, incluso con el pulpo sumergido y el contador a cero.", "Refuerzos durante jefes más moderados: límite de 40 enemigos en early game, 55 en mid game y 70 en endless; apariciones más espaciadas e invocaciones del gato jefe menos masivas.", "Verificada Suerte sobre el gran pez de Leviatán: 0,001 % base, 0,00125 % con mejora máxima y 0,0015 % con fusión máxima."]},
{"version": "v.184", "date": "29/09/2026", "title": "El pulpo y mejoras de combate", "changes": ["Nuevo jefe Pulpo: aparece en el centro a partir de la ronda 10, golpea con tentáculos y se sumerge al 70 % y al 35 % de vida. Hay que destruir todos los tentáculos para que vuelva a emerger. Los avisos oscuros anticipan los golpes, que dañan tanto al jugador como a los gatos cercanos. Cada tentáculo tiene un 35 % de probabilidad base de soltar monedas.", "El pulpo se integra como quinto jefe en la progresión, victoria, logros, puntuación y ranking.", "Suerte mejora la aparición del gran pez de Leviatán: del 0,001 % base al 0,0015 % por disparo con una fusión de Suerte maximizada.", "La IA utiliza disparos residuales durante la recarga, con el mismo límite de 10 por segundo, y conserva el uso táctico del Bloquito completo. La esquiva anticipa rutas de ovillos, orbes y QUACKs y mantiene una dirección para evitar cancelaciones.", "El amarillo de los efectos combinados se reserva a los peces con crítico y boomerang de Retorno crítico. Los proyectiles secundarios del escudo e instinto usan azul.", "La cuenta atrás de la estrella muestra décimas de forma continua y pasa por 3,0 segundos.", "Bloquito completo deja un rastro suave que se desvanece en 1,6 segundos y ralentiza un 15 % a los enemigos que lo atraviesan. No se acumula y los residuales no lo generan.", "Las invocaciones del jefe gato alternan los cuatro bordes: izquierda, derecha, arriba y abajo."]},
{"version": "v.183", "date": "29/09/2026", "title": "Revisión y optimización", "changes": ["El Leviatán conserva su duración al derrotar jefes y cambiar de ronda. Corregida la eliminación de proyectiles cuando la muerte del jefe modifica la lista.", "El guiado compara distancias al cuadrado para reducir cálculos manteniendo las trayectorias. Los jefes reutilizan sus trazados vectoriales entre fotogramas.", "Inicializada correctamente la edad de los proyectiles secundarios para evitar valores NaN. Protegido el apuntado de clics si el navegador tiene el ratón capturado."]},
{"version": "v.182", "date": "29/09/2026", "title": "Sombrero del pato elegante", "changes": ["Centrado el sombrero sobre la cabeza del Señor Monóculo, con el ala ligeramente encajada en la parte superior."]},
{"version": "v.181", "date": "28/09/2026", "title": "El gran pez de Leviatán", "changes": ["EL GRAN PEZ tiene un diseño propio lila, con pinchos, expresión enfadada y la boca abierta con dientes. Es tres veces más grande que antes y dura 5 segundos. Su recorrido se ralentiza según la pantalla y la dirección para mantener su centro visible al menos 3,5 segundos.", "El gran pez ya no se elimina al cruzar su centro el borde de la pantalla. Su zona de impacto crece con su tamaño."]},
{"version": "v.180", "date": "28/09/2026", "title": "Limpieza y ajustes de progresión", "changes": ["Retorno crítico parte del 65 % y progresa al 67, 69, 71, 73 y 75 % tanto en crítico como en boomerang.", "Voluntad Oscura muestra solo los niveles que quedan hasta el máximo. Patita automática y Escudo respetan el nivel efectivo máximo 10 tanto en la vista previa como al aplicar la mejora.", "Retiradas funciones sin uso y un menú antiguo del arcoíris. El selector de fusiones filtra las parejas disponibles antes de construir las tarjetas."]},
{"version": "v.179", "date": "28/09/2026", "title": "Fusiones disponibles y límite de clics", "changes": ["El menú de fusiones muestra hasta 9 opciones por página. Tras elegir la primera mejora solo aparecen las parejas disponibles, manteniendo la protección contra mejoras sin pareja.", "El disparo manual admite como máximo 10 disparos por segundo, con 100 ms entre disparos. El automático mantiene su cadencia independiente."]},
{"version": "v.178.10", "date": "28/09/2026", "title": "Interacción de los disparos residuales", "changes": ["Los disparos residuales dañan QUACKs con su daño proporcional y destruyen orbes normales del demonio.", "Los ovillos y los orbes reforzados siguen protegidos frente a los residuales. Bloquito completo puede destruirlos."]},
{"version": "v.178.9", "date": "28/09/2026", "title": "Bloquito proporcional", "changes": ["Los disparos residuales reducen daño, tamaño y empuje en la misma proporción según los segundos de recarga restantes.", "Solo Bloquito disparado con recarga completa destruye proyectiles. Los residuales no dañan QUACKs ni orbes y no interceptan ovillos, tampoco al regresar como boomerang."]},
{"version": "v.178.8", "date": "28/09/2026", "title": "Retorno crítico", "changes": ["Nueva fusión Boomerang + Crítico: Retorno crítico. Permite combinar ambos efectos en peces amarillos, incluido Bloquito completo y parcial.", "Sin esta fusión, cada pez solo puede aplicar boomerang o crítico. Corregido el daño crítico oculto en peces boomerang.", "Integrada en catálogo, recomendaciones, progresión y selección segura de parejas. Se mantienen 28 mejoras y 14 fusiones por partida; el selector impide dejar mejoras sin pareja."]},
{"version": "v.178.7", "date": "28/09/2026", "title": "Bloquito: disparo manual continuo", "changes": ["Cada clic lanza Bloquito y se mantiene el disparo automático. Su daño es el daño completo dividido entre los segundos de recarga restantes, con divisor mínimo 1.", "Los disparos parciales no reinician la recarga. Bloquito conserva el escalado de daño y tamaño y puede ser crítico rojo o boomerang verde, con ambos efectos compatibles.", "Los QUACK tienen 1 de vida en el primer encuentro con el pato y ganan 1 por cada encuentro posterior."]},
{"version": "v.178.6", "date": "28/09/2026", "title": "Mensajes más limpios", "changes": ["Retirados siete avisos redundantes de tienda, fusiones, primer encuentro con jefes, gato arcoíris y estrella.", "Se mantienen los avisos útiles de combate, las recompensas de sorpresa y las frases personales."]},
{"version": "v.178.5", "date": "28/09/2026", "title": "Revisión de sobrecarga y conservación del botín", "changes": ["Retirados el subtítulo de mejoras de nivel 0 del gato arcoíris y el aviso AHORRAR de la tienda.", "Las apariciones respetan el límite de enemigos antes de generar gatos y las manadas de minis no lo sobrepasan. Los recortes protegen al arcoíris y a los ladrones con botín.", "Las limpiezas de ronda y las entidades corruptas devuelven las monedas robadas sin duplicarlas. La muerte normal del ladrón mantiene sus probabilidades de recuperación.", "Corregida la reactivación continua de avalanchas después de terminar.", "Las latas agrupadas conservan su curación al terminar un jefe; las monedas usan las mismas bonificaciones de recogida manual y automática y conservan sus recogidas al compactarse.", "La estrella ya no se salta enemigos contiguos. El contacto se comprueba después de mover a los gatos y el rescate del perro conserva la velocidad de los proyectiles.", "La EXP fraccionaria se acumula sin redondear cada recompensa al alza; se conservan las curvas 35/33/30.", "Máximo de cinco pasos de simulación por fotograma para evitar agravar la sobrecarga. Los fallos de audio opcional ya no interrumpen disparos, bajas ni compras."]},
{"version":"v.178.4","date":"28/09/2026","title":"IA del pato y estabilidad del combate","changes":["La IA del pato compara rutas frente a QUACKs y gatos, evita quedarse atrapada en las esquinas y conserva una dirección de esquiva durante las ráfagas.","La IA puede gastar el Pez Ariete defensivamente cuando un QUACK peligroso coincide con enemigos cercanos o poca vida.","Corregida la detección de atasco: utiliza el tiempo real entre decisiones de movimiento, no el intervalo del motor.","Ya no aparecen mensajes de error recuperado por simples rechazos asíncronos; los errores siguen registrados en la consola.","El límite de gatos no borra ladrones que llevan monedas robadas; el ranking distingue partidas distintas aunque empaten en puntuación.","Sin cambios en daño, estadísticas, fusiones ni progresión de experiencia."]},
{"version":"v.178.3","date":"28/09/2026","title":"Sonidos restaurados y error del modo IA corregido","changes":["Restaurada la inicialización de Web Audio que se había eliminado durante una limpieza anterior y que provocaba errores repetidos al disparar o eliminar enemigos, especialmente en el modo IA.","La recuperación del audio suspendido se realiza sin generar rechazos de promesas no gestionados; se renueva la versión de caché de los archivos."]},
{"version":"v.178.2","date":"28/09/2026","title":"Experiencia ajustada por etapas","changes":["La experiencia necesaria para subir de nivel crece un 35 % en early game (hasta derrotar a los cuatro jefes), un 33 % en mid game (hasta maximizar todas las fusiones) y un 30 % en late game (tras maximizarlas).","Se mantienen las transiciones entre etapas y las bonificaciones de experiencia ya existentes."]},
{"version":"v.178.1","date":"28/09/2026","title":"Revisión de estabilidad de la v178","changes":["La transición al mid game se aplica antes de conceder el nivel por derrotar al cuarto jefe.","Retirados los textos flotantes del ladrón para respetar la interfaz discreta.","El pato, los gatos de lana y el demonio respetan límites de balas al generarlas, en lugar de borrar proyectiles antiguos.","El exceso de monedas y latas se agrupa conservando el botín garantizado del Leviatán, sin llenar el mapa.","Eliminadas inicializaciones redundantes en el reinicio."]},
{"version":"v.178","date":"28/09/2026","title":"IA táctica y EXP por etapas","changes":["La experiencia conserva el ritmo inicial hasta derrotar a los cuatro jefes y suaviza su crecimiento durante el desarrollo de las fusiones y, tras maximizarlas, en el late game.","La IA reserva el Pez Ariete y selecciona trayectorias que despejan grupos o interceptan proyectiles peligrosos, sin desperdiciarlo en enemigos aislados.","Conserva sin cambios la interfaz y el ajuste discreto de los ladrones."]},
{"version":"v.177.10","date":"28/09/2026","title":"Ladrones discretos","changes":["Mantenido el botín justo del ladrón sin mensajes de robo, pérdida o recuperación, ni contador flotante de monedas sobre los enemigos.","Las monedas robadas recuperadas aparecen como monedas normales, en un máximo de cinco montones y sin destellos añadidos.","Sin desglose de daño ni nuevos elementos de interfaz."]},
{"version":"v.177.9","date":"28/09/2026","title":"Ladrones menos injustos","changes":["Al eliminar a un ladrón, ahora existe un 20 % de probabilidad de recuperar todas las monedas robadas, un 50 % de recuperar la mitad (mínimo una) y un 30 % de perderlas.","Los ladrones muestran junto a la bolsa cuántas monedas llevan robadas, también con skins alternativas.","Las monedas recuperadas aparecen destacadas con un brillo especial y se agrupan en hasta cinco montones para no saturar el mapa. Se muestra el resultado del botín al matar al ladrón."]},
{"version":"v.177.8","date":"28/09/2026","title":"Recomendaciones más precisas y fusiones compactas","changes":["La tienda, las subidas de nivel, los cambios de ronda y las recompensas del gato arcoíris valoran el estado de la partida con métricas de juego suficientes, sin sacar conclusiones de dos disparos o de unas pocas monedas.","Los consejos distinguen entre una recomendación clara, dos buenas alternativas y una mejora para la que conviene ahorrar.","Las fusiones solo destacan parejas que respetan el camino para completar el juego y consideran sus beneficios adicionales y las necesidades actuales.","Las cartas del catálogo de fusiones ocupan menos altura, conservan su explicación y muestran hasta seis opciones por página en escritorio o cuatro en móvil."]},
{"version":"v.177.7","date":"28/09/2026","title":"Estrellas visibles y Pez Ariete continuo","changes":["Las estrellas que aparecen en el mapa muestran un aura luminosa y un anillo que pulsa suavemente para localizarlas más fácilmente.","El tamaño, el empuje y la recarga del Pez Ariete escalan progresivamente en cada nivel, manteniendo la influencia de las mejoras de tamaño y daño."]},
{"version":"v.177.6","date":"28/09/2026","title":"Compatibilidad de mejoras y fusiones","changes":["Corregida la penalización oculta de perforación al combinar Peces listillos y Patita automática: ahora mantienen al menos el daño habitual tras atravesar enemigos.","Pelaje protector aplica realmente hasta el 45 % prometido cuando alcanza su máximo fusionado.","Pez cohete ya no reduce la capacidad de giro por distancia de los peces guiados.","Las ráfagas extremas no eliminan accidentalmente el Pez Ariete ni el Leviatán al alcanzar el límite de proyectiles.","Las probabilidades de boomerang llegan realmente al máximo indicado y las fusiones con críticos/peces laterales conservan bonificaciones útiles aunque se alcance el 95 %.","Las ráfagas circulares siguen ganando potencia después de alcanzar el máximo de 24 peces; corregido el último nivel de reducción de su recarga."]},
{"version":"v.177.5","date":"27/09/2026","title":"Auditoría y optimización conservadora","changes":["Eliminados cálculos y actualizaciones duplicados por fotograma; indicador de Pez Ariete y reloj más eficientes.","La IA identifica los ocho proyectiles más cercanos sin ordenar todos los existentes en cada frame.","Ranking y pantallas de resultados reutilizan cómputos y plantillas en lugar de repetir lógica.","Retiradas funciones sin uso; actualizado Cómo jugar y la versión de caché de los archivos."]},
{"version":"v.177.4","date":"27/09/2026","title":"Tienda con fusiones siempre junto a sorpresa","changes":["Las mejoras normales permanecen en una fila independiente y las acciones Fusión, Sorpresa y Salir en otra, sin cambiar de posición al desbloquear una fusión.","En pantallas estrechas, Fusión y Sorpresa siguen uno al lado del otro y Salir ocupa toda la fila inferior."]},
{"version":"v.177.3","date":"27/09/2026","title":"Jefes siempre dentro de la arena","changes":["El Instinto Felino, el Pez Ariete y los demás empujes ya no pueden expulsar a los jefes del mapa: quedan detenidos en el borde y siguen siendo alcanzables.","El límite se aplica a los cuatro jefes, también durante las pausas de aturdimiento y los saltos de la foca, y se actualiza al cambiar el tamaño de la ventana."]},
{"version":"v.177.2","date":"27/09/2026","title":"El Pez Ariete destruye proyectiles","changes":["El Pez Ariete atraviesa y destruye QUACKs del pato, ovillos y orbes del demonio, incluidos los orbes resistentes, sin detenerse ni perder daño.","Las colisiones se calculan sobre el recorrido de ambos proyectiles para evitar que atraviesen uno al otro a gran velocidad.","La IA también puede reservar el ariete para protegerse de proyectiles peligrosos y anticipa su dirección al disparar."]},
{"version":"v.177.1","date":"27/09/2026","title":"Pez Ariete con progresión completa","changes":["El Pez Ariete sigue aprovechando los niveles de daño y tamaño, incluidos los progresos de las fusiones; también aplica suerte ofensiva, críticos y bonos de daño situacional compatibles.","Su empuje crece considerablemente con el nivel, desde 260 hasta un máximo de 950, para despejar el camino sin impulsos ilimitados.","La recarga baja 0,35 segundos por nivel desde 30 segundos, con un mínimo de 20. El HUD y la IA utilizan la misma recarga real."]},
{"version":"v.172","date":"25/09/2026","title":"Low Poly más reconocible","changes":["Redibujadas las skins Low Poly del jugador, peces y enemigos para conservar la estética facetada sin parecer simples cubos.","Jugador y enemigos muestran ahora orejas, hocico, bigotes y cola; las variantes enemigas conservan sus accesorios identificativos.","Los peces Low Poly tienen cuerpo facetado, cola, aletas y ojo visibles; reforzados también los rasgos de pato, foca y demonio Low Poly.","Actualizados nombres, iconos y descripciones del pack Low Poly en la tienda de skins para identificar cada aspecto de un vistazo."]},
{"version":"v.171","date":"25/09/2026","title":"IA predictiva contra proyectiles","changes":["La IA Admin predice la trayectoria de QUACKs, ovillos y orbes del demonio y esquiva lateralmente antes de que crucen al jugador.","Las amenazas de proyectil fuerzan decisiones de movimiento casi inmediatas y tienen prioridad sobre monedas y estrellas cuando hay riesgo de impacto.","La IA abandona de forma preventiva la zona de aterrizaje de la foca y se desplaza lateralmente durante las ráfagas del pato.","Se conserva la selección inteligente de objetivos, curación, recursos y comportamiento contra hordas de la versión anterior."]},
{"version":"v.170","date":"25/09/2026","title":"Tienda más limpia","changes":["Centrado real del título de la tienda, independientemente del contador de monedas.","Eliminada la línea general de precios: cada tarjeta muestra ahora su propio coste y la progresión de precio cuando corresponde.","Mejora aleatoria y Salir de la tienda dejan de llevar la etiqueta de Utilidad, ya que son acciones de la tienda y no mejoras."]},
{"version":"v.169","date":"25/09/2026","title":"Voluntad Oscura y tienda compacta","changes":["La previsualización de Voluntad Oscura muestra ahora el salto real de hasta dos niveles, incluidos los valores numéricos y el nivel resultante.","La tienda conserva el nuevo acabado visual pero usa tarjetas más compactas para mostrar sus seis opciones de un vistazo en escritorio."]},
{"version":"v.167","date":"25/09/2026","title":"Recomendación legible","changes":["Corregida la etiqueta RECOMENDADO en las tarjetas rediseñadas: vuelve a mostrarse completa, centrada y sin quedar recortada.","El motivo de la recomendación conserva su texto justo debajo de la etiqueta."]},
{"version":"v.165","date":"25/09/2026","title":"Pulido visual de mejoras","changes":["Rediseño visual de la selección de mejoras, tienda y fusiones sin modificar el gameplay ni el balance.","Tarjetas con identidad visual por categoría, iconos más protagonistas, niveles mediante puntos y previsualizaciones más legibles.","Paneles, sombras, brillos, botones y jerarquía tipográfica renovados manteniendo la lógica de la v.164."]},
{"version":"v.164","date":"25/09/2026","title":"Disparo automático reequilibrado","changes":["El disparo automático base es más ágil y el clic queda como un pequeño bonus opcional, no como la forma claramente superior de jugar.","Patita automática mejora ahora tanto la corrección inicial como la cadencia cuando se deja disparar automáticamente: +4 % por nivel y hasta +35 % al completar su progresión fusionada.","El bonus de mantener clic baja al 10 % y el impulso de clic breve al 6 %, evitando que machacar el ratón domine al automático."]},
{"version":"v.163","date":"25/09/2026","title":"Leviatán y limpieza final","changes":["Leviatán conserva una probabilidad extremadamente baja de invocar EL GRAN PEZ, pero ya no está limitado a una sola aparición por partida.","EL GRAN PEZ provoca al aparecer una onda de daño masivo a todos los enemigos del campo y un golpe muy fuerte al jefe, además de conservar su proyectil gigante.","Retirado el mensaje fijo inferior de controles; los controles siguen disponibles en el menú inicial.","Eliminados alias redundantes de fusiones y el contador obsoleto que limitaba EL GRAN PEZ a una aparición."]},
{"version":"v.162","date":"25/09/2026","title":"Rework de mejoras y fusiones","changes":["Las 28 mejoras pueden terminar emparejadas en 14 fusiones: el selector bloquea combinaciones que impedirían completar todas.","El final al 100 % exige las 28 mejoras fusionadas y las 14 fusiones a nivel máximo.","Patita automática deja de duplicar la cadencia de Patita nerviosa: ahora corrige la dirección inicial del disparo; Peces listillos mantiene el guiado durante el vuelo.","Reequilibrado el escalado de fusiones: los niveles avanzados aportan incrementos crecientes y el nivel 5 vuelve a ser una mejora importante.","Pelaje protector llega al 45 % tras fusionarse y Trébol gatuno al 50 %, manteniendo límites controlados.","Tienda, recomendaciones e IA solo proponen fusiones que mantienen una ruta válida hacia el 100 %."]},
{"version": "v.160", "date": "25/09/2026", "title": "Acceso admin integrado", "changes": ["Acceso admin mediante el nombre reservado al iniciar partida.", "Herramientas en un desplegable dentro de la partida; retirados el botón del menú, la contraseña y el atajo F2."]},
{"version": "v.159", "date": "25/09/2026", "title": "Skins diferenciadas y fondo marino", "changes": ["Skins con colores, marcas y accesorios más visibles; conservadas las 25 skins, compras y packs.", "Peces del fondo con silueta continua y transparencia uniforme, sin figuras superpuestas.", "Fondo más azulado, con partículas discretas y sin corazones decorativos.", "Verificado que el modo de rendimiento reduce nuevas apariciones sin borrar los peces visibles."]},
{"version": "v.158", "date": "25/09/2026", "title": "Disparo automático desde el inicio", "changes": ["Disparo permanente hacia el cursor desde el inicio, sin pulsar ni mantener el botón.", "Patita automática añade 8 % de cadencia por nivel. Los bonus de sus fusiones funcionan sin mantener pulsado.", "Clic opcional: +15 % de cadencia durante 0,8 s, renovable pero no acumulable.", "WASD y flechas para moverse; combinar teclas equivalentes no duplica velocidad.", "Comprobado que reloj y disparos se detienen en pausa, tienda, subida de nivel, ronda y recompensa arcoíris."]},
  {"version": "v.157", "date": "25/09/2026", "title": "Suerte, protección y nuevas rutas de fusión", "changes": ["Recomendaciones en cada tienda, también para ahorrar cuando no alcanza el dinero.", "Balance diferenciado por estadística y progresión de fusión con mayor incremento final.", "Pelaje protector y Trébol gatuno: dos mejoras con cinco niveles y diez fusiones nuevas; catálogo de 105 parejas.", "Zoomies añade 35 % de daño; perro al 68 % de su tamaño anterior.", "La tienda muestra el resultado de la compra aleatoria. Eliminado el texto innecesario de Voluntad Oscura.", "Fondo estable al cambiar el rendimiento; menos reapariciones en lugar de borrado repentino.", "Estrellas durante la ronda, cuenta atrás y aviso destacado al terminar.", "Tiempo de juego activo en pantalla y ranking; compatibilidad con registros anteriores sin tiempo.", "Admin con contraseña y herramientas para mejoras, fusiones, rondas e IA. Partidas manipuladas fuera del ranking.", "Nombres diferenciados para las 25 skins, conservando compras y selecciones."]},
  {"version": "v.156", "date": "21/09/2026", "title": "Revisión final y experiencia al moverse", "changes": ["La música continúa en tiendas y al elegir mejoras o fusiones; la pausa manual sí la detiene.","Aprendizaje Veloz concede experiencia solo al desplazarte: mantener una dirección contra el borde ya no cuenta. Conserva el tiempo sobrante entre recompensas.", "Comprobados movimiento, pausa, combate, tiendas, guardado, skins, jefes, recomendaciones y las 95 fusiones.", "Se mantiene la recompensa gradual de escamas: un millón de puntos concede 577."]},
  {"version": "v.155", "date": "21/09/2026", "title": "Escamas proporcionales y revisión general", "changes": ["Escamas según puntuación: una por cada 300 puntos hasta 30.000; después crecen más despacio, sin tope fijo. Ejemplos: 120.000 puntos dan 200 y un millón da 577. Al continuar tras ganar, solo se abona la diferencia pendiente.", "Revisados aspectos y variantes, compra y guardado de skins, Random, combate, pausa, tiendas, mejoras y fusiones."]},
  {"version": "v.154", "date": "21/09/2026", "title": "Escala de grises y gatitos renovados", "changes": ["Nuevo pack Escala de grises con siete skins: jugador, peces, enemigos y los cuatro jefes. Compatible con Random y compras parciales.", "Todas las variantes de gatos tienen detalles distintivos, también en gris y low poly. El arcoíris lleva corona y estrellas.", "La foca elegante cambia la falda por un collar de perlas y un pequeño lazo, conservando su desbloqueo."]},
  {"version": "v.153", "date": "20/09/2026", "title": "Fusiones recomendadas y compañero renovado", "changes": ["Las recomendaciones de fusión valoran el bonus añadido, la vida, los enemigos, los jefes y la precisión; explican el motivo y la pareja aconsejada.", "Perrito redibujado con orejas caídas, patas, cola animada y collar de corazón.", "Peces del fondo con aletas, contornos, ojos y cola animada, manteniendo su discreción.", "Verificados los incrementos de los cinco niveles de todas las fusiones, sus costes, límites y previsualizaciones."]},
  {"version": "v.152", "date": "20/09/2026", "title": "Revisión de mejoras, fusiones y jefes", "changes": ["La ralentización respeta su porcentaje hasta el 85 % y se aplica también a los gatos ya presentes.", "Los bonus pequeños de experiencia se acumulan sin perderse al redondear.", "Bonus de fusión descritos según los atributos que realmente mejoran. El escudo vampírico cura según la vida quitada.", "Protección adicional para impedir mejoras por encima del nivel máximo.", "El jefe gato invoca más ratones, desde su cuerpo y alternando ambos laterales.", "El pato se desplaza horizontalmente desde la ronda 15.", "El demonio puede lanzar orbes de dos impactos, señalados con aro dorado: probabilidad gradual desde la ronda 11, máximo 12 %.", "La foca aumenta gradualmente de 6 a 12 saltos antes de descansar."]},
  {"version": "v.151", "date": "20/09/2026", "title": "Optimización, progresión y cierre de partida", "changes": ["Precio visible en cada tarjeta de la tienda, incluida mejora aleatoria y fusión.", "Vida, curación por ronda y radio del imán reparten el bonus del nivel 5 entre sus niveles, conservando el valor final. Las mejoras de vida curan 34 puntos por elección.", "La pausa muestra la puntuación actual. Acabar aquí permite terminar y guardar el resultado sin morir.", "Menos escrituras del marcador, parámetros del fondo reutilizados, filtrado previo de colisiones lejanas y limpieza de entidades sin desplazamientos repetidos."]},
  {"version": "v.150", "date": "20/09/2026", "title": "Primer ajuste de equilibrio de combate", "changes": ["Banco de peces conserva los dos proyectiles extra; cada uno causa el 60 % del daño del principal.", "El robo de vida de los peces y del daño a jefes se calcula sobre la vida realmente quitada, sin curación por daño sobrante.", "Los disparos normales mantienen el crítico de daño doble al combinar automatización y puntería. Eliminado el límite oculto de probabilidad: se respeta el máximo del 95 %."]},
  {"version":"v.149","date":"20/09/2026","title":"Fusiones más concisas","changes":["Precio con icono de moneda y eliminadas las explicaciones repetidas de coste y niveles en las tarjetas de fusión."]},
  {"version": "v.148", "date": "20/09/2026", "title": "Compras y fusiones más claras", "changes": ["Las mejoras muestran valores actuales y posteriores a la compra, usando las fórmulas reales del juego.", "Las mejoras de vida también anticipan la curación inmediata.", "Las tarjetas de fusión muestran resultado, coste y progresión posterior antes de elegirlas."]},
  {"version":"v.147","date":"20/09/2026","title":"Recomendaciones, escalado y skins al azar","changes":["Botón Random: escoge una skin desbloqueada por categoría al empezar o reiniciar, sin gastar escamas. Conserva tu selección manual.","Recomendaciones según vida, presión, fiabilidad de los ataques, mejoras disponibles y ganancia del siguiente nivel, con explicación.","Corregida la valoración de componentes al máximo en los menús de fusión.","Progresión de estadísticas porcentuales de fusión repartida hasta nivel 5, respetando sus límites. Corregida la interacción de bonus con mejoras ajenas a la fusión.","Activar automatización ya no reduce las probabilidades de crítico y perforación adquiridas; siguen limitadas al 95%.","La pausa muestra valores reales. Las fusiones con vida curan al mejorarse aunque vida no sea su componente principal."]},
  {"version":"v.146","date":"19/09/2026","title":"Monedas gatunas y nuevos jefes","changes":["Monedas con patita dibujada, tanto en la partida como en los menús.","Nuevos diseños ilustrados para los cuatro jefes, conservando sus ataques.","Variantes low poly con siluetas diferentes: orejas y bigotes, pico y cola, aletas o cuernos.","Paquete de distribución limpio, sin capturas, pruebas ni informes."]},
  {"version":"v.145","date":"19/09/2026","title":"Un aspecto más cuidado y tranquilo","changes":["Gatitos y peces redibujados, conservando la patita y las señales de combate.","Menús más limpios y progresión de colores en tarjetas conservada.","Vistas reales de las skins, incluidos los jefes, y detalles cosméticos pulidos.","Fondo animado conservado con menos destellos; fuente de respaldo para iconos."]},
  {
    "version": "v.144",
    "date": "18/09/2026",
    "title": "Correcciones de estabilidad y progreso",
    "changes": [
      "Las fusiones diferentes cuentan entre partidas y conservan el progreso anterior.",
      "Las recompensas de nivel, arcoíris y jefes se resuelven sin perder elecciones.",
      "Corregidos el daño después de morir, el clic derecho y los temporizadores en pausa.",
      "La música vuelve correctamente al cerrar mejoras y tienda.",
      "Las victorias registran los logros y continuar una partida concede la diferencia de escamas.",
      "Arranque tolerante a guardados defectuosos y a fallos de conexión del ranking.",
      "Ranking por páginas y simulación con paso fijo."
    ]
  },
  {
    "version": "v.143",
    "date": "29/05/2026",
    "title": "Notas de parche integradas",
    "changes": [
      "Añadido historial de versiones en el menú inicial.",
      "Solo se muestran cambios importantes para jugadores.",
      "Panel con scroll para que no rompa la interfaz."
    ]
  },
  {
    "version": "v.142",
    "date": "29/05/2026",
    "title": "Pulido final",
    "changes": [
      "Cartas de pausa girables con click izquierdo o derecho.",
      "Descripciones de fusiones más compactas.",
      "Correcciones menores de textos y presentación."
    ]
  },
  {
    "version": "v.139",
    "date": "28/05/2026",
    "title": "Logros ajustados",
    "changes": [
      "Eliminado el logro de gastar escamas.",
      "Suerte pura ahora pide quedarse al 10% de vida o menos.",
      "El nombre dorado sigue siendo la recompensa por completar todos los logros."
    ]
  },
  {
    "version": "v.136",
    "date": "28/05/2026",
    "title": "Música de rondas y jefes",
    "changes": [
      "Añadida música en bucle para rondas normales.",
      "Añadida música especial mientras hay jefe activo.",
      "Controles de música y volumen en menú y pausa."
    ]
  },
  {
    "version": "v.134",
    "date": "24/05/2026",
    "title": "Pack Low Poly",
    "changes": [
      "Añadido pack visual Low Poly.",
      "Jugador, enemigos, jefes y varios proyectiles pasan a estilo cúbico.",
      "Corregidas barras de vida en jefes con este pack."
    ]
  },
  {
    "version": "v.132",
    "date": "21/05/2026",
    "title": "Dificultad en tres fases",
    "changes": [
      "La dificultad progresa en tres etapas: jefes, completar build y modo infinito.",
      "Primeras apariciones de jefes más razonables.",
      "El modo infinito escala cada vez más hasta volverse realmente peligroso."
    ]
  },
  {
    "version": "v.130",
    "date": "21/05/2026",
    "title": "Controles más estables",
    "changes": [
      "Arreglado el bug de teclas que se quedaban pilladas.",
      "Mejor comportamiento al cambiar de pestaña o perder foco.",
      "Más estabilidad especialmente en Firefox."
    ]
  },
  {
    "version": "v.127",
    "date": "21/05/2026",
    "title": "Ranking e IA",
    "changes": [
      "Función histórica de pruebas: el piloto automático está desactivado en esta edición pública.",
      "Corregido el guardado de puntuación tras completar el juego.",
      "Mejorado el sistema para evitar puntuaciones duplicadas raras."
    ]
  },
  {
    "version": "v.125",
    "date": "21/05/2026",
    "title": "Arreglos de partida",
    "changes": [
      "Confirmación al reiniciar o volver al menú.",
      "El personaje parpadea al recibir daño.",
      "Corregidos comportamientos raros del pato y sus QUACKS."
    ]
  },
  {
    "version": "v.121",
    "date": "20/05/2026",
    "title": "Sistema de logros",
    "changes": [
      "Añadido sistema de logros por fases.",
      "Nueva pestaña de logros en el menú inicial.",
      "Completar todos los logros vuelve dorado el nombre del jugador."
    ]
  },
  {
    "version": "v.115",
    "date": "20/05/2026",
    "title": "Cosméticos y escamas",
    "changes": [
      "Añadida tienda de cosméticos.",
      "Las partidas dan escamas para comprar skins y packs.",
      "Añadidos packs visuales y más opciones de personalización."
    ]
  },
  {
    "version": "v.107",
    "date": "18/05/2026",
    "title": "Menú inicial renovado",
    "changes": [
      "Menú inicial más limpio y organizado.",
      "Cosméticos, logros y cómo jugar usan desplegables.",
      "Mejor comportamiento de cursor en menús."
    ]
  },
  {
    "version": "v.100",
    "date": "16/05/2026",
    "title": "Fusiones mejoradas",
    "changes": [
      "Más compatibilidades entre mejoras.",
      "Menú de fusiones más ordenado.",
      "Progresión de fusiones más clara."
    ]
  },
  {
    "version": "v.094",
    "date": "16/05/2026",
    "title": "Fondos y ambiente",
    "changes": [
      "Añadidos fondos con peces decorativos.",
      "Variación visual para que la partida se sienta más viva.",
      "Ajustes para que el fondo no moleste durante el juego."
    ]
  },
  {
    "version": "v.089",
    "date": "16/05/2026",
    "title": "Mejoras recomendadas",
    "changes": [
      "Añadido sistema de recomendación de mejoras.",
      "Las elecciones importantes son más claras.",
      "La mejora aleatoria se diferencia mejor de las recomendadas."
    ]
  },
  {
    "version": "v.051",
    "date": "12/05/2026",
    "title": "Ranking online",
    "changes": [
      "Añadido ranking online.",
      "Las puntuaciones guardan nombre, puntos, ronda, nivel y jefes.",
      "Mejoras en scroll y visualización del ranking."
    ]
  },
  {
    "version": "v.032",
    "date": "05/05/2026",
    "title": "Fusiones y progresión",
    "changes": [
      "Añadido sistema de fusiones.",
      "Mejoras escalables y únicas mejor diferenciadas.",
      "Más variedad de builds durante la partida."
    ]
  },
  {
    "version": "v.031",
    "date": "12/05/2026",
    "title": "Jefes y eventos especiales",
    "changes": [
      "Jefes rediseñados y más reconocibles.",
      "Demonio, pato, foca y gato jefe con mejor comportamiento.",
      "Eventos especiales y enemigos únicos más pulidos."
    ]
  },
  {
    "version": "v.001",
    "date": "04/05/2026",
    "title": "Base del juego",
    "changes": [
      "Primeras versiones jugables de Gatitos & Peces.",
      "Movimiento, disparo de peces, rondas y enemigos básicos.",
      "Base de mejoras y supervivencia."
    ]
  }
];
