# Roborock Vacuum Card

Home Assistant card for Roborock vacuums built on the **official Roborock integration** - no
custom component required. Shows status, cleaning modes, consumables and a custom cleaning
panel with multi-room selection.

![Roborock Vacuum Card](/images/roborock-vacuum-card.png)

![Roborock Vacuum Card custom cleaning](/images/roborock-vacuum-card-popup.png)

## Requirements

- Home Assistant **2026.3.0** or newer
- The built-in [Roborock integration](https://www.home-assistant.io/integrations/roborock)
  set up for your robot

Developed and tested against a **Roborock Saros 10R** with dock. Entities and rooms are
discovered from Home Assistant rather than hardcoded, so other Roborock models on the same
integration should work - see [Known limitations](#known-limitations) for where that is not
guaranteed yet.

## Installation

### HACS

1. HACS → three-dot menu → **Custom repositories**
2. Add `https://github.com/sebastian-bugajny/roborock-vacuum-card` with type **Dashboard**
   (called **Lovelace** in HACS 1.x)
3. Install **Roborock Vacuum Card**, then reload your browser with a hard refresh
   (`Ctrl`/`Cmd` + `Shift` + `R`)

Pre-release versions (`1.0.0-beta.x`) are only offered when you enable **Show beta versions**
in the card's HACS menu.

### Manual

Copy `dist/roborock-vacuum-card.js` to `config/www/` and add it under
**Settings → Dashboards → three-dot menu → Resources** as a JavaScript module.

## Quick start

Add **Roborock Vacuum Card** from the card picker, or paste this:

```yaml
type: custom:roborock-vacuum-card
entity: vacuum.saros_10r
```

That is the whole configuration. Everything else - battery, status, errors, mop drying, mop
settings, consumable counters and the list of cleanable rooms - is discovered automatically.

## The two cards

### `roborock-vacuum-card`

The main card: name, cleaning modes, mop drying countdown, battery, robot state, consumable
counters, and Start / Locate (or Pause / Stop / Return to dock while cleaning). Clicking the
card body opens the custom cleaning panel; `show_custom_cleaning_inline: true` keeps that
panel permanently visible instead.

### `roborock-cleaning-card`

Only the custom cleaning panel, as a standalone card, so it can live anywhere on the
dashboard independently of the status card.

```yaml
type: custom:roborock-cleaning-card
entity: vacuum.saros_10r
```

## Automatic discovery

The card does not build entity IDs from the vacuum's name. It looks entities up in the Home
Assistant entity registry, matching the Roborock integration's own `translation_key` (and the
device class for the battery sensor, which has no translation key upstream). That key never
changes, so discovery keeps working when:

- you renamed entities, including into another language (`sensor.robot_bateria`),
- Home Assistant gave an entity a prefix that does not match the vacuum
  (`switch.living_room_robot_dock_mop_drying` - this happens to entities the integration
  added later than the device, such as the dock switches),
- the dock's name doubles up in the ID (`sensor.robot_dock_dock_error`).

Entities are matched against the vacuum's own device and its dock, so with two robots neither
card ever picks up the other one's entities.

Rooms are read from the `roborock.get_maps` action, which reports every room of every map
together with its internal segment ID. The action only reads data the integration has already
polled, so it costs no request to the robot.

Everything below is therefore optional - use it to override what discovery found.

## `roborock-vacuum-card` options

This card ships a **visual editor**: the card configuration dialog lets you pick the vacuum,
toggle `show_roborock_icon` and `show_custom_cleaning_inline`, and set the default tab and the
per-tab defaults (suction / mop intensity / route / cleaning count) by clicking - offering only
the levels your vacuum reports. The remaining options (`stats`, `sensors`, `areas`, the entity
overrides) stay in YAML. Everything the editor writes is the YAML documented here, so the two
stay interchangeable.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entity` | string | **required** | The vacuum entity, e.g. `vacuum.saros_10r` |
| `show_roborock_icon` | boolean | `false` | Show the vacuum image in the card body |
| `show_custom_cleaning_inline` | boolean | `false` | Keep the cleaning panel always visible instead of opening it as a popup |
| `stats` | object | consumables | Tiles below the robot state, per vacuum state - see [Stats](#stats) |
| `areas` | list | discovered | Rooms offered for cleaning - see [Rooms](#rooms) |
| `sensors` | object | discovered | Override individual entity lookups - see [Overriding discovery](#overriding-discovery) |
| `mop_intensity_entity` | string | discovered | The mop intensity `select` entity |
| `mop_mode_entity` | string | discovered | The route `select` entity (the integration calls it "mop mode") |
| `default_mode` | string | `vac&mop` | Cleaning mode preselected when the panel opens: `vac&mop`, `mop` or `vac` |
| `default_modes` | object | app defaults | Preselected suction / mop / route / cycle per cleaning mode |

## `roborock-cleaning-card` options

`entity`, `areas`, `mop_intensity_entity`, `mop_mode_entity`, `default_mode` and
`default_modes` behave exactly as above.

This card ships a **visual editor**: in the card configuration dialog you pick the vacuum, the
tab that opens by default, and - per tab (`vac&mop` / `mop` / `vac`) - the default suction, mop
intensity, route and cleaning count. Only the levels your vacuum actually reports are offered,
so you never have to look up option names. Everything it writes is the same `default_mode` /
`default_modes` YAML documented below, so you can still edit it by hand.

The remaining options do not apply: this card *is* the cleaning panel, so it is always inline
and shows no status, stats or sensor tiles - and therefore takes no `sensors`,
`show_roborock_icon`, `show_custom_cleaning_inline` or `stats`.

## The custom cleaning panel

Rows from top to bottom: cleaning mode (vacuum and mop / mop only / vacuum only), suction
level, mop intensity, route, cleaning count, then the room tiles.

Which levels are offered per mode follows the Roborock app - four suction levels with mopping,
five in vacuum-only mode, two routes with vacuum and four in mop-only mode.

- **CLEAN** applies the selected settings and cleans the selected rooms. Enabled only once at
  least one room is selected.
- **CLEAN ALL** applies the settings and starts a whole-home clean. With the count set to
  `×2` it instead cleans every known room twice, because Home Assistant has no whole-home
  repeat counter.

### `default_mode` and `default_modes`

Values in `default_modes` are used only when the vacuum actually offers them; otherwise the
card falls back to the order the Roborock app uses. Mop-only always forces suction off, so
`suction` is ignored for that mode.

```yaml
default_mode: mop
default_modes:
  mop:
    mop: high
    route: deep
    cycle: 1
  vac:
    suction: max_plus
  vac&mop:
    suction: turbo
```

Accepted values: `suction` - `quiet`, `balanced`, `turbo`, `max`, `max_plus`; `mop` - `low`,
`medium`, `high`; `route` - `fast`, `standard`, `deep`, `deep_plus`; `cycle` - `1` or `2`.

## Rooms

Rooms are discovered and need no configuration:

- no segment IDs to look up,
- a room added in the Roborock app appears on its own, because the card re-reads the list
  whenever the robot reports different rooms or a different map,
- only rooms of the currently selected map are offered,
- tiles are sorted by name, and a room borrows the icon of a Home Assistant area with the
  same name.

Set `areas` to take over from discovery - to offer a subset of rooms, force an order, or use
your own labels:

```yaml
areas:
  - area_id: living_room
    roborock_area_id: 1
  - area_id: kitchen
    roborock_area_id: 2
```

- `area_id` - a Home Assistant area; its name and icon become the tile's label and icon.
  **An entry whose area does not exist in Home Assistant is skipped.**
- `roborock_area_id` - the room's segment ID.

To read the segment IDs of your own robot, run this in **Developer tools → Actions**:

```yaml
action: roborock.get_maps
target:
  entity_id: vacuum.saros_10r
```

## Stats

Left out, `stats` shows four consumable counters - filter, side brush, main brush, sensors -
discovered from the registry, with counters the model does not report simply omitted.

Define `stats` to replace them with your own tiles. Tiles are keyed by robot state, so the
card can show different numbers while cleaning; `default` is used for any state without its
own entry. Valid keys are `default` plus the vacuum states `cleaning`, `docked`, `idle`,
`paused`, `returning` and `error`.

```yaml
stats:
  default:
    - entity: sensor.saros_10r_filter_time_left
      title: Filter
      unit: h
      scale: 0
  cleaning:
    - entity: sensor.saros_10r_cleaning_progress
      title: Progress
      unit: "%"
    - entity: sensor.saros_10r_current_room
      title: Room
    - entity: sensor.saros_10r_cleaning_time
      title: Elapsed
      unit: min
      format: minutes_to_minutes_seconds
```

Each tile takes:

| Key | Description |
| --- | --- |
| `entity` | Entity to read |
| `attribute` | Read this attribute instead of the state; without `entity` it is read from the vacuum entity |
| `title` | Label under the value |
| `unit` | Unit appended to the value |
| `scale` | Decimal places |
| `divide_by` | Divide the value first |
| `format` | `time_minutes_seconds` (seconds → `MM:SS`) or `minutes_to_minutes_seconds` (minutes → `MM:SS`) |

Clicking a tile opens the entity's more-info dialog.

## Overriding discovery

`sensors` replaces individual lookups. A guessed entity ID is still used as a last resort when
the registry has no match - `{robot}` there is whatever follows `vacuum.` in the `entity`
option:

| Key | Entity | Fallback ID |
| --- | --- | --- |
| `battery` | battery sensor | `sensor.{robot}_battery` |
| `cleaning` | cleaning binary sensor | `binary_sensor.{robot}_cleaning` |
| `status` | detailed status sensor, appended to the robot state | `sensor.{robot}_status` |
| `vacuumError` | vacuum error sensor (`none` = no error) | `sensor.{robot}_vacuum_error` |
| `dockError` | dock error sensor (`ok` = no error) | `sensor.{robot}_dock_error` |
| `mopDryingSwitch` | mop drying switch, preferred | `switch.{robot}_dock_mop_drying` |
| `mopDrying` | deprecated mop drying binary sensor | `binary_sensor.{robot}_dock_mop_drying` |
| `mopDryingRemainingTime` | remaining drying time | `sensor.{robot}_dock_mop_drying_remaining_time` |

```yaml
sensors:
  battery: sensor.saros_10r_bateria
```

`mopDrying` is only read when no switch is found: the Roborock integration deprecated that
binary sensor and it stops working in Home Assistant 2027.3.0. The switch reports the same
state, so once the card picks it up you can safely disable the binary sensor.

## Known limitations

- **Suction, mop and route levels use a fixed vocabulary** (`quiet`/`balanced`/`turbo`/`max`/
  `max_plus`, `low`/`medium`/`high`, `fast`/`standard`/`deep`/`deep_plus`). Models that report
  other level names - for example the `mild`/`standard`/`intense` set used by robots with a
  vibrating mop pad - will show buttons that do not match. Making these fully device-driven is
  in progress.
- **Card text is available in English and Polish only**, picked from the browser language.
  Robot states and error names come from the card's own translations, so states the card does
  not know are shown as raw values such as `going_to_wash_the_mop`.
- The mop drying countdown assumes the remaining-time sensor reports minutes or seconds.

## Troubleshooting

**The card says "Entity … not found".** The `entity` in the configuration does not exist.
Check it under Developer tools → States.

**No rooms appear in the cleaning panel.** Run the `roborock.get_maps` action shown above. If
it returns no maps, the integration has no map data yet and the card cannot invent it. If it
does return rooms, filter the browser console for `roborock-vacuum-card` - the card logs why
the lookup failed.

**An old version keeps loading.** The browser caches the card. Hard refresh, and in the
Home Assistant companion app use Settings → Companion app → Debugging → Reset frontend cache.
The version the card actually loaded is logged to the browser console on startup.
