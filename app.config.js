// Expo app config (migrated from app.json so the Google Maps API key can be
// sourced from the environment instead of committed as a literal).
//
// This file is evaluated in Node — at `expo prebuild` / dev-client build time
// locally (reading process.env, populated from the root .env), and on Expo's
// servers during EAS builds (reading the GOOGLE_MAPS_API_KEY EAS secret).
// It is NOT bundled into the app, so this is not the same mechanism as
// EXPO_PUBLIC_* vars — do not prefix the key that way.
//
// Warn-not-throw on a missing key (2026-07-20): this used to hard-throw here,
// which is suspected to be the actual cause of a persistent, unexplained
// `eas build` failure ("expo config --json exited with non-zero code: 1",
// with no further detail) — eas-cli's internal preflight spawns its own
// `expo config --json` subprocess to read this file, and if THAT subprocess
// doesn't load .env the same way a normal terminal session does, this file's
// own throw would fire inside it, which is indistinguishable from a generic
// eas-cli crash from the outside. The real remote EAS build step reads the
// key from the EAS secret directly and is unaffected either way — this only
// changes what happens during local/preflight config *introspection* when
// the key isn't visible in that specific context.
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!googleMapsApiKey) {
  console.warn(
    'WARNING: GOOGLE_MAPS_API_KEY is not set in this process\'s environment. ' +
      'Falling back to an empty string for config evaluation — maps will not ' +
      'work in a build produced with this value, but config reading itself ' +
      'will not crash. Add it to the root .env for local builds, or an EAS ' +
      'secret named GOOGLE_MAPS_API_KEY for cloud builds.'
  );
}

module.exports = {
  expo: {
    name: 'RecovAI',
    slug: 'RecovAI',
    owner: 'thebuilder0000',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'recovai',
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.saadlife.recovai',
      // Firebase Cloud Messaging config, required by expo-notifications on
      // Android since Expo retired its shared FCM backend (2026-07-20 —
      // this file's public-facing project identifiers, safe to commit unlike
      // the separate FCM V1 service-account key, which is uploaded to EAS
      // directly via `eas credentials`, never placed in this repo).
      googleServicesFile: './google-services.json',
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'ACTIVITY_RECOGNITION',
        'RECEIVE_BOOT_COMPLETED',
        'WAKE_LOCK',
        'SCHEDULE_EXACT_ALARM',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.health.READ_STEPS',
      ],
      adaptiveIcon: {
        backgroundColor: '#E6F7F5',
        foregroundImage: './assets/android-icon-foreground.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      'expo-status-bar',
      '@react-native-community/datetimepicker',
      [
        'expo-location',
        {
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      'expo-font',
      'expo-task-manager',
      [
        'expo-notifications',
        {
          // Reuse the existing white-on-transparent silhouette (also the
          // adaptive monochrome icon) — Android notification icons must be a
          // white silhouette, which this already is. No new asset needed.
          icon: './assets/android-icon-monochrome.png',
          color: '#2563EB', // doctor-role accent (theme.ts `secondary`)
        },
      ],
      'react-native-health-connect',
      'expo-health-connect',
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 35,
            minSdkVersion: 26,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'f0b7541d-0f1c-46af-825d-abb944800dbb',
      },
    },
  },
};
