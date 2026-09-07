# Roborock Vacuum Card

Home Assistant vacuum card that uses core Roborock integration and supports multi-selecting areas for cleaning.

![Roborock Vacuum Card](/images/roborock-vacuum-card.png)

![Roborock Vacuum Card custom cleaning](/images/roborock-vacuum-card-popup.png)

## Caveat

This card is not highly configurable and was created for personal use. It expects (and was tested with) the Roborock Saros 10R vacuum robot and dock.

## Cards

This integration provides two custom cards:

### 1. Roborock Vacuum Card (`roborock-vacuum-card`)
Main card showing vacuum status, stats, and optionally inline cleaning controls.

### 2. Roborock Cleaning Card (`roborock-cleaning-card`)
Standalone cleaning control panel that can be placed anywhere in your dashboard. Perfect for creating a separate cleaning control panel independent of the main vacuum card.

## Card configuration

### Roborock Vacuum Card

```yaml
type: custom:roborock-vacuum-card
entity: vacuum.robot
# All other entities (battery, errors, mop drying, mop settings, consumables) are
# discovered automatically from the entity registry - renamed and translated ones
# included. A minimal card is just the two lines above.
# Optional: Show the vacuum image (default: false)
# show_roborock_icon: true
# Optional: Show custom cleaning panel inline instead of as a popup (default: false)
# show_custom_cleaning_inline: true
# Optional: override the automatic discovery, see the `sensors` section below
# sensors:
#   battery: sensor.robot_bateria
# mop_intensity_entity: select.robot_intensywnosc_mopa
# mop_mode_entity: select.robot_tryb_mopa
stats:
  default:
    - entity: sensor.robot_pozostal_czas_filtrowania
      scale: 0
      title: Filtr
      unit: h
    - entity: sensor.robot_pozostal_czas_szczotki_bocznej
      scale: 0
      title: Szczotka boczna
      unit: h
    - entity: sensor.robot_pozostal_czas_szczotki_glownej
      scale: 0
      unit: h
      title: Szczotka główna
    - entity: sensor.robot_pozostal_czas_sensora
      scale: 0
      unit: h
      title: Sensory
  cleaning:
    - entity: sensor.robot_cleaning_progress
      title: Postęp czyszczenia
      unit: "%"
    - entity: sensor.robot_current_room
      title: Czyszczone pomieszczenie
    - entity: sensor.robot_czas_czyszczenia
      format: minutes_to_minutes_seconds
      title: Czas sprzątania
      unit: min
areas:
  - area_id: jadalnia
    roborock_area_id: 3
  - area_id: kuchnia
    roborock_area_id: 4
  - area_id: przedpokoj
    roborock_area_id: 2
  - area_id: salon
    roborock_area_id: 1

```

### Configuration Options

#### `entity`
- **Type:** `string`
- **Required:** `true`
- **Description:** The vacuum entity ID (e.g., `vacuum.saros_10r`)

#### `mop_intensity_entity`
- **Type:** `string`
- **Optional**
- **Description:** Custom entity ID for mop intensity control. Useful for non-English integrations where entity names differ from defaults.
- **Default:** `select.{robot_name}_mop_intensity`
- **Example:** `select.saros_10r_intensywnosc_mopa`

#### `mop_mode_entity`
- **Type:** `string`
- **Optional**
- **Description:** Custom entity ID for mop mode control. Useful for non-English integrations where entity names differ from defaults.
- **Default:** `select.{robot_name}_mop_mode`
- **Example:** `select.saros_10r_tryb_mopa`

#### `show_custom_cleaning_inline`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** When set to `true`, the custom cleaning panel is always visible below the main card instead of appearing as a popup. This provides quick access to room selection and cleaning modes without needing to click to open a popup.

**Example:**
```yaml
type: custom:roborock-vacuum-card
entity: vacuum.saros_10r
show_custom_cleaning_inline: true
areas:
  - area_id: salon
    roborock_area_id: 1
```

#### `sensors`
- **Type:** `object`
- **Optional - and normally not needed**

The card finds its entities in the Home Assistant entity registry, matching them by the
Roborock integration's own `translation_key` (and by device class for the battery sensor,
which has no translation key upstream). Because that key never changes, discovery keeps
working when:

- you renamed entities, including into another language (`sensor.robot_bateria`),
- Home Assistant gave an entity a prefix that does not match the vacuum
  (`switch.salon_robot_dock_mop_drying` - this happens to entities the integration added
  later than the device, such as the dock switches),
- the dock's own name doubles up in the ID (`sensor.robot_dock_dock_error`).

