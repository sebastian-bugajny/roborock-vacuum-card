import {
  RoborockCleaningMode,
  RoborockSuctionMode,
  RoborockMopMode,
  RoborockRouteMode,
  MyHomeAssistant,
  HassEntity,
} from './types'

const OFF_SUCTION_MODES = [RoborockSuctionMode.Off, RoborockSuctionMode.OffRaiseMainBrush];
const INTEGRATION_MOP_MODES = ['off', 'slight', 'low', 'medium', 'moderate', 'high', 'extreme'] as const;
const NON_OFF_MOP_MODES = ['slight', 'low', 'medium', 'moderate', 'high', 'extreme'] as const;
const APP_VISIBLE_MOP_MODES = [RoborockMopMode.Low, RoborockMopMode.Medium, RoborockMopMode.High];
const SUCTION_MODE_COMMANDS: Record<RoborockSuctionMode, number> = {
  [RoborockSuctionMode.Off]: 105,
  [RoborockSuctionMode.OffRaiseMainBrush]: 109,
  [RoborockSuctionMode.Quiet]: 101,
  [RoborockSuctionMode.Balanced]: 102,
  [RoborockSuctionMode.Turbo]: 103,
  [RoborockSuctionMode.Max]: 104,
  [RoborockSuctionMode.MaxPlus]: 108,
};
const WATER_OFF_CODE = 200;

export class VacuumRobot {
  private hass!: MyHomeAssistant;
  private entity_id!: string;
  private mop_intensity_entity?: string;
  private mop_mode_entity?: string;

  get name(): string {
    return this.entity_id.replace('vacuum.', '');
  }

  static isSupportedSuctionMode(mode: RoborockSuctionMode, cleaningMode: RoborockCleaningMode): boolean {
    switch (cleaningMode) {
      case RoborockCleaningMode.VacAndMop:
        return [RoborockSuctionMode.Quiet, RoborockSuctionMode.Balanced, RoborockSuctionMode.Turbo, RoborockSuctionMode.Max].includes(mode);
      case RoborockCleaningMode.Vac:
        return [RoborockSuctionMode.Quiet, RoborockSuctionMode.Balanced, RoborockSuctionMode.Turbo, RoborockSuctionMode.Max, RoborockSuctionMode.MaxPlus].includes(mode);
      case RoborockCleaningMode.Mop:
        return OFF_SUCTION_MODES.includes(mode);
    }
  }

  static isSupportedMopMode(mode: RoborockMopMode, cleaningMode: RoborockCleaningMode): boolean {
    switch (cleaningMode) {
      case RoborockCleaningMode.VacAndMop:
      case RoborockCleaningMode.Mop:
        return APP_VISIBLE_MOP_MODES.includes(mode);
      case RoborockCleaningMode.Vac:
        return mode == RoborockMopMode.Off;
    }
  }

  static isSupportedRouteMode(mode: RoborockRouteMode, cleaningMode: RoborockCleaningMode): boolean {
    switch (cleaningMode) {
      case RoborockCleaningMode.VacAndMop:
      case RoborockCleaningMode.Vac:
        return [RoborockRouteMode.Fast, RoborockRouteMode.Standard].includes(mode);
      case RoborockCleaningMode.Mop:
        return [RoborockRouteMode.Fast, RoborockRouteMode.Standard, RoborockRouteMode.Deep, RoborockRouteMode.DeepPlus].includes(mode);
    }
  }

  constructor() {

  }

  public setHass(hass: MyHomeAssistant) {
    this.hass = hass;
  }

  public setEntity(entity_id: string) {
    this.entity_id = entity_id;
  }

  public setMopIntensityEntity(entity?: string) {
    this.mop_intensity_entity = entity;
  }

  public setMopModeEntity(entity?: string) {
    this.mop_mode_entity = entity;
  }

  public getAvailableSuctionModes(): RoborockSuctionMode[] {
    const entity = this.hass?.states?.[this.entity_id];
    const options = entity?.attributes?.fan_speed_list;
    const normalized = this.normalizeOptions(options, Object.values(RoborockSuctionMode));
    return normalized.length ? normalized : Object.values(RoborockSuctionMode);
  }

