window.PATCH_NOTES = [
  {"version":"v215","date":"02/10/2026","title":"Auditoría de sesiones y estabilidad cooperativa","changes":["Corregidas la limpieza al salir del online, las confirmaciones de elección antiguas y la espera en rondas sin mejoras disponibles.","Las subidas de nivel acumuladas y los aumentos de vida del invitado se procesan de forma independiente; el Leviatán y la sal atribuyen el daño al propietario correspondiente.","Revisada la sincronización de menús, economía y controles, con pruebas adicionales de regresión."],"includedVersions":["v215"]},
  {"version":"v214","date":"02/10/2026","title":"Cooperativo: premios y efectos individuales","changes":["El premio del gato arcoíris abre elecciones independientes para ambos jugadores y espera sus decisiones antes de reanudar.","Los efectos de sal y el robo de vida respetan al propietario; las ondas críticas tienen recarga independiente por jugador.","Tienda del invitado con mejora aleatoria y hasta nueve fusiones compatibles; las monedas recogidas activan sus propios bonus. Validación reforzada de elecciones y controles WebRTC."],"includedVersions":["v214"]},
  {"version":"v213","date":"02/10/2026","title":"Cooperativo experimental: progresión y tiendas individuales","changes":["Cada gatito tiene monedas, experiencia, nivel, ofertas y compras independientes en la misma arena compartida.","Disparos y varios efectos calculan el daño con las mejoras del jugador que los genera; los enemigos pueden elegir a cualquiera de los dos como objetivo.","Se mantiene el modo individual, sin récords, logros ni ranking para las partidas cooperativas."],"includedVersions":["v213"]},
  {"version":"v212","date":"02/10/2026","title":"Cooperativo con anfitrión y dos partidas gráficas","changes":["Cada navegador dibuja el mundo con el motor original; WebRTC intercambia datos y controles, sin retransmitir vídeo.","Mapa, enemigos, monedas y rondas compartidos, con vida, atributos y mejoras separados; ambos eligen al terminar las rondas y subir de nivel.","El anfitrión mantiene la simulación y el cooperativo sigue excluido del ranking y los récords."],"includedVersions":["v212"]},
  {"version":"v211","date":"02/10/2026","title":"Cooperativo online experimental","changes":["Partidas de prueba para dos personas mediante WebRTC y códigos de invitación, sin servidor ni cambios en Firebase.","Dos gatitos, disparos y movimiento independientes con vida, experiencia y mejoras compartidas. El anfitrión elige las mejoras; sin ranking ni récords."],"includedVersions":["v211"]},
  {"version":"v210","date":"02/10/2026","title":"Puntuaciones protegidas y recuperación","changes":["Cada puntuación se respalda localmente antes de subirla al ranking y se conserva si Firebase falla.","Botones para reintentar las subidas pendientes y descargar un respaldo JSON de las partidas registradas."],"includedVersions":["v210"]},
  {
    "version": "v209",
    "date": "02/10/2026",
    "title": "Combate más limpio y avisos esenciales",
    "changes": [
      "Eliminados los textos flotantes repetitivos de rebotes, ráfagas, Zoomies, maullidos, monedas y otros efectos habituales.",
      "Se mantienen los avisos importantes de estrellas, jefes, protecciones y Leviatán, además de las frases de Apoyo moral con una pausa entre ellas."
    ],
    "includedVersions": [
      "v209"
    ]
  },
  {
    "version": "v208",
    "date": "02/10/2026",
    "title": "Historial de versiones simplificado",
    "changes": [
      "Notas reorganizadas por novedades importantes, con entradas relacionadas agrupadas y textos más breves.",
      "Actualizaciones recientes separadas del historial anterior, que se puede desplegar cuando quieras."
    ],
    "includedVersions": [
      "v208"
    ]
  },
  {
    "version": "v.207",
    "date": "02/10/2026",
    "title": "Mejoras y fusiones más claras",
    "changes": [
      "Descripciones más breves, bonus explicados al elegir la segunda mejora y un emoji diferente para cada mejora normal y única.",
      "Las mejoras al nivel máximo usan DEFINITIVA de forma coherente, también con Voluntad Oscura."
    ],
    "includedVersions": [
      "v.207",
      "v.205",
      "v.204",
      "v.201"
    ]
  },
  {
    "version": "v.206",
    "date": "02/10/2026",
    "title": "Leviatán más reconocible",
    "changes": [
      "El Gran Pez luce cuerpo morado, pinchos, aletas, dientes y expresión enfadada.",
      "Su tamaño visual se adapta a la pantalla sin modificar su daño, duración ni área de impacto."
    ],
    "includedVersions": [
      "v.206",
      "v.198"
    ]
  },
  {
    "version": "v.203",
    "date": "02/10/2026",
    "title": "Bloquito: control de los disparos",
    "changes": [
      "Hasta 100 disparos manuales durante la recarga; el contador oculto se reinicia al lanzar Bloquito completo.",
      "Los disparos parciales tienen potencia proporcional; Bloquito completo deja un rastro de peces que ralentiza a los enemigos.",
      "El disparo automático continúa funcionando con normalidad; el límite manual es de diez disparos por segundo."
    ],
    "includedVersions": [
      "v.203",
      "v.185",
      "v.184.8",
      "v.178.7",
      "v.178.9",
      "v.178.10"
    ]
  },
  {
    "version": "v.202",
    "date": "02/10/2026",
    "title": "Pausa compacta y recomendaciones visibles",
    "changes": [
      "Cuatro tarjetas por fila en pantallas amplias y botones de pausa reorganizados en la parte superior.",
      "Las fusiones recomendadas aparecen primero para encontrarlas sin recorrer varias páginas."
    ],
    "includedVersions": [
      "v.202",
      "v.142"
    ]
  },
  {
    "version": "v.200",
    "date": "02/10/2026",
    "title": "Nuevos packs y renovación visual",
    "changes": [
      "Packs Pirata, Bioluminiscente y Celestial, con ocho diseños cada uno.",
      "Tienda de cosméticos con filtros y vistas previas; menús y botones más coherentes."
    ],
    "includedVersions": [
      "v.200",
      "v.184.7"
    ]
  },
  {
    "version": "v.199",
    "date": "02/10/2026",
    "title": "Más variedad en combate y modo infinito",
    "changes": [
      "Retorno crítico y Salmuera helada reciben efectos adicionales.",
      "Los cinco jefes conceden recompensas temáticas; el modo infinito incorpora tres variantes de ronda.",
      "Tres desafíos persistentes y efectos del Leviatán más ligeros; Retorno crítico combina boomerang y crítico."
    ],
    "includedVersions": [
      "v.199",
      "v.178.8"
    ]
  },
  {
    "version": "v.197",
    "date": "01/10/2026",
    "title": "Escamas saladas y seis fusiones",
    "changes": [
      "Nueva mejora de daño continuo Escamas saladas y seis fusiones con efectos propios.",
      "Patita nerviosa mejora su cadencia; se retira Patita automática y sus antiguas combinaciones."
    ],
    "includedVersions": [
      "v.197",
      "v.180",
      "v.164"
    ]
  },
  {
    "version": "v.196",
    "date": "30/09/2026",
    "title": "Enemigos y combate más depurados",
    "changes": [
      "Retirado el gato estudioso y sus apariciones.",
      "Ajustados el daño por contacto, los proyectiles del demonio y la recuperación de monedas de los ladrones."
    ],
    "includedVersions": [
      "v.196",
      "v.194",
      "v.177.9",
      "v.177.10"
    ]
  },
  {
    "version": "v.195",
    "date": "30/09/2026",
    "title": "Sardina realista integrada",
    "changes": [
      "Sardina realista incluida en el juego, con transparencia y proporciones corregidas.",
      "Sus filtros de crítico, boomerang y efectos combinados siguen únicamente la silueta del pez."
    ],
    "includedVersions": [
      "v.195",
      "v.189",
      "v.188",
      "v.187",
      "v.186",
      "v.184.10"
    ]
  },
  {
    "version": "v.191",
    "date": "29/09/2026",
    "title": "Recomendaciones más discretas",
    "changes": [
      "Las opciones sugeridas se identifican con un pequeño 👍 en el botón de acción, sin etiquetas repetidas.",
      "El modo de rendimiento conserva su funcionamiento sin mostrar avisos innecesarios."
    ],
    "includedVersions": [
      "v.193",
      "v.192",
      "v.191",
      "v.178.6"
    ]
  },
  {
    "version": "v.190",
    "date": "29/09/2026",
    "title": "Estabilidad de partidas y jefes",
    "changes": [
      "Corregidas las avalanchas posteriores a cada jefe y la actualización del panel de objetivos.",
      "Guardado y ranking más resistentes a errores; mejoras de estabilidad del combate."
    ],
    "includedVersions": [
      "v.190",
      "v.183",
      "v.178.5",
      "v.177.5"
    ]
  },
  {
    "version": "v.184",
    "date": "29/09/2026",
    "title": "El Pulpo: quinto jefe",
    "changes": [
      "Nuevo jefe Pulpo, con inmersiones y tentáculos cuyo número y tamaño progresan con las rondas.",
      "Los cinco jefes aparecen sin repetirse hasta completar el primer ciclo; nuevas skins del Pulpo.",
      "Rondas de jefe y recompensas adaptadas al nuevo enfrentamiento."
    ],
    "includedVersions": [
      "v.184",
      "v.184.1",
      "v.184.2",
      "v.184.3",
      "v.184.6",
      "v.182"
    ]
  },
  {
    "version": "v.181",
    "date": "28/09/2026",
    "title": "El Gran Pez de Leviatán",
    "changes": [
      "El Leviatán puede invocar un pez gigante con diseño propio y cinco segundos de duración.",
      "Suerte influye en su aparición; la invocación se mantiene al derrotar jefes."
    ],
    "includedVersions": [
      "v.181",
      "v.163"
    ]
  },
  {
    "version": "v.178",
    "date": "28/09/2026",
    "title": "IA táctica y experiencia por etapas",
    "changes": [
      "La IA mejora su movimiento frente a proyectiles, jefes y situaciones de presión; usa los disparos parciales de forma táctica.",
      "Progresión de experiencia diferenciada entre el inicio, el desarrollo de fusiones y el modo avanzado."
    ],
    "includedVersions": [
      "v.178",
      "v.178.1",
      "v.178.2",
      "v.178.3",
      "v.178.4",
      "v.184.9",
      "v.171"
    ]
  },
  {
    "version": "v.177.8",
    "date": "28/09/2026",
    "title": "Tienda y fusiones más prácticas",
    "changes": [
      "Recomendaciones y previsualizaciones de mejoras más precisas.",
      "Menús de tienda y fusión más compactos, con nueve opciones por página y parejas compatibles."
    ],
    "includedVersions": [
      "v.177.8",
      "v.177.6",
      "v.170",
      "v.169",
      "v.167",
      "v.165",
      "v.149",
      "v.148",
      "v.153",
      "v.179",
      "v.177.4",
      "v.089"
    ]
  },
  {
    "version": "v.177.1",
    "date": "27/09/2026",
    "title": "Pez Ariete mejorado",
    "changes": [
      "El Pez Ariete escala con las mejoras y puede destruir proyectiles enemigos.",
      "Empuje, tamaño y recarga progresivos; los jefes permanecen dentro de la arena."
    ],
    "includedVersions": [
      "v.177.1",
      "v.177.2",
      "v.177.3",
      "v.177.7"
    ]
  },
  {
    "version": "v.172",
    "date": "25/09/2026",
    "title": "Skins y aspecto renovados",
    "changes": [
      "Variantes Low Poly más reconocibles, gatitos y peces redibujados y fondos marinos más limpios.",
      "Nuevas vistas previas y skins diferenciadas, conservando las compras."
    ],
    "includedVersions": [
      "v.172",
      "v.159",
      "v.146",
      "v.145",
      "v.134",
      "v.094"
    ]
  },
  {
    "version": "v.162",
    "date": "25/09/2026",
    "title": "Revisión de mejoras y fusiones",
    "changes": [
      "Sistema de compatibilidad para conservar rutas de fusión válidas hasta completar las mejoras disponibles.",
      "Reequilibrados los niveles finales, las probabilidades y los límites de las mejoras."
    ],
    "includedVersions": [
      "v.162",
      "v.152",
      "v.150",
      "v.147",
      "v.100"
    ]
  },
  {
    "version": "v.158",
    "date": "25/09/2026",
    "title": "Disparo automático y controles",
    "changes": [
      "Disparo automático desde el inicio; el clic manual pasa a ser opcional.",
      "Movimiento con WASD o flechas y temporizador detenido durante los menús y la pausa."
    ],
    "includedVersions": [
      "v.158",
      "v.130"
    ]
  },
  {
    "version": "v.157",
    "date": "25/09/2026",
    "title": "Suerte, protección y progreso",
    "changes": [
      "Nuevas rutas de fusión para Suerte y protección, con progresión revisada.",
      "Recomendaciones de tienda, estrellas de ronda, tiempo activo y herramientas de administración por nombre reservado."
    ],
    "includedVersions": [
      "v.157",
      "v.156",
      "v.160"
    ]
  },
  {
    "version": "v.155",
    "date": "21/09/2026",
    "title": "Economía y fin de partida",
    "changes": [
      "Las escamas se conceden según la puntuación, con progresión gradual.",
      "La pausa muestra la puntuación y permite terminar la partida guardando el resultado."
    ],
    "includedVersions": [
      "v.155",
      "v.151",
      "v.132"
    ]
  },
  {
    "version": "v.154",
    "date": "21/09/2026",
    "title": "Pack Escala de grises",
    "changes": [
      "Nuevo pack de skins grises para el jugador, peces, enemigos y jefes.",
      "Detalles distintivos para los gatos y personalización del compañero."
    ],
    "includedVersions": [
      "v.154"
    ]
  },
  {
    "version": "v.144",
    "date": "18/09/2026",
    "title": "Guardado y estabilidad",
    "changes": [
      "Corregidas las recompensas, los logros, los temporizadores y la recuperación de partidas.",
      "Ranking por páginas y arranque más tolerante a errores de conexión."
    ],
    "includedVersions": [
      "v.144",
      "v.125"
    ]
  },
  {
    "version": "v.136",
    "date": "28/05/2026",
    "title": "Música de rondas y jefes",
    "changes": [
      "Música diferenciada para las rondas y los jefes, con controles de volumen."
    ],
    "includedVersions": [
      "v.136"
    ]
  },
  {
    "version": "v.121",
    "date": "20/05/2026",
    "title": "Logros y recompensas",
    "changes": [
      "Sistema de logros con pestaña propia y nombre dorado al completarlos todos."
    ],
    "includedVersions": [
      "v.121",
      "v.139"
    ]
  },
  {
    "version": "v.115",
    "date": "20/05/2026",
    "title": "Cosméticos y escamas",
    "changes": [
      "Tienda de skins y packs financiada con escamas obtenidas al jugar."
    ],
    "includedVersions": [
      "v.115"
    ]
  },
  {
    "version": "v.107",
    "date": "18/05/2026",
    "title": "Menú inicial renovado",
    "changes": [
      "Menú inicial reorganizado con apartados desplegables para las principales funciones, incluido el historial de versiones."
    ],
    "includedVersions": [
      "v.107",
      "v.143"
    ]
  },
  {
    "version": "v.051",
    "date": "12/05/2026",
    "title": "Ranking online",
    "changes": [
      "Clasificación online con puntuación, ronda, nivel y jefes derrotados."
    ],
    "includedVersions": [
      "v.051",
      "v.127"
    ]
  },
  {
    "version": "v.032",
    "date": "05/05/2026",
    "title": "Fusiones y progresión",
    "changes": [
      "Primer sistema de fusiones y mejoras escalables para crear distintas combinaciones."
    ],
    "includedVersions": [
      "v.032"
    ]
  },
  {
    "version": "v.031",
    "date": "12/05/2026",
    "title": "Jefes y eventos especiales",
    "changes": [
      "Primeros diseños y comportamientos de los jefes originales y eventos especiales."
    ],
    "includedVersions": [
      "v.031"
    ]
  },
  {
    "version": "v.001",
    "date": "04/05/2026",
    "title": "Primeras versiones jugables",
    "changes": [
      "Movimiento, disparos de peces, rondas, enemigos y primeras mejoras."
    ],
    "includedVersions": [
      "v.001"
    ]
  }
];