Only the vacuum entity itself has to be configured. Entities are matched against the
vacuum's device and its dock, so a second robot is never picked up by mistake.

Use `sensors` only to override that lookup. Guessed entity IDs are still used as a last
resort when the registry has no match:

| Key | Entity | Fallback ID |
| --- | --- | --- |
| `battery` | battery sensor | `sensor.{robot}_battery` |
| `cleaning` | cleaning binary sensor | `binary_sensor.{robot}_cleaning` |
| `status` | detailed status sensor | `sensor.{robot}_status` |
| `vacuumError` | vacuum error sensor (`none` = no error) | `sensor.{robot}_vacuum_error` |
| `dockError` | dock error sensor (`ok` = no error) | `sensor.{robot}_dock_error` |
| `mopDryingSwitch` | mop drying switch, preferred | `switch.{robot}_dock_mop_drying` |
| `mopDrying` | deprecated mop drying binary sensor | `binary_sensor.{robot}_dock_mop_drying` |
| `mopDryingRemainingTime` | remaining drying time | `sensor.{robot}_dock_mop_drying_remaining_time` |

`mopDrying` is only read when no switch is found: the Roborock integration deprecated that
binary sensor and it stops working in Home Assistant 2027.3.0. The switch reports the same
state, so once the card picks it up you can safely disable the binary sensor.

`mop_intensity_entity` and `mop_mode_entity` are discovered the same way and are equally
optional.

#### `areas`
- **Type:** `array`
- **Optional**
- **Description:** List of rooms/areas available for custom cleaning. Each area requires:
  - `area_id` - Home Assistant area identifier
  - `roborock_area_id` - Internal Roborock area ID (numeric)

**Example:**
```yaml
areas:
  - area_id: living_room
    roborock_area_id: 1
  - area_id: kitchen
    roborock_area_id: 2
```

### Stats Configuration Options

`stats` is optional. When it is left out, the card shows the four consumable counters
(filter, side brush, main brush, sensors), discovered from the entity registry - so they
work on a renamed or non-English setup without naming a single entity, and a counter the
model does not report is simply left out.

Define `stats` to replace those defaults with your own tiles. Each stat can have the
following properties:

- `entity` - Home Assistant entity ID
- `attribute` - Entity attribute to display (optional)
- `title` - Display title for the stat
- `unit` - Unit to display after the value
- `scale` - Number of decimal places (optional)
- `divide_by` - Divide the value by this number (optional)
- `format` - Special formatting option:
  - `time_minutes_seconds` - Format seconds as MM:SS (e.g., "21:35" for 1295 seconds)
  - `minutes_to_minutes_seconds` - Format minutes as MM:SS (e.g., "32:45" for 32.75 minutes)

**Example:** To show cleaning time in MM:SS format when sensor reports minutes:
```yaml
- entity: sensor.robot_cleaning_time
  format: minutes_to_minutes_seconds
  title: Cleaning time
  unit: min
```

### Roborock Cleaning Card

Standalone cleaning control card that can be placed anywhere in your dashboard.

```yaml
type: custom:roborock-cleaning-card
entity: vacuum.saros_10r
# Optional: Custom entity names for mop settings
mop_intensity_entity: select.saros_10r_intensywnosc_mopa
mop_mode_entity: select.saros_10r_tryb_mopa
areas:
  - area_id: salon
    roborock_area_id: 1
  - area_id: kuchnia
    roborock_area_id: 4
  - area_id: sypialnia
    roborock_area_id: 2
  - area_id: lazienka
    roborock_area_id: 3
```

#### Configuration Options

- `entity` - **Required** - Vacuum entity ID
- `areas` - **Required** - List of rooms/areas to clean
  - `area_id` - Area identifier for translation (e.g., `salon`, `kuchnia`)
  - `roborock_area_id` - Roborock's internal area ID
- `mop_intensity_entity` - Optional - Custom entity name for mop intensity control
- `mop_mode_entity` - Optional - Custom entity name for mop mode control
- `default_mode` - Optional - Cleaning mode preselected on open (`vac&mop`, `mop` or `vac`; default `vac&mop`)
- `default_modes` - Optional - Preselected suction / mop / route per cleaning mode

Values in `default_modes` are only used when the vacuum actually offers them; otherwise the
card falls back to the same order the Roborock app uses.

```yaml
default_mode: mop
default_modes:
  mop:
    mop: high
    route: deep
  vac:
    suction: max_plus
```

This card displays the cleaning control panel as a standalone card that can be positioned independently of the main vacuum status card.
