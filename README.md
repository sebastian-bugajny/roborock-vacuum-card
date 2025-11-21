# Roborock Vacuum Card

Home Assistant vacuum card that uses core Roborock integration and supports multi-selecting areas for cleaning.

![Roborock Vacuum Card](/images/roborock-vacuum-card.png)

![Roborock Vacuum Card custom cleaning](/images/roborock-vacuum-card-popup.png)

## Caveat

This card is not highly configurable and was created for personal use. It expects (and was tested with) the Roborock Saros 10R vacuum robot and dock.

## Card configuration

```yaml
type: custom:roborock-vacuum-card
entity: vacuum.robot
# Optional: Custom entity names for mop settings (useful for non-English integrations)
# mop_intensity_entity: select.robot_intensywnosc_mopa
# mop_mode_entity: select.robot_tryb_mopa
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
      format: time_minutes_seconds
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

### Stats Configuration Options

Each stat can have the following properties:

- `entity` - Home Assistant entity ID
- `attribute` - Entity attribute to display (optional)
- `title` - Display title for the stat
- `unit` - Unit to display after the value
- `scale` - Number of decimal places (optional)
- `divide_by` - Divide the value by this number (optional)
- `format` - Special formatting option:
  - `time_minutes_seconds` - Format time in MM:SS format (e.g., "21:35" for 21 minutes and 35 seconds)

**Example:** To show cleaning time in MM:SS format:
```yaml
- entity: sensor.robot_cleaning_time
  format: time_minutes_seconds
  title: Cleaning time
  unit: min
```

