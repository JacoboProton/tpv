# Build APK Local (Android)

## Requisitos previos

- JDK 17 obligatorio (`java -version`)
- Android SDK (Android Studio)
- Variable `ANDROID_HOME` apuntando al SDK

## Build

```bash
cd mobile
npx expo prebuild --clean
npx expo run:android --variant release
```

O con EAS:

```bash
npx eas build --profile preview --platform android --clear-cache
```

## Trampas a tener en cuenta

- **JDK 17 obligatorio**: Gradle 8 no funciona bien con JDK 21. Verifica con `java -version` antes de empezar.
- **Variables de entorno**: la build local NO inyecta env vars como EAS. Tienes que poner los valores (apiUrl, tpvApiKey, stripePk, etc.) directamente en `app.json` → `extra`.
- **Keystore de debug**: el script usa la debug keystore por defecto. Suficiente para pruebas internas, pero no sirve para Play Store.
- **Si `expo prebuild` falla**: puede ser por plugins nativos (Stripe Terminal). Revisa el log y consulta "Problemas comunes" abajo.
- **Primera build lenta**: descarga ~500 MB de dependencias Gradle. Las siguientes van en 2-3 min.

## app.json → extra

Antes de build local, rellena estos valores en `app.json`:

```json
"extra": {
  "apiUrl": "https://tpv-restaurante.onrender.com",
  "tpvApiKey": "tu-api-key",
  "supabaseUrl": "https://tu-proyecto.supabase.co",
  "supabaseKey": "tu-supabase-anon-key",
  "stripePk": "pk_test_...",
  "stripeSimulated": true
}
```

## Problemas comunes

- **"SDK location not found"**: Asegúrate de que `ANDROID_HOME` está definido y apunta al SDK correcto.
- **"Could not find com.android.tools.build:gradle:8.x"**: Verifica JDK 17. Si usas SDK Manager, revisa que tienes instalado `build-tools` y `platforms`.
- **"No compatible version of expo-build-properties"**: Ejecuta `npx expo install expo-build-properties` para sincronizar versiones.
- **"Stripe Terminal plugin error"**: Prueba con `npx expo prebuild --clean` para regenerar proyectos nativos desde cero.
