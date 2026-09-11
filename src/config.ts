import localize from './localize';
import {
  RoborockVacuumCardConfig,
  RoborockCleaningMode,
  RoborockSuctionMode,
  RoborockMopMode,
  RoborockRouteMode,
} from './types';

export default function buildConfig(
  config?: Partial<RoborockVacuumCardConfig>
): RoborockVacuumCardConfig {
  if (!config) {
    throw new Error(localize('error.invalid_config'));
  }

  if (!config.entity) {
    throw new Error(localize('error.missing_entity'));
  }

  const default_modes = {
    [RoborockCleaningMode.VacAndMop]: {
      suction: RoborockSuctionMode.Turbo,
      mop: RoborockMopMode.High,
      route: RoborockRouteMode.Standard,
      cycle: 1,
    },
    [RoborockCleaningMode.Mop]: {
      suction: RoborockSuctionMode.Turbo,
      mop: RoborockMopMode.High,
      route: RoborockRouteMode.Deep,
      cycle: 1,
    },
    [RoborockCleaningMode.Vac]: {
      suction: RoborockSuctionMode.Max,
      mop: RoborockMopMode.Medium,
      route: RoborockRouteMode.Standard,
      cycle: 1,
    },
  };

  return {
    entity: config.entity,
    stats: config.stats ?? {},
    areas: config.areas ?? [],
    default_mode: config.default_mode ?? RoborockCleaningMode.VacAndMop,
    // Config wins over the built-in defaults, per mode.
    default_modes: {
      [RoborockCleaningMode.VacAndMop]: {
        ...default_modes[RoborockCleaningMode.VacAndMop],
        ...config.default_modes?.[RoborockCleaningMode.VacAndMop],
      },
      [RoborockCleaningMode.Mop]: {
        ...default_modes[RoborockCleaningMode.Mop],
        ...config.default_modes?.[RoborockCleaningMode.Mop],
      },
      [RoborockCleaningMode.Vac]: {
        ...default_modes[RoborockCleaningMode.Vac],
        ...config.default_modes?.[RoborockCleaningMode.Vac],
      },
    },
    mop_intensity_entity: config.mop_intensity_entity,
    mop_mode_entity: config.mop_mode_entity,
    show_custom_cleaning_inline: config.show_custom_cleaning_inline ?? false,
    show_roborock_icon: config.show_roborock_icon ?? false,
    sensors: config.sensors,
  };
}
