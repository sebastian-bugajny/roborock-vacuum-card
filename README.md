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
# Optional: Custom entity names for mop settings (useful for non-English integrations)
# mop_intensity_entity: select.robot_intensywnosc_mopa
# mop_mode_entity: select.robot_tryb_mopa
# Optional: Show custom cleaning panel inline instead of as a popup (default: false)
# show_custom_cleaning_inline: true
# Optional: Override default sensor entity IDs (useful for non-English integrations)
# sensors:
#   battery: sensor.robot_bateria
#   vacuumError: sensor.robot_blad_odkurzacza
#   dockError: sensor.robot_dock_dock_error
#   mopDrying: binary_sensor.robot_dock_mop_drying
#   mopDryingRemainingTime: sensor.robot_dock_mop_drying_remaining_time
#   cleaning: binary_sensor.robot_cleaning
stats:
  default:
    - entity: sensor.robot_filter_time_left
      divide_by: 3600
      scale: 1
      title: Filter
      unit: h
    - entity: sensor.robot_side_brush_time_left
      divide_by: 3600
      scale: 1
      title: Side brush
      unit: h
    - entity: sensor.robot_main_brush_time_left
      divide_by: 3600
      scale: 1
      unit: h
      title: Main brush
    - entity: sensor.robot_sensor_time_left
      divide_by: 3600
      scale: 1
      unit: h
      title: Sensors
  cleaning:
    - entity: sensor.robot_cleaning_progress
      title: Cleaning progress
      unit: '%'
    - entity: sensor.robot_current_root
      title: Current room
    - entity: sensor.robot_cleaning_time
      format: minutes_to_minutes_seconds
      title: Cleaning time
      unit: min
areas:
  - area_id: living_room
    roborock_area_id: 12
  - area_id: master_bedroom
    roborock_area_id: 13
  - area_id: kids_bedroom
    roborock_area_id: 14
  - area_id: kitchen
    roborock_area_id: 15
  - area_id: bathroom
    roborock_area_id: 16
  - area_id: toilet
    roborock_area_id: 17
  - area_id: corridor
    roborock_area_id: 18
  - area_id: hallway
    roborock_area_id: 19
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
- **Optional**
- **Description:** Override default sensor entity IDs. Useful for non-English integrations where sensor names differ from the English defaults.

**Available sensor overrides:**
- `battery` - Battery level sensor (default: `sensor.{robot_name}_battery`)
- `vacuumError` - Vacuum error sensor (default: `sensor.{robot_name}_vacuum_error`)
  - Expected states: `none` = no error, other values = error description
- `dockError` - Dock error sensor (default: `sensor.{robot_name}_dock_error`)
  - Expected states: `ok` = no error, other values = error description
- `mopDrying` - Mop drying status sensor (default: `binary_sensor.{robot_name}_dock_mop_drying`)
- `mopDryingRemainingTime` - Remaining mop drying time (default: `sensor.{robot_name}_dock_mop_drying_remaining_time`)
- `cleaning` - Cleaning status sensor (default: `binary_sensor.{robot_name}_cleaning`)

**Example for Polish integration:**
```yaml
type: custom:roborock-vacuum-card
entity: vacuum.saros_10r
sensors:
  battery: sensor.saros_10r_bateria
  vacuumError: sensor.saros_10r_blad_odkurzacza
  dockError: sensor.saros_10r_dock_dock_error
areas:
  - area_id: salon
    roborock_area_id: 1
```

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

Each stat can have the following properties:

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
- `default_mode` - Optional - Default cleaning mode on open
- `default_modes` - Optional - Default settings per cleaning mode

This card displays the cleaning control panel as a standalone card that can be positioned independently of the main vacuum status card.
