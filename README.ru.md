# expo-yandex-mapkit

[English](./README.md) | **Русский**

Яндекс Карты (MapKit) для Expo — на базе Expo Modules API, настройка через конфиг-плагин, с поддержкой Новой архитектуры.

[![npm version](https://img.shields.io/npm/v/expo-yandex-mapkit.svg)](https://www.npmjs.com/package/expo-yandex-mapkit)
[![license](https://img.shields.io/npm/l/expo-yandex-mapkit.svg)](./LICENSE)
[![CI](https://github.com/softwhere-uz/expo-yandex-mapkit/actions/workflows/ci.yaml/badge.svg)](https://github.com/softwhere-uz/expo-yandex-mapkit/actions/workflows/ci.yaml)

## Возможности

- 🗺️ Нативная карта Yandex MapKit на Android и iOS (Fabric / Новая архитектура)
- 🎥 Декларативное управление камерой с опциональной анимацией (`cameraPosition` + `animated`)
- 👆 События камеры, нажатий и долгих нажатий — одинаковые payload'ы на обеих платформах
- 🌙 Ночной режим
- 🔑 API-ключ задаётся в **рантайме** через `initialize(apiKey)` **или** на этапе **сборки** через конфиг-плагин (`apiKey`) — в обоих случаях без правок `AndroidManifest.xml` / `AppDelegate`; ключ, заданный при сборке, инициализирует MapKit автоматически при старте, так что нет ни ритуала инициализации, ни проблемы порядка инициализации
- 🔧 Конфиг-плагин: версия MapKit и flavor `lite`/`full`, API-ключ и `locale` карты на этапе сборки (всё — с переопределением по платформам), автоматическое поднятие minSdk на Android — вся настройка сводится к `npx expo prebuild`
- 📦 Доступен и под scoped-алиасом [`@softwhere-uz/expo-yandex-mapkit`](https://www.npmjs.com/package/@softwhere-uz/expo-yandex-mapkit)
- 🌍 Документация на [английском](./README.md) и [русском](./README.ru.md)

В планах: маркеры (включая иконки из React-детей), полилинии/полигоны/круги, кластеризация, слой геопозиции, пробки, JSON-стилизация, поиск/геокодинг/маршрутизация (flavor `full`), поддержка [Mappable](https://github.com/mappable-world) (второй бренд того же SDK) и DOM-компонент-фолбэк для Expo Go и веба. См. дорожную карту ниже.

## Статус

**Ранняя стадия разработки (v0.0.x).** Что есть уже сейчас: нативный `YandexMapView` для Android и iOS с декларативной камерой, событиями камеры/нажатий и ночным режимом, `initialize(apiKey)` на стороне JS (без правок нативных файлов) и конфиг-плагин, который выбирает версию и flavor MapKit, при желании внедряет API-ключ и локаль карты на этапе сборки и принудительно поднимает Android minSdk до 26. Между релизами 0.0.x возможны ломающие изменения.

| Этап | Объём | Статус |
| --- | --- | --- |
| v0 | MapView, управление камерой + события, нажатия, ночной режим, маркеры (вкл. иконки из React-детей) | **Готово** — MapView, камера + события, ночной режим, маркеры (картинки **и** React-дети), императивные методы |
| v1 | Полилинии, полигоны, круги, кластеризация, слой геопозиции, пробки, JSON-стилизация карты | Запланировано |
| v2 | Возможности flavor `full`: поиск + саджест, геокодинг, маршрутизация | Запланировано |
| v3 | Поддержка второго бренда — Mappable (mappable.world); `expo-yandex-mapkit-dom` — DOM-компонент-фолбэк, чтобы карта работала в Expo Go и на вебе | Запланировано |

## Зачем

- Яндекс официально не поддерживает React Native (у Flutter есть официальный плагин от Яндекса, у React Native — нет).
- [`expo-maps`](https://docs.expo.dev/versions/latest/sdk/maps/) от самой Expo поддерживает только Apple Maps и Google Maps, без механизма сторонних провайдеров.
- Существующие обёртки сообщества в чём-то да уступают: заброшены, без исходников или задокументированы только на одном языке. Все они проделали ценную работу; ни одна не закрывает всё пересечение сразу.

Цель проекта — поддерживаемый, открытый вариант с документацией на английском и русском: Expo Modules API, настоящий конфиг-плагин, обе архитектуры React Native и актуальная версия MapKit.

## Альтернативы

Честное сравнение по состоянию на июль 2026. Если маркеры, маршруты или кластеризация нужны **уже сегодня** — библиотеки ниже функциональнее, чем наш v0; компромиссы — в остальных строках.

| | `expo-yandex-mapkit` (эта) | [`react-native-yamap-plus`](https://github.com/Qudaeo/react-native-yamap-plus) | `@yoyomobility/expo-yandex-maps` | [`react-native-yamap`](https://github.com/volga-volga/react-native-yamap) |
| --- | --- | --- | --- | --- |
| Активно поддерживается | ✓ | ✓ | ✓ | — (нет релизов с ноября 2024) |
| Открытый исходный код | ✓ MIT | ✓ MIT | — (репозиторий недоступен) | код открыт, лицензия не указана |
| Expo Modules API | ✓ | — (TurboModules) | ✓ | — (старый bridge) |
| Конфиг-плагин Expo | ✓ (версия, flavor, minSdk, API-ключ, локаль) | ✓ (flavor) | — (ручная настройка) | — (ручные правки нативных файлов) |
| Новая архитектура | ✓ | ✓ (v5+) | ✓ | — |
| Документация | EN + RU | RU | частично EN | частично |
| Дополнительные peer-зависимости | нет | нет | `react-native-reanimated ^4` | нет |
| Функциональность на сегодня | карта, камера, события, ночной режим | глубокая (маркеры, фигуры, маршруты…) | глубокая (кластеризация, маршруты…) | самая глубокая, но не работает на актуальных Expo SDK |

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

Создайте API-ключ для **MapKit Mobile SDK** в [кабинете разработчика Яндекса](https://developer.tech.yandex.ru/services/) (см. [документацию MapKit](https://yandex.ru/maps-api/docs/mapkit/index.html)). Задать ключ можно двумя способами — править `AndroidManifest.xml` или `AppDelegate` не нужно ни в одном:

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
        { "apiKey": "YOUR_MAPKIT_API_KEY", "locale": "ru_RU", "flavor": "lite", "version": "4.42.0" }
      ]
    ]
  }
}
```

Все опции необязательны:

| Опция | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `apiKey` | `string` | — | API-ключ MapKit на этапе сборки. Если задан, MapKit инициализируется автоматически при старте и вызывать [`initialize`](#initializeapikey-string-promisevoid) не нужно. Опустите, чтобы задавать ключ в рантайме. |
| `locale` | `string` | — | Язык карты в формате `language` или `language_REGION` (например, `"ru_RU"`, `"en_US"`, `"tr_TR"`). Опустите, чтобы следовать локали устройства. Применяется и на рантайм-пути. |
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

> ⚠️ **Ограничения SDK** (MapKit, не этой библиотеки): на **iOS** локаль применяется только если задать её **один раз, до создания первой карты**; на **Android** изменение полностью применяется лишь после перезапуска приложения. Для языка, известного на этапе сборки, предпочтительнее опция [`locale`](#config-plugin) конфиг-плагина — она применяется при старте и полностью исключает ловушку с порядком инициализации.

### `<YandexMapView />`

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `cameraPosition` | `CameraPosition` | — | Декларативная камера: изменение пропа двигает нативную камеру. Значения, равные текущей позиции (с точностью до 1e-6), игнорируются, поэтому «эхо» из `onCameraPositionChanged` не зацикливается. |
| `animated` | `boolean` | `true` | Анимировать декларативные перемещения камеры (0,3 с); мгновенно при `false`. |
| `nightMode` | `boolean` | `false` | Ночная цветовая схема MapKit. |
| `showUserPosition` | `boolean` | `false` | Показывать точку геопозиции устройства. Требуется разрешение на геопозицию (см. опцию плагина `locationWhenInUsePermission` или запросите его самостоятельно). |
| `followUser` | `boolean` | `false` | Держать камеру по центру на местоположении пользователя. Требует `showUserPosition`. |
| `userLocationIcon` | `ImageSourcePropType` | — | Пользовательская иконка точки геопозиции — используется и для статичной точки, и для стрелки направления. `require('./me.png')` или `{ uri }`. Требует `showUserPosition`; без значения остаётся стандартная точка MapKit. |
| `userLocationIconScale` | `number` | `1` | Множитель масштаба для `userLocationIcon`. |
| `userLocationAccuracyFillColor` | `ColorValue` | — | Цвет заливки круга точности вокруг точки. Без значения — стандартный для MapKit. |
| `userLocationAccuracyStrokeColor` | `ColorValue` | — | Цвет обводки (границы) круга точности. Без значения — стандартный для MapKit. |
| `userLocationAccuracyStrokeWidth` | `number` | — | Толщина обводки круга точности, в пунктах. |
| `trafficVisible` | `boolean` | `false` | Показывать слой пробок в реальном времени. |
| `style` | `StyleProp<ViewStyle>` | — | Стандартная стилизация React Native. |

События:

| Событие | Payload `nativeEvent` | Когда срабатывает |
| --- | --- | --- |
| `onMapReady` | `{}` | Один раз на view, когда нативная карта создана (после `initialize`). |
| `onCameraPositionChanged` | `CameraPositionChangeEvent` | Пока камера движется; `reason` отличает жесты пользователя от программных перемещений, `finished` помечает конец движения. |
| `onMapPress` | `MapPressEvent` | Одиночное нажатие на карту. |
| `onMapLongPress` | `MapPressEvent` | Долгое нажатие на карту. |

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
```

Сырой нативный модуль также экспортируется как `ExpoYandexMapKitModule` — низкоуровневый обходной путь (escape hatch); его интерфейс не является частью стабильного API.

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
    onPress={({ nativeEvent }) => console.log('нажали', nativeEvent.identifier)}
  />
</YandexMapView>;
```

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `point` | `Point` | — | Географическая позиция (обязательный). |
| `source` | `ImageSourcePropType` | — | Иконка — `require('./pin.png')` или `{ uri }` (http, `data:`, `file:` или встроенный ассет). Опустите, чтобы оставить пустой плейсмарк MapKit (без иконки он невидим). |
| `scale` | `number` | `1` | Множитель масштаба иконки. |
| `anchor` | `{ x: number; y: number }` | по иконке | Точка привязки в долях `[0,1]`; `{ x: 0.5, y: 1 }` — низ по центру. |
| `visible` | `boolean` | `true` | Показать/скрыть иконку. |
| `zIndex` | `number` | `0` | Порядок отрисовки среди объектов карты. |
| `rotated` | `boolean` | `false` | Если `true`, иконка поворачивается вместе с азимутом карты. |
| `handled` | `boolean` | `false` | Если `true`, нажатие поглощается и **не** вызывает `onMapPress` карты. |
| `identifier` | `string` | — | Непрозрачный id, возвращаемый в `onPress` — чтобы один обработчик различал маркеры. |
| `onPress` | `(event) => void` | — | `event.nativeEvent` — это `{ identifier?, point }`. |
| `children` | `ReactNode` | — | React-контент, отрисованный как иконка маркера (кастомный пин). Имеет приоритет над `source`. Рендерится нативно через view-провайдер MapKit (без хрупкого снапшота в bitmap). |
| `tracksViewChanges` | `boolean` | `true` | Перерисовывать ли иконку при изменении `children`. Поставьте `false`, когда контент устоялся (например, статичный бабл) — иконка снапшотится один раз (большой выигрыш в производительности вместо перерисовки каждый кадр). |

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
    onPress={({ nativeEvent }) => console.log('нажали линию', nativeEvent.point)}
  />
</YandexMapView>;
```

Пропсы: `points` (2+, обязателен), `strokeColor`, `strokeWidth`, `outlineColor`/`outlineWidth`, штрихи `dashLength`/`gapLength`/`dashOffset`, `zIndex`, `handled`, `onPress` (`event.nativeEvent` — `{ point }`).

### `<Polygon />` и `<Circle />`

Тоже как дети карты:

- **`<Polygon>`**: `points` (внешнее кольцо, 3+), `innerRings?` (дырки), `fillColor`, `strokeColor`, `strokeWidth`, `zIndex`, `onPress`, `handled`.
- **`<Circle>`**: `center`, `radius` (в метрах), `fillColor`, `strokeColor`, `strokeWidth`, `zIndex`, `onPress`, `handled`.

## lite и full

Яндекс поставляет MapKit в двух flavor'ах. Библиотека по умолчанию использует `lite`; выберите `full` через [конфиг-плагин](#2-добавьте-конфиг-плагин), когда понадобятся его возможности (сама библиотека начнёт поддерживать их в v2).

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
