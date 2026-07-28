# expo-yandex-mapkit

**Русский** | [English](./README.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/softwhere-uz/expo-yandex-mapkit/main/media/social-card.png" alt="expo-yandex-mapkit — Яндекс Карты для Expo: нативно, поддерживается, full-flavor" width="820">
</p>

Яндекс Карты (MapKit) для Expo — на базе Expo Modules API, настройка через конфиг-плагин, с поддержкой Новой архитектуры.

[![npm version](https://img.shields.io/npm/v/expo-yandex-mapkit.svg)](https://www.npmjs.com/package/expo-yandex-mapkit)
[![license](https://img.shields.io/npm/l/expo-yandex-mapkit.svg)](./LICENSE)
[![CI](https://github.com/softwhere-uz/expo-yandex-mapkit/actions/workflows/ci.yaml/badge.svg)](https://github.com/softwhere-uz/expo-yandex-mapkit/actions/workflows/ci.yaml)

📝 **Статья:** [Яндекс.Карты в Expo в 2026: поддерживаемый нативный SDK](https://habr.com/ru/articles/1063014/)

## Возможности

Полноценный SDK Яндекс Карт для Expo — полный паритет по функциональности с самой мощной обёрткой сообщества ([отслеживается в #1](https://github.com/softwhere-uz/expo-yandex-mapkit/issues/1)), на базе Expo Modules API, с поддержкой Новой архитектуры и настройкой целиком через конфиг-плагин. Всё перечисленное ниже работает на **обеих платформах** с одинаковым JS.

**Карта и камера**
- 🗺️ Нативная карта MapKit `<YandexMapView>` (Fabric / Новая архитектура)
- 🎥 Декларативная анимируемая камера (`cameraPosition`) + императивные методы через ref — `setCenter`, `setZoom`, `fitMarkers` / `fitAllMarkers` (с отступами по краям), `getCameraPosition`, `getVisibleRegion`, проекция мир↔экран, `takeSnapshot`; постоянный `mapPadding` для макетов с нижним листом / шапкой
- 👆 События нажатий / долгих нажатий / движения камеры / загрузки карты с идентичными payload'ами на iOS и Android
- 📌 **Нажатия на POI** (`onPoiTap`) — нажмите на встроенный значок места, чтобы получить его название и координату, затем выделите его через `selectGeoObject()` (**сверх паритета — ни одна другая RN-обёртка для Яндекс-карт этого не отдаёт**)
- 🎨 `mapType` (`map` / `satellite` / `hybrid` / `vector`), JSON-`mapStyle`, ночной режим, переключатели отдельных жестов, границы зума `minZoom` / `maxZoom`, размещение логотипа

**Объекты карты** (декларативные дети карты)
- 📍 `<Marker>` — иконки-картинки **или из React-детей** (надёжно, с конвейером повторного снапшота через `tracksViewChanges`), `onPress` с идентифицирующим payload'ом, `draggable` + события перетаскивания, `animatedMoveTo` / `animatedRotateTo` / `animateAlong`
- 〰️ `<Polyline>` (штрихи + обводка), `<Polygon>` (дырки через `innerRings`), `<Circle>`, `<Geojson>` (разворачивает объект GeoJSON в объекты карты)
- 🔵 `<Clusterer>` — декларативная кластеризация, где ваши собственные `<Marker>` служат render-пропом; настраиваемый бейдж (цвет / размер / **иконка**), `excludeFromCluster`, тап-для-подгонки, настраиваемые радиус / minZoom
- 📡 Слой геопозиции пользователя (кастомная иконка точки + стилизация круга точности, координаты через `onUserLocationChange`) и живой 🚦 слой пробок

**Модули flavor `full`** — задайте `flavor: 'full'` ([lite и full](#lite-и-full))
- 🔎 **Поиск и геокодинг** — `searchText`, `searchPoint` (обратный), `geocodeAddress` / `geocodePoint`, `resolveURI`; структурные `addressComponents`, рейтинг организаций `rating`, опции орфографии / сниппетов
- ⌨️ **Саджест** — поиск по мере ввода; координаты читаются **нативно** (без потери `center`)
- 🧭 **Маршрутизация** — `findRoutes` для авто / общественного транспорта / пешехода, с разбивкой на участки по секциям (пешком → автобус → пересадка → метро); рисуйте компонентом `<Route>` (цвет по типу участка)

**Установка и DX**
- 🔑 API-ключ на этапе **сборки** (конфиг-плагин) или в **рантайме** (`initialize`) — без правок `AndroidManifest.xml` / `AppDelegate`; ключ, заданный при сборке, инициализирует MapKit автоматически при старте (без проблемы порядка инициализации)
- 🔧 Один конфиг-плагин: версия MapKit, flavor `lite`/`full`, API-ключ, `locale` карты, разрешение на геопозицию, минимальный уровень Android minSdk (переопределение по платформам для всего) — вся настройка сводится к `npx expo prebuild`
- 📦 Доступен и под scoped-алиасом [`@softwhere-uz/expo-yandex-mapkit`](https://www.npmjs.com/package/@softwhere-uz/expo-yandex-mapkit) · 🌍 документация на [английском](./README.md) и [русском](./README.ru.md)

## Статус

**Стабильно — функциональность завершена.** Библиотека достигла полного паритета с поверхностью [`react-native-yamap-plus`](https://github.com/Qudaeo/react-native-yamap-plus) (и делает ряд вещей лучше) на протяжении релизов `1.0.0` → `2.0.0`; чек-лист паритета ([#1](https://github.com/softwhere-uz/expo-yandex-mapkit/issues/1)) закрыт. Вся поверхность — включая Поиск / Саджест / Маршрутизацию flavor `full` — **проверена в рантайме на iOS** и компилируется против реального MapKit SDK на обеих платформах в CI. Следует [semver](https://semver.org/): аддитивные изменения поднимают минорную версию, так что обновление в пределах `2.x` не требует миграции.

| Этап | Объём | Статус |
| --- | --- | --- |
| v0 | MapView, камера + события, ночной режим, маркеры-картинки и из React-детей, императивные методы через ref | ✅ **Готово** |
| v1 | Полилинии / полигоны / круги, кластеризация, геопозиция, пробки, JSON-стилизация, локаль | ✅ **Готово** (1.0.0) |
| v2 | Модули flavor `full`: поиск + геокодинг, саджест, маршрутизация | ✅ **Готово** (1.1.0 → 2.0.0) |
| v3 | Поддержка второго бренда — [Mappable](https://github.com/mappable-world); `expo-yandex-mapkit-dom` — DOM-компонент-фолбэк, чтобы карта работала в Expo Go и на вебе | Запланировано |

## Зачем

- Яндекс официально не поддерживает React Native (у Flutter есть официальный плагин от Яндекса, у React Native — нет).
- [`expo-maps`](https://docs.expo.dev/versions/latest/sdk/maps/) от самой Expo поддерживает только Apple Maps и Google Maps, без механизма сторонних провайдеров.
- Существующие обёртки сообщества в чём-то да уступают: заброшены, без исходников или задокументированы только на одном языке. Все они проделали ценную работу; ни одна не закрывает всё пересечение сразу.

Цель проекта — поддерживаемый, открытый вариант с документацией на английском и русском: Expo Modules API, настоящий конфиг-плагин, обе архитектуры React Native и актуальная версия MapKit.

## Альтернативы

Честное сравнение по состоянию на июль 2026. Библиотека теперь **не уступает признанным решениям по глубине функциональности** (полный паритет — маркеры, фигуры, кластеризация, геопозиция, пробки, поиск, саджест, маршрутизация) и вдобавок даёт Expo Modules API, настоящий конфиг-плагин, обе архитектуры React Native и документацию на английском и русском.

| | `expo-yandex-mapkit` (эта) | [`react-native-yamap-plus`](https://github.com/Qudaeo/react-native-yamap-plus) | `@yoyomobility/expo-yandex-maps` | [`react-native-yamap`](https://github.com/volga-volga/react-native-yamap) |
| --- | --- | --- | --- | --- |
| Активно поддерживается | ✓ | ✓ | ✓ | — (нет релизов с ноября 2024) |
| Открытый исходный код | ✓ MIT | ✓ MIT | — (репозиторий недоступен) | код открыт, лицензия не указана |
| Expo Modules API | ✓ | — (TurboModules) | ✓ | — (старый bridge) |
| Конфиг-плагин Expo | ✓ (версия, flavor, minSdk, API-ключ, локаль) | ✓ (flavor) | — (ручная настройка) | — (ручные правки нативных файлов) |
| Новая архитектура | ✓ | ✓ (v5+) | ✓ | — |
| Документация | EN + RU | RU | частично EN | частично |
| Дополнительные peer-зависимости | нет | нет | `react-native-reanimated ^4` | нет |
| Функциональность на сегодня | **полная** (маркеры, фигуры, кластеризация, геопозиция, пробки, поиск, саджест, маршрутизация) | глубокая (маркеры, фигуры, маршруты…) | глубокая (кластеризация, маршруты…) | самая глубокая, но не работает на актуальных Expo SDK |

## Совместимость

| | Требование |
| --- | --- |
| Expo SDK | Собирается и тестируется в CI на **SDK 57 (RN 0.86, Новая архитектура)**. Поддерживает **SDK 55+ (RN 0.83+)** — минимум указан в `peerDependencies`. |
| Android | minSdk **26** (Android 8.0) — гарантируется конфиг-плагином. |
| iOS | iOS **16.4+** — конфиг-плагин автоматически поднимает deployment target (в SDK 55/56 дефолт ниже). Только CocoaPods — MapKit не публикует SPM-пакет. |
| MapKit | По умолчанию **4.42.0**; переопределяется через [конфиг-плагин](#2-добавьте-конфиг-плагин). Яндекс рекомендует использовать актуальную версию. |
| Expo Go | Не поддерживается (нативный код) — нужен [development build](https://docs.expo.dev/develop/development-builds/introduction/). |
| Bare React Native | Поддерживается через Expo Modules — см. [Bare React Native](#bare-react-native). |

## Установка

```sh
npx expo install expo-yandex-mapkit
```

Предпочитаете scoped-пакеты? `@softwhere-uz/expo-yandex-mapkit` — официальный алиас: реэкспортирует этот пакет (включая конфиг-плагин) и обновляется автоматически.

### 1. Получите API-ключ

Создайте API-ключ для **MapKit Mobile SDK** в [кабинете разработчика Яндекса](https://developer.tech.yandex.ru/services/) (см. [документацию MapKit](https://yandex.com/dev/mapkit/doc/en/)). Задать ключ можно двумя способами — править `AndroidManifest.xml` или `AppDelegate` не нужно ни в одном:

- **На этапе сборки** — передайте `apiKey` в конфиг-плагин (ниже). MapKit инициализируется автоматически при старте, так что [`initialize`](#initializeapikey-string-promisevoid) можно вообще не вызывать и рендерить `<YandexMapView />` без гейтинга готовности. Самый простой путь, к тому же без проблемы порядка инициализации.
- **В рантайме** — вызовите [`initialize(apiKey)`](#initializeapikey-string-promisevoid) один раз до рендера. Подходит, когда ключ известен только в рантайме (получен с бэкенда, выбран под окружение и т. п.).

### 2. Добавьте конфиг-плагин

В `app.json` / `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-yandex-mapkit",
        { "apiKey": "YOUR_MAPKIT_API_KEY", "locale": "en_US", "flavor": "lite", "version": "4.42.0" }
      ]
    ]
  }
}
```

Все опции необязательны:

| Опция | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `apiKey` | `string` | — | API-ключ MapKit на этапе сборки. Если задан, MapKit инициализируется автоматически при старте и вызывать [`initialize`](#initializeapikey-string-promisevoid) не нужно. Опустите, чтобы задавать ключ в рантайме. |
| `locale` | `string` | — | Язык карты в формате `language` или `language_REGION` (например, `"en_US"`, `"ru_RU"`, `"tr_TR"`). Опустите, чтобы следовать локали устройства. Применяется и на рантайм-пути. |
| `version` | `string` | `"4.42.0"` | Версия нативного MapKit SDK (`x.y.z`). |
| `flavor` | `"lite" \| "full"` | `"lite"` | Flavor MapKit — см. [lite и full](#lite-и-full). |
| `locationWhenInUsePermission` | `string` | — | Описание для разрешения на геопозицию, которое нужно слою местоположения (`showUserPosition` / `followUser`). Если задано, записывается в iOS `NSLocationWhenInUseUsageDescription` и добавляет `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` в манифест Android. Опустите, если приложение само запрашивает геопозицию (например, через expo-location) или не показывает местоположение пользователя. |
| `android` | `{ version?, flavor?, apiKey?, locale? }` | — | Переопределения только для Android; имеют приоритет над значениями верхнего уровня. |
| `ios` | `{ version?, flavor?, apiKey?, locale? }` | — | Переопределения только для iOS; имеют приоритет над значениями верхнего уровня. |

Плагин также поднимает `android.minSdkVersion` до 26, если он не задан или ниже — MapKit требует Android API 26. Уже заданное большее значение никогда не понижается.

> **Куда попадает ключ.** `apiKey`/`locale` записываются в `<meta-data>` `AndroidManifest.xml` и в `Info.plist` на iOS; нативный модуль читает их при старте. Ключ MapKit — это клиентский credential (в кабинете Яндекса он ограничивается по id/подписи приложения, а не является секретом), поэтому коммитить его — тот же компромисс, что и с ключом Google Maps в манифесте. Если предпочитаете не хранить ключ в исходниках, используйте [`app.config.js`](https://docs.expo.dev/workflow/configuration/), читающий `apiKey` из `process.env`, либо рантайм-путь `initialize(apiKey)`.

### 3. Соберите проект

```sh
npx expo prebuild
npx expo run:android   # или: npx expo run:ios
```

либо соберите [development build](https://docs.expo.dev/develop/development-builds/introduction/) через EAS.

> **Библиотека не работает в Expo Go.** Она содержит нативный код, поэтому нужен development build или `expo run:*`. DOM-компонент-фолбэк для Expo Go запланирован (см. дорожную карту). На вебе текущая сборка один раз пишет предупреждение и ничего не рендерит — но не падает.

## Bare React Native

Библиотека построена на [Expo Modules API](https://docs.expo.dev/modules/overview/) и работает в bare-приложениях React Native — `expo prebuild` не нужен. Полный пакет `expo` обязателен (он даёт систему модулей, автолинковку, которая обнаруживает библиотеку, и обвязку `ExpoAppDelegate`/`ExpoReactHostFactory`); вариант «только `expo-modules-core`» не поддерживается.

**1. Установите Expo modules.** Для React Native **0.85 и старее**:

```sh
npx install-expo-modules@latest
```

Для React Native **0.86** утилита `install-expo-modules` вашу версию RN пока не поддерживает (на июль 2026 она завершается ошибкой «Unable to find compatible Expo SDK version») — выполните [ручные шаги установки из документации Expo](https://docs.expo.dev/bare/installing-expo-modules/), затем `npm install expo@^57.0.0`. Соблюдайте точное соответствие версий: SDK 57 ↔ RN 0.86, SDK 56 ↔ RN 0.85, SDK 55 ↔ RN 0.83 — не смешивайте.

> Утилита необязательна на любой версии RN: это всего лишь кодмод поверх задокументированных ручных правок (`use_expo_modules!` в Podfile, `ExpoAppDelegate`, Gradle-плагины `expo-autolinking-settings`/`expo-root-project`, обёртки в `MainApplication`/`MainActivity`), и внести их вручную — столь же поддерживаемый путь: именно так было собрано bare-RN-приложение, на котором проверялась эта библиотека. Единственное, от чего отказаться нельзя, — сама зависимость от пакета `expo`.

**2. Установите библиотеку.** `npm install expo-yandex-mapkit`. Автолинковка Expo обнаружит её через `expo-module.config.json` — никаких записей в Podfile, Gradle-инклюдов и правок манифеста.

**3. Android — поднимите `minSdkVersion` до 26** в блоке `ext` файла `android/build.gradle`:

```diff
     ext {
-        minSdkVersion = 24
+        minSdkVersion = 26
```

> В bare-приложениях `android.minSdkVersion=26` в `gradle.properties` **не сработает** — блок `ext` шаблона имеет приоритет. Правьте саму строку в `ext`.

**4. Android — при желании зафиксируйте версию/flavor MapKit** в `android/gradle.properties` (по умолчанию: `4.42.0`, `lite`):

```properties
expoYandexMapKit.version=4.42.0
expoYandexMapKit.flavor=lite
```

**5. iOS — deployment target 16.4+**: убедитесь, что в `ios/Podfile` стоит `platform :ios, '16.4'` (по умолчанию в RN 0.86 — 15.1) и что iOS Deployment Target у таргетов Xcode не ниже — иначе `pod install` упадёт с ошибкой про minimum deployment target.

**6. iOS — при желании зафиксируйте версию/flavor MapKit**: создайте `ios/Podfile.properties.json` (рекомендуется — файл коммитится, и сборки CI/EAS детерминированы):

```json
{ "expoYandexMapKit.version": "4.42.0", "expoYandexMapKit.flavor": "lite" }
```

либо экспортируйте `EXPO_YANDEX_MAPKIT_VERSION` / `EXPO_YANDEX_MAPKIT_FLAVOR` при запуске `pod install` — переменные окружения имеют приоритет над файлом, а на EAS/CI они должны присутствовать в окружении именно шага pod install (например, в `env` профиля сборки).

**7. Соберите и запустите.** `npx pod-install`, затем `npx react-native run-android` / `run-ios` (или `npx expo run:*`, если вы приняли интеграцию Expo CLI). Дальше — [`initialize`](#initializeapikey-string-promisevoid) и рендер как обычно: API-ключ в рантайме не требует правок нативных файлов и в bare-приложениях.

Полностью подключённое вручную референс-приложение лежит в [`bare-example/`](./bare-example) — все правки выше в виде реального кода; CI собирает его на обеих платформах против упакованного npm-тарбола при каждом изменении. Если ваш проект отличается от шаблона, ориентируйтесь на [руководство Expo по bare-установке](https://docs.expo.dev/bare/installing-expo-modules/).

## Использование

```tsx
import { initialize, YandexMapView } from 'expo-yandex-mapkit';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

export default function App() {
  const [mapKitReady, setMapKitReady] = useState(false);

  useEffect(() => {
    initialize(process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY ?? 'YOUR_MAPKIT_API_KEY')
      .then(() => setMapKitReady(true))
      .catch((error) => console.warn('MapKit failed to initialize', error));
  }, []);

  if (!mapKitReady) {
    return null;
  }

  return (
    <YandexMapView
      style={StyleSheet.absoluteFill}
      cameraPosition={{ latitude: 41.311081, longitude: 69.240562, zoom: 12 }}
      onMapReady={() => console.log('map ready')}
      onCameraPositionChanged={({ nativeEvent }) => console.log(nativeEvent.cameraPosition)}
      onMapPress={({ nativeEvent }) => console.log('press', nativeEvent.point)}
      onMapLongPress={({ nativeEvent }) => console.log('long press', nativeEvent.point)}
    />
  );
}
```

С `apiKey`, заданным **на этапе сборки** (конфиг-плагин), шага инициализации нет — рендерите карту напрямую:

```tsx
import { YandexMapView } from 'expo-yandex-mapkit';
import { StyleSheet } from 'react-native';

export default function App() {
  return (
    <YandexMapView
      style={StyleSheet.absoluteFill}
      cameraPosition={{ latitude: 41.311081, longitude: 69.240562, zoom: 12 }}
    />
  );
}
```

Полная версия (с переключателем ночного режима) — в [`example/`](./example).

## Справочник API

### `initialize(apiKey: string): Promise<void>`

Инициализирует нативный MapKit SDK. Вызывайте один раз, до рендера любого `YandexMapView` — карта, отрендеренная до инициализации, остаётся пустой и пишет предупреждение (без падения), а после успешного `initialize` восстанавливается автоматически.

- **Необязателен**, если на конфиг-плагине задан `apiKey` на этапе сборки: MapKit уже инициализирован при старте, и можно рендерить `<YandexMapView />`, не вызывая этот метод.
- Идемпотентность: повторный вызов с тем же ключом молча резолвится (в том числе когда этот ключ пришёл из конфиг-плагина).
- Вызов с *другим* ключом после успешной инициализации реджектится с кодом `ERR_YANDEX_MAPKIT_REINIT` (нативный SDK принимает ключ один раз, до инициализации).

### `setLocale(locale: string): Promise<void>` · `getLocale(): Promise<string | null>` · `resetLocale(): Promise<void>`

Получить/установить язык карты в рантайме, в формате `language` или `language_REGION` (например, `"en_US"`, `"ru_RU"`, `"tr_TR"`). `getLocale()` возвращает `null`, если карта следует локали устройства; `resetLocale()` возвращает к ней.

> ⚠️ **Ограничения SDK** (MapKit, не этой библиотеки): на **iOS** локаль применяется только если задать её **один раз, до создания первой карты**; на **Android** изменение полностью применяется лишь после перезапуска приложения. Для языка, известного на этапе сборки, предпочтительнее опция [`locale`](#2-добавьте-конфиг-плагин) конфиг-плагина — она применяется при старте и полностью исключает ловушку с порядком инициализации.

### `<YandexMapView />`

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `cameraPosition` | `CameraPosition` | — | Декларативная камера: изменение пропа двигает нативную камеру. Значения, равные текущей позиции (с точностью до 1e-6), игнорируются, поэтому «эхо» из `onCameraPositionChanged` не зацикливается. |
| `animated` | `boolean` | `true` | Анимировать декларативные перемещения камеры (0,3 с); мгновенно при `false`. |
| `nightMode` | `boolean` | `false` | Ночная цветовая схема MapKit. |
| `scrollGesturesEnabled` | `boolean` | `true` | Разрешить перемещение карты перетаскиванием. |
| `zoomGesturesEnabled` | `boolean` | `true` | Разрешить зум щипком / двойным тапом / тапом двумя пальцами. |
| `tiltGesturesEnabled` | `boolean` | `true` | Разрешить вертикальное перетаскивание двумя пальцами, наклоняющее камеру. |
| `rotateGesturesEnabled` | `boolean` | `true` | Разрешить поворот карты вращением двумя пальцами. |
| `fastTapEnabled` | `boolean` | `true` | Сообщать о тапе сразу, не дожидаясь, не станет ли он двойным. |
| `interactiveDisabled` | `boolean` | `false` | При `true` отключает сразу все четыре жеста перемещения — сокращение, перекрывающее отдельные пропсы `*GesturesEnabled`. События нажатий (`onMapPress`/`onMapLongPress`) продолжают срабатывать. |
| `minZoom` | `number` | — (дефолт MapKit) | Ограничить минимальный (максимально отдалённый) уровень зума камеры. Действует для жестов и программных перемещений. Запрошено в [yamap#187](https://github.com/volga-volga/react-native-yamap/issues/187) — ни одна другая обёртка этого не даёт. |
| `maxZoom` | `number` | — (дефолт MapKit) | Ограничить максимальный (максимально приближённый) уровень зума камеры. |
| `mapType` | `'none' \| 'map' \| 'satellite' \| 'hybrid' \| 'vector'` | — (дефолт SDK) | Базовый слой карты. `'map'`, `'satellite'` и `'hybrid'` — растровые; `'vector'` — стилизуемая векторная схема. Если не задан, карта сохраняет собственный дефолт MapKit (векторный). **`'satellite'` / `'hybrid'` требуют ключа с включённым доступом к спутниковым снимкам** — проп всё равно применяется (карта уходит с дорожной схемы и показывает пустую сетку тайлов), но на ключе MapKit Mobile SDK бесплатного тарифа спутниковые тайлы не загружаются; запросите доступ к снимкам для своего ключа в кабинете Яндекса. |
| `mapStyle` | `string` | — | [JSON-стиль карты Яндекса](https://yandex.com/dev/mapkit/doc/en/android/generated/style), применяемый к карте. **Влияет только на слои `'vector'` и `'hybrid'`** — оставьте `mapType` незаданным (дефолт — векторный) или задайте `mapType='vector'`; на растровых слоях `'map'` / `'satellite'` это тихий no-op. Передайте `''`, чтобы сбросить ранее применённый стиль. Невалидный JSON игнорируется с предупреждением. |
| `logoPosition` | `{ horizontal: 'left' \| 'center' \| 'right'; vertical: 'top' \| 'bottom' }` | — | Угол, к которому выравнивается обязательный логотип Яндекса. |
| `logoPadding` | `{ horizontal: number; vertical: number }` | — | Отступы логотипа, в px, от выровненных краёв (отрицательные приводятся к `0`). |
| `showUserPosition` | `boolean` | `false` | Показывать точку геопозиции устройства. Требуется разрешение на геопозицию (см. опцию плагина `locationWhenInUsePermission` или запросите его самостоятельно). |
| `followUser` | `boolean` | `false` | Держать камеру по центру на местоположении пользователя. Требует `showUserPosition`. |
| `userLocationIcon` | `ImageSourcePropType` | — | Пользовательская иконка точки геопозиции — используется и для статичной точки, и для стрелки направления. `require('./me.png')` или `{ uri }`. Требует `showUserPosition`; без значения остаётся стандартная точка MapKit. |
| `userLocationIconScale` | `number` | `1` | Множитель масштаба для `userLocationIcon`. |
| `userLocationAccuracyFillColor` | `ColorValue` | — | Цвет заливки круга точности вокруг точки. Без значения — стандартный для MapKit. |
| `userLocationAccuracyStrokeColor` | `ColorValue` | — | Цвет обводки (границы) круга точности. Без значения — стандартный для MapKit. |
| `userLocationAccuracyStrokeWidth` | `number` | — | Толщина обводки круга точности, в пунктах. |
| `trafficVisible` | `boolean` | `false` | Показывать слой пробок в реальном времени. |
| `mapPadding` | `{ top?, right?, bottom?, left? }` (пункты) | — | Постоянный отступ вокруг логической области карты (соглашение `mapPadding` из react-native-maps). Смещает оптический центр и цель перемещений камеры / жестов, чтобы контент не перекрывался нижним листом (bottom sheet), шапкой или плавающими элементами управления. Применяется как фокус-прямоугольник окна карты MapKit. `fitMarkers` / `fitAllMarkers` используют его как запасной вариант, если их собственный `edgePadding` не задан. |
| `style` | `StyleProp<ViewStyle>` | — | Стандартная стилизация React Native. |

> Для неинтерактивной карты (например, статичного превью) задайте `interactiveDisabled` (сокращение для отключения всех четырёх жестов перемещения); отключите `rotateGesturesEnabled` / `tiltGesturesEnabled`, чтобы карта оставалась плоской и ориентированной на север.

События:

| Событие | Payload `nativeEvent` | Когда срабатывает |
| --- | --- | --- |
| `onMapReady` | `{}` | Один раз на view, когда нативная карта создана (после `initialize`). |
| `onCameraPositionChanged` | `CameraPositionChangeEvent` | Пока камера движется; `reason` отличает жесты пользователя от программных перемещений, `finished` помечает конец движения. |
| `onMapPress` | `MapPressEvent` | Одиночное нажатие на пустую карту. |
| `onMapLongPress` | `MapPressEvent` | Долгое нажатие на карту. |
| `onPoiTap` | `PoiTapEvent` | Нажатие на встроенный объект карты (значок POI, топоним) — несёт его `name`, `point` и токен `selection` для `selectGeoObject()`. Нажатие на POI вызывает `onPoiTap` и **не** вызывает заодно `onMapPress` (соглашение `onPoiClick` из react-native-maps). **Ни один другой RN-обёртка для Яндекс-карт не отдаёт нажатия на встроенные POI** — они возвращают только голые координаты. |
| `onMapLoaded` | `MapLoadStatistics` | Когда карта завершает загрузку — несёт статистику рендеринга (`renderObjectCount`, `tileMemoryUsage`, тайминги загрузки). |
| `onUserLocationChange` | `UserLocationChangeEvent` | `{ point, accuracy }` устройства при появлении / перемещении точки геопозиции. Требует `showUserPosition` + разрешение на геолокацию. **Ни одна обёртка для Яндекс-карт не отдаёт координаты пользователя** — это закрывает частый запрос ([yamap#295](https://github.com/volga-volga/react-native-yamap/issues/295)). |

### Типы

```ts
type Point = { latitude: number; longitude: number };

type CameraPosition = {
  latitude: number;
  longitude: number;
  zoom: number;        // зум MapKit, ~0..21
  azimuth?: number;    // градусы, по умолчанию 0
  tilt?: number;       // градусы, по умолчанию 0
};

type CameraPositionChangeEvent = {
  cameraPosition: Required<CameraPosition>; // azimuth/tilt в payload'е присутствуют всегда
  reason: 'gestures' | 'application';
  finished: boolean;
};

type MapPressEvent = { point: Point };

// Непрозрачные id MapKit, идентифицирующие нажатый встроенный объект — достаточно, чтобы его (пере)выделить.
type GeoObjectSelection = {
  objectId: string;
  dataSourceName: string;
  layerId: string;
  groupId?: number;
};

type PoiTapEvent = {
  name?: string;               // подпись объекта, если есть
  point?: Point;               // координата объекта, если доступна
  selection: GeoObjectSelection; // передайте в mapRef.selectGeoObject(), чтобы выделить
};

type MapLoadStatistics = {
  renderObjectCount: number;      // число отрисованных объектов карты
  tileMemoryUsage: number;        // потребление памяти кэшем тайлов, в байтах
  curZoomModelsLoaded: number;    // тайминги загрузки — в нативных единицах SDK, различаются по платформам (iOS секунды / Android целое)
  curZoomPlacemarksLoaded: number;
  curZoomLabelsLoaded: number;
  curZoomGeometryLoaded: number;
  delayedGeometryLoaded: number;
  fullyLoaded: number;
  fullyAppeared: number;
};
```

Сырой нативный модуль также экспортируется как `ExpoYandexMapKitModule` — низкоуровневый обходной путь (escape hatch); его интерфейс не является частью стабильного API.

### Императивные методы

Вызывайте их через ref (`const mapRef = useRef<YandexMapViewRef>(null)`). Все возвращают Promise и выполняются в UI-потоке:

| Метод | Возвращает | Описание |
| --- | --- | --- |
| `setCenter(position, options?)` | `Promise<void>` | Переместить / анимировать камеру. `options.durationSeconds` (по умолчанию `0.3`, `0` = мгновенно) и `options.animation` (`'smooth' \| 'linear'`). Задаёт камеру целиком — если опустить `azimuth`/`tilt`, они сбрасываются в `0` (плоско, на север). No-op, пока карта не готова. |
| `setZoom(zoom, options?)` | `Promise<void>` | Анимировать зум, сохраняя текущий центр / азимут / наклон. |
| `fitMarkers(points, options?)` | `Promise<void>` | Переместить камеру так, чтобы все точки были видны. Одна точка перецентрирует на текущем зуме. `options.edgePadding` (`{ top, right, bottom, left }`, в пунктах) оставляет зазор для оверлеев. |
| `fitAllMarkers(options?)` | `Promise<void>` | Как `fitMarkers`, но для всех смонтированных `<Marker>` — точки передавать не нужно. No-op, если маркеров нет. |
| `getCameraPosition()` | `Promise<CameraPosition \| null>` | Текущая камера; `null`, пока карта не готова. |
| `getVisibleRegion()` | `Promise<VisibleRegion \| null>` | Видимый географический четырёхугольник (`topLeft` / `topRight` / `bottomLeft` / `bottomRight`). |
| `getScreenPoints(points)` | `Promise<(ScreenPoint \| null)[]>` | Спроецировать мировые координаты в экранные пиксели; `null` для точки, которую нельзя спроецировать (за пределами глобуса / за камерой). |
| `getWorldPoints(points)` | `Promise<(Point \| null)[]>` | Спроецировать экранные пиксели обратно в мировые координаты. |
| `takeSnapshot()` | `Promise<string \| null>` | Снять отрендеренную карту как base64-PNG **data URI** (`data:image/png;base64,…`), пригодный прямо для `<Image source={{ uri }}>`. Вызывайте после `onMapLoaded`. `null`, если карта не готова. Запрошено в [yamap#48](https://github.com/volga-volga/react-native-yamap/issues/48) — ни одна обёртка этого не даёт. |
| `selectGeoObject(selection)` | `Promise<void>` | Нарисовать нативную подсветку выделения MapKit вокруг встроенного POI / гео-объекта. Передайте `selection` из события `onPoiTap`. No-op, пока карта не готова. |
| `deselectGeoObject()` | `Promise<void>` | Снять подсветку выделения, нарисованную `selectGeoObject()`. |

```tsx
const mapRef = useRef<YandexMapViewRef>(null);
// ...
<YandexMapView ref={mapRef} style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }} />;

await mapRef.current?.setCenter({ latitude: 41.31, longitude: 69.24, zoom: 14 }, { durationSeconds: 0.4 });
const region = await mapRef.current?.getVisibleRegion();
const [screen] = await mapRef.current?.getScreenPoints([{ latitude: 41.31, longitude: 69.24 }]) ?? [];

// Нажатие на встроенный POI → выделить его нативной подсветкой MapKit:
<YandexMapView
  ref={mapRef}
  onPoiTap={({ nativeEvent }) => mapRef.current?.selectGeoObject(nativeEvent.selection)}
/>;
```

### `<Marker />`

Маркеры рендерятся как дети `YandexMapView`:

```tsx
import { YandexMapView, Marker } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }}>
  <Marker
    point={{ latitude: 41.31, longitude: 69.24 }}
    source={require('./assets/pin.png')}
    anchor={{ x: 0.5, y: 1 }}
    identifier="center"
    onPress={({ nativeEvent }) => console.log('tapped', nativeEvent.identifier)}
  />
</YandexMapView>;
```

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `point` | `Point` | — | Географическая позиция (обязательный). |
| `source` | `ImageSourcePropType` | — | Иконка — `require('./pin.png')` или `{ uri }` (http, `data:`, `file:` или встроенный ассет). Опустите, чтобы оставить дефолтный плейсмарк MapKit (пустой, пока не задана иконка). |
| `scale` | `number` | `1` | Множитель масштаба иконки. |
| `anchor` | `{ x: number; y: number }` | по иконке | Точка привязки в долях `[0,1]`; `{ x: 0.5, y: 1 }` — низ по центру. |
| `visible` | `boolean` | `true` | Показать/скрыть иконку. |
| `zIndex` | `number` | `0` | Порядок отрисовки среди объектов карты. |
| `rotated` | `boolean` | `false` | Если `true`, иконка поворачивается вместе с азимутом карты. |
| `handled` | `boolean` | `false` | Если `true`, нажатие поглощается и **не** вызывает `onMapPress` карты. |
| `identifier` | `string` | — | Непрозрачный id, возвращаемый в `onPress` — чтобы один обработчик различал маркеры. |
| `draggable` | `boolean` | `false` | Разрешить перетаскивание маркера — долгое нажатие «поднимает» его, затем тащите. Перетаскивание неуправляемое на нативной стороне; прочитайте `point` из `onDragEnd` и обновите своё состояние (и проп `point`), чтобы сохранить положение. Базовая возможность в react-native-maps ([yamap#217](https://github.com/volga-volga/react-native-yamap/issues/217)) — ни одна обёртка для Яндекс-карт этого не даёт. |
| `onPress` | `(event) => void` | — | `event.nativeEvent` — это `{ identifier?, point }`. |
| `onDragStart` / `onDrag` / `onDragEnd` | `(event) => void` | — | Срабатывают при перетаскивании маркера с `draggable`. `event.nativeEvent` — это `{ identifier?, point }`: живая точка перетаскивания в `onDrag`, положение покоя — на start/end. |
| `children` | `ReactNode` | — | React-контент, отрисованный как иконка маркера (кастомный пин). Имеет приоритет над `source`. Рендерится нативно через view-провайдер MapKit (без хрупкого снапшота в bitmap). |
| `tracksViewChanges` | `boolean` | `true` | Перерисовывать ли иконку при изменении `children`. Поставьте `false`, когда контент устоялся (например, статичный бабл) — иконка снапшотится один раз (большой выигрыш в производительности вместо перерисовки каждый кадр). |
| `excludeFromCluster` | `boolean` | `false` | Имеет смысл только внутри `<Clusterer>`: при `true` этот маркер никогда не сливается в кластер — он остаётся отдельным плейсмарком на любом зуме. |

**Кастомные маркеры (React-дети)** — любой RN-компонент как пин:

```tsx
<Marker point={{ latitude: 41.31, longitude: 69.24 }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
  <View style={{ backgroundColor: '#1e88e5', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10 }}>
    <Text style={{ color: '#fff', fontWeight: '700' }}>4.8★</Text>
  </View>
</Marker>
```

Императивные методы через ref маркера (`const ref = useRef<MarkerRef>(null)`):

| Метод | Описание |
| --- | --- |
| `animatedMoveTo(point, durationMs)` | Линейно анимирует маркер к `point`. |
| `animatedRotateTo(angle, durationMs)` | Линейно анимирует курс иконки к `angle` градусам. |
| `animateAlong(points, durationMs)` | Анимирует маркер вдоль полилинии (2+ точки) с постоянной скоростью, поворачивая по курсу каждого сегмента (задайте `rotated`, чтобы видеть поворот) — трекинг курьера / маршрута. [yamap#197](https://github.com/volga-volga/react-native-yamap/issues/197) и др.; ни одна обёртка этого не даёт. |

> Маркеры, смонтированные до завершения `initialize()`, привязываются автоматически после создания карты — гейтинг готовности для детей не нужен.

### `<Polyline />`

Линия как ребёнок `YandexMapView`:

```tsx
import { YandexMapView, Polyline } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }}>
  <Polyline
    points={[{ latitude: 41.31, longitude: 69.24 }, { latitude: 41.33, longitude: 69.28 }]}
    strokeColor="#1e88e5"
    strokeWidth={4}
    onPress={({ nativeEvent }) => console.log('line tapped at', nativeEvent.point)}
  />
</YandexMapView>;
```

| Проп | Тип | Описание |
| --- | --- | --- |
| `points` | `Point[]` | Вершины линии (2+). Обязателен. |
| `strokeColor` | `ColorValue` | Цвет линии. |
| `strokeWidth` | `number` | Толщина линии (пункты). |
| `outlineColor` / `outlineWidth` | `ColorValue` / `number` | Обводка, отрисованная под линией. |
| `dashLength` / `gapLength` / `dashOffset` | `number` | Штриховой узор (пункты). |
| `zIndex` | `number` | Порядок отрисовки среди объектов карты. |
| `handled` | `boolean` | Поглотить нажатие, чтобы оно не вызвало заодно `onMapPress` карты. |
| `onPress` | `(event) => void` | `event.nativeEvent` — это `{ point }`. |

### `<Polygon />` и `<Circle />`

Тот же принцип, как дети карты:

```tsx
import { YandexMapView, Polygon, Circle } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }}>
  <Polygon
    points={[/* outer ring, 3+ */]}
    innerRings={[[/* optional holes */]]}
    fillColor="rgba(30,136,229,0.3)"
    strokeColor="#1e88e5"
    strokeWidth={2}
  />
  <Circle center={{ latitude: 41.31, longitude: 69.24 }} radius={500} fillColor="rgba(244,67,54,0.2)" strokeColor="#f44336" />
</YandexMapView>;
```

- **`<Polygon>`**: `points` (внешнее кольцо, 3+), `innerRings?` (дырки), `fillColor`, `strokeColor`, `strokeWidth`, `zIndex`, `onPress`, `handled`.
- **`<Circle>`**: `center`, `radius` (в метрах), `fillColor`, `strokeColor`, `strokeWidth`, `zIndex`, `onPress`, `handled`.

### `<Route />`

Рисует `Route` (из `findRoutes`) цветными полилиниями — по одной на секцию, по типу участка (авто / пешком / транспорт), пешеходные участки — пунктиром. Обе обёртки для Яндекс-карт возвращают *данные* маршрута и оставляют отрисовку приложению; этот компонент рисует их из коробки:

```tsx
import { YandexMapView, Route, findDrivingRoutes } from 'expo-yandex-mapkit';

const [route] = await findDrivingRoutes([a, b]);
// ...
<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 11 }}>
  {route && <Route route={route} strokeWidth={6} />}
</YandexMapView>;
```

Пропсы: `route`, `strokeWidth`, `drivingColor` / `walkColor` / `transitColor`, `outlineColor`, `zIndex`, `onPress`. Если у маршрута нет `sections`, рисует всю геометрию `points` целиком.

### Геометрические утилиты

Чисто-JS помощники (без экземпляра карты, работают и на вебе):

```tsx
import { distanceBetween, pathLength, boundingBox } from 'expo-yandex-mapkit';

distanceBetween({ latitude: 41.31, longitude: 69.24 }, { latitude: 55.75, longitude: 37.62 }); // метры (haversine)
pathLength([p1, p2, p3]); // суммарная длина полилинии в метрах
boundingBox([p1, p2, p3]); // { southWest, northEast } | null — для fitMarkers / окна поиска
```

### `<Geojson />`

Рендер объекта [GeoJSON](https://datatracker.ietf.org/doc/html/rfc7946) напрямую — чисто-JS «сахар», разворачивающийся в `<Marker>` / `<Polyline>` / `<Polygon>` (соглашение react-native-maps; ни одна другая обёртка для Яндекс-карт этого не имеет):

```tsx
import { YandexMapView, Geojson } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 11 }}>
  <Geojson
    geojson={featureCollection}
    strokeColor="#1e88e5"
    strokeWidth={3}
    fillColor="rgba(30,136,229,0.2)"
    markerSource={require('./pin.png')}
    onPress={(feature) => console.log('нажата', feature.properties)}
  />
</YandexMapView>;
```

Принимает `FeatureCollection`, `Feature` или голую `Geometry`. `Point`/`MultiPoint` → маркеры, `LineString`/`MultiLineString` → полилинии, `Polygon`/`MultiPolygon` → полигоны (первое кольцо — внешнее, остальные — дырки); `GeometryCollection` разворачивается рекурсивно. Пропсы: `geojson`, `markerSource` / `markerScale`, `strokeColor` / `strokeWidth`, `fillColor`, `zIndex`, `onPress(feature)`. GeoJSON `[lng, lat]` конвертируется в `{ latitude, longitude }` за вас.

### `<Clusterer />`

Группирует детей `<Marker>` в кластеры. Оберните маркеры, которые нужно кластеризовать, в `<Clusterer>` — каждый маркер сохраняет все свои обычные возможности (иконка-картинка или из React-детей, `onPress`, `identifier`):

```tsx
import { YandexMapView, Clusterer, Marker } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 10 }}>
  <Clusterer
    clusterRadius={60}
    minZoom={12}
    clusterColor="#2E7D32"
    onClusterPress={({ nativeEvent }) => console.log(`cluster of ${nativeEvent.size}`)}
  >
    {places.map((p) => (
      <Marker key={p.id} point={p.point} identifier={p.id} onPress={onMarkerPress} />
    ))}
  </Clusterer>
</YandexMapView>;
```

Отдельного API «кластеризуемого маркера» нет, как и render-пропа `renderMarker` — render-пропом служит тот же `<Marker>`, что и везде. Тап по кластеру подгоняет камеру под его маркеры (`fitClusterOnPress`, включён по умолчанию) и вызывает `onClusterPress`. Собственный `onPress` отдельного `<Marker>` продолжает срабатывать, как только маркер показан вне кластера (при приближении дальше `minZoom`). Кластеризуются только дети `<Marker>`; фигуры размещаются прямо под картой.

| Проп | Тип | Описание |
| --- | --- | --- |
| `clusterRadius` | `number` | Дистанция слияния в пунктах/dp — чем больше, тем агрессивнее группировка. По умолчанию `60`. |
| `minZoom` | `number` | Кластеризация применяется при зуме ≤ этого; приближение дальше разбивает кластеры. По умолчанию `12`. |
| `clusterColor` | `ColorValue` | Цвет заливки бейджа кластера. По умолчанию `#3478F6`. |
| `clusterTextColor` | `ColorValue` | Цвет текста-счётчика на бейдже кластера. По умолчанию белый. |
| `clusterTextSize` | `number` | Размер текста-счётчика на бейдже кластера (пункты). По умолчанию `13`. |
| `clusterSize` | `number` | Диаметр бейджа кластера (пункты); растёт для счётчиков из 3+ цифр. По умолчанию `36`. Игнорируется, если задан `clusterIcon`. |
| `clusterIcon` | `ImageSourcePropType` | Пользовательская картинка бейджа — `require('./cluster.png')` или `{ uri }`. Заменяет отрисованный цветной кружок; счётчик всё равно рисуется поверх (с учётом `clusterTextColor`/`clusterTextSize`/`clusterTextOffset`), в собственном размере картинки. Без значения рисуется дефолтный кружок. |
| `clusterTextOffset` | `{ x: number; y: number }` | Сдвиг текста-счётчика внутри бейджа, в пунктах (положительный `x` → вправо, `y` → вниз). По умолчанию по центру. Применяется и к кружку, и к бейджу с `clusterIcon`. |
| `fitClusterOnPress` | `boolean` | Анимировать камеру под маркеры кластера при тапе. По умолчанию `true`. |
| `onClusterPress` | `(event) => void` | `event.nativeEvent` — это `{ size, point }`. |

Исключите маркер из кластеризации пропом `excludeFromCluster` у `<Marker>` — он останется отдельным плейсмарком на любом зуме (удобно для пина «вы здесь» среди кластеризуемых точек данных).

> **О `onClusterPlacemarkPress` и императивных `appendClusterMarkers` / `clearClusterMarkers`** (оба есть в react-native-yamap-plus): декларативный дизайн этой библиотеки покрывает их без лишнего API. Собственный `onPress` кластеризуемого маркера уже срабатывает, когда маркер показан вне кластера, так что отдельный колбэк нажатия на плейсмарк подключать не нужно; а добавление/удаление/замену кластеризуемых маркеров вы делаете, рендеря детей `<Marker>` из состояния (`setMarkers(...)`), — это и есть batch-API, никаких императивных `append`/`clear`, которые надо держать синхронными.

### `suggest()` — поиск по мере ввода

> **Требует flavor `full`** — задайте `flavor: 'full'` в [конфиг-плагине](#2-добавьте-конфиг-плагин). На `lite` реджектится с понятным сообщением.

```tsx
import { suggest, resetSuggest } from 'expo-yandex-mapkit';

const items = await suggest('coffee', {
  userPosition: { latitude: 41.31, longitude: 69.24 }, // bias toward the user
  types: ['biz', 'geo'], // organizations + places (also 'transit')
});
// items: { title, subtitle?, searchText, uri?, center?, distance? }[]
// Call resetSuggest() to cancel an in-flight request (e.g. on unmount).
```

Каждый результат несёт свою координату `center` **напрямую** (прочитанную нативно), когда MapKit её предоставляет — в отличие от линейки, паритет с которой мы держим: там `uri` разбирался повторно в JS и [координаты терялись](https://github.com/Qudaeo/react-native-yamap-plus/issues/27) для org/непрозрачных URI. Когда `center` отсутствует, используйте `searchText` (полный поиск) или `uri`. Требует инициализированного MapKit (через `initialize()` или ключ на этапе сборки).

| Опция | Тип | Описание |
| --- | --- | --- |
| `userPosition` | `Point` | Смещать результаты к этому местоположению. |
| `boundingBox` | `{ southWest: Point; northEast: Point }` | Смещать/ограничивать результаты этим прямоугольником. |
| `suggestWords` | `boolean` | Также предлагать завершения слов запроса. По умолчанию `true`. |
| `types` | `('geo' \| 'biz' \| 'transit')[]` | Какие виды результатов возвращать. По умолчанию все три. |

### `searchText()` / `searchPoint()` — поиск и геокодинг

> **Требует flavor `full`** (на `lite` реджектится).

```tsx
import { searchText, searchPoint, geocodeAddress, geocodePoint } from 'expo-yandex-mapkit';

const places = await searchText('coffee', {
  boundingBox: { southWest: { latitude: 41.28, longitude: 69.18 }, northEast: { latitude: 41.36, longitude: 69.32 } },
  searchTypes: ['biz'],
});
const here = await searchPoint({ latitude: 41.31, longitude: 69.24 }); // reverse geocoding
// results: { name?, description?, point?, formattedAddress?, addressComponents? }[]
```

- `searchText(query, options?)` — полнотекстовый поиск рядом с окном (`boundingBox`/`userPosition`, иначе по всему миру).
- `searchPoint(point, options?)` — обратный геокодинг (объекты в координате; `options.zoom` задаёт детализацию).
- `geocodeAddress(address, options?)` — `searchText`, ограниченный топонимами (`geo`); `geocodePoint(point, options?)` — алиас для `searchPoint`.
- `resolveURI(uri, options?)` — разрешить URI объекта `ymapsbm1://…` (например, `SuggestItem.uri`) в полные результаты; штатный способ получить координаты для подсказки, у которой не было `center`.

Результат-топоним также несёт `addressComponents` — структурную разбивку, каждый элемент `{ name, kinds }`, где `kinds` в snake_case (`country`, `province`, `locality`, `district`, `street`, `house`, `metro_station`, …). Результат-организация, запрошенный со сниппетом `'rating'`, несёт `rating` (0–5) + `ratingsCount`. Опции: `userPosition`, `boundingBox`, `searchTypes` (`'geo'` топонимы / `'biz'` организации, по умолчанию `['geo']`), `resultPageSize`, `zoom`, `disableSpellingCorrection` и `snippets` (`'rating'` / `'photos'` / `'panoramas'`). Требует инициализированного MapKit.

### `findRoutes()` — маршрутизация

> **Требует flavor `full`** (на `lite` реджектится).

```tsx
import { findRoutes, findDrivingRoutes } from 'expo-yandex-mapkit';

const routes = await findRoutes(
  [{ latitude: 41.31, longitude: 69.24 }, { latitude: 41.33, longitude: 69.29 }],
  'masstransit', // or 'driving' | 'pedestrian'
);
// routes[0]: { time?, timeWithTraffic?, distance?, walkingDistance?, transfersCount?, points }
// Draw it: <Polyline points={routes[0].points} />
```

- `findRoutes(points, mode)` — 2+ путевых точки, `mode` = `'driving'` | `'masstransit'` | `'pedestrian'`; резолвит лучший маршрут первым.
- `findDrivingRoutes` / `findMasstransitRoutes` / `findPedestrianRoutes` — удобные обёртки.

Каждый `Route` несёт сводку (`time`; `timeWithTraffic` + `distance` для авто; `walkingDistance` + `transfersCount` для общественного транспорта), геометрию `points` и `sections` — маршрут, разбитый на участки. Каждый `RouteSection` — это `{ type, time?, points, transports? }`: `type` — `'car'`, `'walk'`, `'waiting'` или тип транспортного средства (`'bus'`, `'underground'`, …), `transports` сопоставляет каждому типу транспорта названия его линий, а `points` — фрагмент полилинии этого участка. Так маршрут на общественном транспорте читается как «пешком → автобус 42 → пересадка → метро», каждый участок можно отрисовать отдельно. Требует инициализированного MapKit.

## lite и full

Яндекс поставляет MapKit в двух flavor'ах. Библиотека по умолчанию использует `lite`; выберите `full` через [конфиг-плагин](#2-добавьте-конфиг-плагин), когда нужны **поиск, саджест, геокодинг или маршрутизация** — все они полностью реализованы и требуют артефакта `full`. На `lite` эти функции реджектятся с понятным сообщением «requires the full flavor», так что lite-приложение на них не падает. `full` подтягивает более крупный SDK (больше бинарник, дольше первая сборка), поэтому оставайтесь на `lite`, если вы только рендерите карты / маркеры / фигуры / кластеризацию / геопозицию / пробки.

| Возможность | `lite` | `full` |
| --- | --- | --- |
| Рендеринг карты, маркеры, полилинии/полигоны | ✓ | ✓ |
| Кластеризация, слой пробок, геопозиция | ✓ | ✓ |
| Маршрутизация | — | ✓ |
| Поиск + саджест | — | ✓ |
| Геокодинг | — | ✓ |
| Панорамы | — | ✓ |

Офлайн-карты есть в обоих flavor'ах, но требуют платной лицензии MapKit. Лимиты и цены смотрите в [условиях Яндекса](https://yandex.com/maps-api) — цифры меняются и зависят от тарифа, поэтому здесь они сознательно не приводятся.

## Устранение неполадок и FAQ

**Карта пустая.**
Две типичные причины: `initialize(apiKey)` не был вызван (или завершился с ошибкой — повесьте `.catch` и посмотрите сообщение) и при этом на конфиг-плагине не задан `apiKey` на этапе сборки, либо API-ключ невалиден / не включён для MapKit Mobile SDK. Смотрите нативные логи: `adb logcat | grep -i -E 'mapkit|yandex'` на Android, консоль Xcode на iOS. View, смонтированный до завершения `initialize`, восстановится автоматически.

**«…не работает в Expo Go» / падает в Expo Go.**
Ожидаемо — нативные модули в Expo Go не загружаются. Используйте `npx expo run:android|ios` или development build через EAS. DOM-фолбэк для Expo Go — в дорожной карте (v3).

**Сборка Android падает с ошибкой manifest merger / minSdkVersion.**
MapKit требует Android API 26. Конфиг-плагин поднимает `android.minSdkVersion` автоматически — проверьте, что `expo-yandex-mapkit` действительно указан в `app.json` → `plugins`, и перезапустите `npx expo prebuild`.

**В iOS-симуляторе карта чёрная или пустая.**
У GPU-рендеринга MapKit известны причуды в симуляторе (на это жалуются во всех обёртках над MapKit). Проверьте на физическом устройстве, прежде чем искать проблему в конфигурации.

**Какую версию MapKit пиновать?**
По умолчанию используется версия, с которой тестировался этот релиз (4.42.0). Яндекс рекомендует свежий MapKit; переопределите опцией `version` плагина, если новая версия нужна раньше, чем мы обновим дефолт.

**Можно ли сменить API-ключ в рантайме?**
Нет — нативный SDK принимает ключ один раз. Повторный `initialize` с другим ключом реджектится с `ERR_YANDEX_MAPKIT_REINIT`.

**А на вебе работает?**
Пока нет: веб-сборка один раз пишет предупреждение и ничего не рендерит (сознательно, вместо падения). DOM-компонент на базе `ymaps3` запланирован (v3).

## Переход с react-native-yamap

Многие приходят с `react-native-yamap` (нет релизов в npm с 2024 года). Честно: API v0 намного уже — карта, камера, нажатия, ночной режим, — поэтому полного пути миграции пока нет. Полноценный гайд с таблицей соответствия пропов появится после маркеров и фигур; где это осмысленно, имена пропов будут повторять `react-native-yamap`, чтобы переезд был механическим.

## Участие в разработке

Контрибьюции приветствуются — см. [CONTRIBUTING.md](./CONTRIBUTING.md) (на английском): настройка окружения (example-приложение работает через CNG: `npx expo prebuild` генерирует нативные проекты и прогоняет конфиг-плагин), подводные камни нативного кода (слабые ссылки на слушатели MapKit, три синхронизированных пина версии) и соглашения о коммитах.

**Для мейнтейнеров / релизы:** плейбук публикации в npm — разовая настройка организации и trusted publisher, затем `npm version && git push --follow-tags`, запускающий [`release.yaml`](./.github/workflows/release.yaml) с provenance — в [CONTRIBUTING.md → Releasing](./CONTRIBUTING.md#releasing).

## Правовая оговорка

Проект использует Yandex MapKit, принадлежащий Яндексу. См. их [условия использования](https://yandex.com/maps-api). Проект не аффилирован с Яндексом и не одобрен им.

Не имеет отношения к npm-пакету `expo-yandex-maps` (не поддерживается с 2023 года).

## Лицензия

[MIT](./LICENSE)