  private getAvailableMopModeOptions(): string[] {
    const entityId = this.mop_intensity_entity ?? `select.${this.name}_mop_intensity`;
    const entity = this.hass?.states?.[entityId];
    const options = entity?.attributes?.options;
    const normalized = this.normalizeOptions(options, [...INTEGRATION_MOP_MODES]);
    return normalized.length ? normalized : [...INTEGRATION_MOP_MODES];
  }

  public getVisibleMopModes(): RoborockMopMode[] {
    return APP_VISIBLE_MOP_MODES;
  }

  public getAvailableRouteModes(): RoborockRouteMode[] {
    const entityId = this.mop_mode_entity ?? `select.${this.name}_mop_mode`;
    const entity = this.hass?.states?.[entityId];
    const options = entity?.attributes?.options;
    const normalized = this.normalizeOptions(options, Object.values(RoborockRouteMode));
    return normalized.length ? normalized : Object.values(RoborockRouteMode);
  }

  public getPreferredMopOnlySuctionMode(): RoborockSuctionMode {
    const availableModes = this.getAvailableSuctionModes();
    if (availableModes.includes(RoborockSuctionMode.OffRaiseMainBrush)) {
      return RoborockSuctionMode.OffRaiseMainBrush;
    }
    return availableModes.includes(RoborockSuctionMode.Off)
      ? RoborockSuctionMode.Off
      : RoborockSuctionMode.OffRaiseMainBrush;
  }

  public getSuctionMode(): RoborockSuctionMode {
    if (!this.hass || !this.entity_id) {
      return RoborockSuctionMode.Turbo; // Default value
    }
    const entity = this.hass.states[this.entity_id];
    if (!entity) {
      return RoborockSuctionMode.Turbo;
    }
    return this.getAttributeValue(entity, 'fan_speed');
  }

  private lastMopIntensity: RoborockMopMode | null = null;

  private getStorageKey(): string {
    return `roborock_${this.name}_last_mop_intensity`;
  }

