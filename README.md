# Gatitos & Peces — v.144

Versión corregida a partir de `gatitos-y-peces-itchio-public.zip`.

## Jugar

Extrae el ZIP completo y abre `index.html` en un navegador de escritorio. Conserva todos los archivos y la carpeta `audio` juntos.

Para probar mediante servidor local, desde esta carpeta:

```sh
python -m http.server 8000
```

Después abre `http://localhost:8000`. El juego puede funcionar sin conexión; el ranking necesita conexión y la configuración original de Firebase.

## Actualizar itch.io

El ZIP contiene `index.html` en la raíz. Utilízalo como sustitución del archivo HTML5 del mismo proyecto. La carpeta `verificacion` es documentación técnica y pruebas; no es necesaria para jugar.

Los datos anteriores se conservan cuando el navegador proporciona el mismo almacenamiento del juego. Otro dominio, perfil de navegador, origen local o modo privado puede tener un almacenamiento distinto: el progreso no se transfiere automáticamente entre ellos.

## Cambios y comprobaciones

Consulta `CAMBIOS_Y_PRUEBAS.md`. Se incluyen los resultados y los scripts de verificación en `verificacion`.

El original se ha conservado aparte. No se han cambiado los recursos de audio ni los iconos. Se mantienen las 95 combinaciones de fusión, las 26 mejoras, los cuatro jefes y los cosméticos.
