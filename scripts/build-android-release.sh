#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/share/strikr-build/jdk}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/.local/share/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "JDK 21 tidak ditemukan di $JAVA_HOME." >&2
  echo "Set JAVA_HOME ke JDK 21 sebelum menjalankan script ini." >&2
  exit 1
fi

if [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  echo "Android SDK 36 tidak ditemukan di $ANDROID_HOME." >&2
  echo "Set ANDROID_HOME ke Android SDK yang memiliki platforms;android-36." >&2
  exit 1
fi

if [ ! -f "$ROOT/android/keystore.properties" ] || [ ! -f "$ROOT/android/strikr-release.keystore" ]; then
  echo "Keystore release tidak ditemukan." >&2
  echo "Letakkan strikr-release.keystore dan keystore.properties di folder android/." >&2
  exit 1
fi

npm run build
npx cap sync android

cd android
./gradlew assembleRelease bundleRelease
cd ..

VERSION="$(sed -n 's/^[[:space:]]*versionName "\(.*\)"/\1/p' android/app/build.gradle | head -1)"
APK="$(find android/app/build/outputs/apk/release -maxdepth 1 -name '*.apk' | head -1)"
AAB="$(find android/app/build/outputs/bundle/release -maxdepth 1 -name '*.aab' | head -1)"

if [ -z "$APK" ] || [ -z "$AAB" ]; then
  echo "Build selesai tetapi artefak release tidak ditemukan." >&2
  exit 1
fi

mkdir -p release
cp "$APK" "release/Strikr-${VERSION}-release.apk"
cp "$AAB" "release/Strikr-${VERSION}-release.aab"

APKSIGNER="$ANDROID_HOME/build-tools/36.0.0/apksigner"
if [ -x "$APKSIGNER" ]; then
  "$APKSIGNER" verify --print-certs "release/Strikr-${VERSION}-release.apk"
fi

cd release
sha256sum "Strikr-${VERSION}-release.apk" "Strikr-${VERSION}-release.aab" > "Strikr-${VERSION}-SHA256SUMS.txt"
cd ..

echo
echo "Release siap:"
echo "  release/Strikr-${VERSION}-release.apk"
echo "  release/Strikr-${VERSION}-release.aab"