  private getLastStoredMopIntensity(): RoborockMopMode | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(this.getStorageKey());
    return stored as RoborockMopMode | null;
  }

  private storeLastMopIntensity(intensity: RoborockMopMode): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.getStorageKey(), intensity);
    this.lastMopIntensity = intensity;
  }

  private normalizeOptions<T extends string>(options: unknown, validValues: T[]): T[] {
    if (!Array.isArray(options)) {
      return [];
    }

    const validOptions = new Set(validValues);
    return options
      .map(option => `${option}`.toLowerCase())
      .filter((option): option is T => validOptions.has(option as T));
  }

  private resolveSupportedMopMode(value: RoborockMopMode): RoborockMopMode | null {
    const availableModes = this.getAvailableMopModeOptions();
    if (availableModes.includes(value)) {
      return value;
    }

    if (value === RoborockMopMode.Off) {
      return null;
    }

    const fallbackMap: Record<RoborockMopMode, string[]> = {
      [RoborockMopMode.Off]: [],
      [RoborockMopMode.Low]: [RoborockMopMode.Low, 'slight', RoborockMopMode.Medium],
      [RoborockMopMode.Medium]: ['moderate', RoborockMopMode.Medium, RoborockMopMode.Low, RoborockMopMode.High],
      [RoborockMopMode.High]: ['extreme', RoborockMopMode.High, 'moderate', RoborockMopMode.Medium],
    };

    const matchedMode = fallbackMap[value].find(mode => availableModes.includes(mode));
    return matchedMode ? (matchedMode as RoborockMopMode) : null;
  }

  private normalizeMopModeForDisplay(value: string): RoborockMopMode {
    switch (value) {
      case 'slight':
      case RoborockMopMode.Low:
        return RoborockMopMode.Low;
      case 'moderate':
      case RoborockMopMode.Medium:
        return RoborockMopMode.Medium;
      case 'extreme':
      case RoborockMopMode.High:
        return RoborockMopMode.High;
      case RoborockMopMode.Off:
      default:
        return value as RoborockMopMode;
    }
  }

  public getMopMode(): RoborockMopMode {
    if (!this.hass || !this.entity_id) {
      return RoborockMopMode.High; // Default value
    }
    const entityId = this.mop_intensity_entity ?? `select.${this.name}_mop_intensity`;
    const entity = this.hass.states[entityId];
    if (!entity) {
      return RoborockMopMode.High;
    }
    
    const currentValue = entity.state.toLowerCase();
    
    // Load last stored intensity if not in memory
    if (!this.lastMopIntensity) {
      this.lastMopIntensity = this.getLastStoredMopIntensity();
    }
    
    // If value is vac_followed_by_mop or mop_after_vac, return last known intensity
    if (currentValue === 'vac_followed_by_mop' || currentValue === 'mop_after_vac') {
      // If we don't have a stored value, default to medium
      return this.normalizeMopModeForDisplay(this.lastMopIntensity || RoborockMopMode.Medium);
    }
    
    // Extract intensity from vac_and_mop_* values (e.g., "vac_and_mop_high" -> "high")
    if (currentValue.startsWith('vac_and_mop_')) {
      const intensity = currentValue.replace('vac_and_mop_', '') as RoborockMopMode;
      this.storeLastMopIntensity(intensity);
      return this.normalizeMopModeForDisplay(intensity);
    }
    
    // If mop_intensity is 'off', check vacuum entity's mop_intensity attribute
    // In Vac+Mop mode, the select entity shows 'off' but we should return last known value
    if (currentValue === 'off') {
      const vacuumEntity = this.hass.states[this.entity_id];
      const vacuumMopIntensity = vacuumEntity?.attributes?.mop_intensity;
      if (vacuumMopIntensity && vacuumMopIntensity !== 'off') {
        const intensity = vacuumMopIntensity.toLowerCase();
        this.storeLastMopIntensity(intensity);
        return this.normalizeMopModeForDisplay(intensity);
      }
      // If no valid intensity in vacuum attributes, return last known value or off
      return this.normalizeMopModeForDisplay(this.lastMopIntensity || RoborockMopMode.Off);
    }
    
    // If it's a valid intensity value, store it for later
    if (NON_OFF_MOP_MODES.includes(currentValue as typeof NON_OFF_MOP_MODES[number])) {
      this.storeLastMopIntensity(this.normalizeMopModeForDisplay(currentValue));
    }
    
    return this.normalizeMopModeForDisplay(entity.state);
  }

  // Check if mop is active based on multiple sensors
  // In Polish integration, we need to check both intensity and route mode
  public isMopActive(): boolean {
    if (!this.hass || !this.entity_id) {
      return false;
    }
    
    // Check mop_intensity_entity
    const intensityEntityId = this.mop_intensity_entity ?? `select.${this.name}_mop_intensity`;
    const intensityEntity = this.hass.states[intensityEntityId];
    
    // Check route mode (mop_mode_entity in Polish integration)
    const routeEntityId = this.mop_mode_entity ?? `select.${this.name}_mop_mode`;
    const routeEntity = this.hass.states[routeEntityId];
    
    const intensity = intensityEntity?.state.toLowerCase() || 'off';
    const route = routeEntity?.state.toLowerCase() || 'standard';
    
    // Mop is active when:
    // 1. Intensity is NOT 'off' (low/medium/high/vac_followed_by_mop), OR
    // 2. Route is 'deep' or 'deep_plus' (mop-only modes)
    const isMopActive = intensity !== 'off' || route === 'deep' || route === 'deep_plus';
    
    return isMopActive;
  }

  public getRouteMode(): RoborockRouteMode {
    if (!this.hass || !this.entity_id) {
      return RoborockRouteMode.Standard; // Default value
    }
    // In Polish integration, mop_mode_entity actually contains route mode (deep, standard, etc.)
    const entityId = this.mop_mode_entity ?? `select.${this.name}_mop_mode`;
    const entity = this.hass.states[entityId];
    if (!entity) {
      return RoborockRouteMode.Standard;
    }
    return entity.state as RoborockRouteMode;
  }

  public callServiceAsync(service: string) {
    if (!this.hass || !this.entity_id) {
      return Promise.reject('Robot not initialized');
    }

    const serviceData = {
      entity_id: this.entity_id,
    };

    return this.hass.callService('vacuum', service, serviceData);
  }

  public sendCommandAsync(command: string, params?: unknown) {
    if (!this.hass || !this.entity_id) {
      return Promise.reject('Robot not initialized');
    }

    const serviceData = {
      entity_id: this.entity_id,
      command,
      params,
    };

    return this.hass.callService('vacuum', 'send_command', serviceData);
  }

  public startSegmentsCleaningAsync(roborock_area_ids: number[], repeat: number) {
    if (!this.hass || !this.entity_id) {
      return Promise.reject('Robot not initialized');
    }

    const serviceData = {
      entity_id: this.entity_id,
      command: 'app_segment_clean',
      params: [{
        segments: roborock_area_ids,
        repeat: repeat,
      }],
    };

    return this.hass.callService('vacuum', 'send_command', serviceData);
  }

  public setSuctionModeAsync(value: RoborockSuctionMode) {
    if (!this.hass || !this.entity_id) {
      return Promise.reject('Robot not initialized');
    }

    const availableModes = this.getAvailableSuctionModes();
    let targetValue = value;

    if (!availableModes.includes(targetValue) && value === RoborockSuctionMode.Off) {
      targetValue = this.getPreferredMopOnlySuctionMode();
    }

    if (!availableModes.includes(targetValue) && value === RoborockSuctionMode.OffRaiseMainBrush && availableModes.includes(RoborockSuctionMode.Off)) {
      targetValue = RoborockSuctionMode.Off;
    }

    if (!availableModes.includes(targetValue)) {
      return Promise.resolve();
    }

    return this.hass.callService('vacuum', 'set_fan_speed', {
      entity_id: this.entity_id,
      fan_speed: targetValue,
    }).catch(() => {
      const commandValue = SUCTION_MODE_COMMANDS[targetValue];
      return this.sendCommandAsync('set_custom_mode', [commandValue]);
    });
  }

  public async disableMopAsync() {
    if (!this.hass || !this.entity_id) {
      return Promise.reject('Robot not initialized');
    }

    const availableModes = this.getAvailableMopModeOptions();
    const entityId = this.mop_intensity_entity ?? `select.${this.name}_mop_intensity`;

    if (availableModes.includes('off')) {
      try {
        await this.hass.callService('select', 'select_option', {
          entity_id: entityId,
          option: 'off',
        });
        return;
      } catch {
        // Fall back to raw vacuum command below.
      }
    }

    try {
      await this.sendCommandAsync('set_water_box_custom_mode', [WATER_OFF_CODE]);
    } catch {
      await this.sendCommandAsync('set_water_box_distance_off');
    }
  }

  public setMopModeAsync(value: RoborockMopMode) {
    if (!this.hass || !this.entity_id) {
      return Promise.reject('Robot not initialized');
    }

    const targetValue = this.resolveSupportedMopMode(value);
    if (!targetValue) {
      return Promise.resolve();
    }

    const entityId = this.mop_intensity_entity ?? `select.${this.name}_mop_intensity`;
    return this.hass.callService('select', 'select_option', {
      entity_id: entityId,
      option: targetValue,
    });
  }

  public setRouteModeAsync(value: RoborockRouteMode) {
    if (!this.hass || !this.entity_id) {
      return Promise.reject('Robot not initialized');
    }
    const entityId = this.mop_mode_entity ?? `select.${this.name}_mop_mode`;
    return this.hass.callService('select', 'select_option', {
      entity_id: entityId,
      option: value,
    });
  }

  private state(id: string): any {
    return this.hass.states[id].state;
  }

  private getAttributeValue(entity: HassEntity, attribute: string) {
    if (!entity || !entity.attributes) {
      return undefined;
    }
    return entity.attributes[attribute];
  }
}
