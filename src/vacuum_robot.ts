import {
  RoborockCleaningMode,
  RoborockSuctionMode,
  RoborockMopMode,
  RoborockRouteMode,
  MyHomeAssistant,
  HassEntity,
} from './types'

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
        return mode == RoborockSuctionMode.Off;
    }
  }

  static isSupportedMopMode(mode: RoborockMopMode, cleaningMode: RoborockCleaningMode): boolean {
    switch (cleaningMode) {
      case RoborockCleaningMode.VacAndMop:
      case RoborockCleaningMode.Mop:
        return [RoborockMopMode.Low, RoborockMopMode.Medium, RoborockMopMode.High].includes(mode);
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

  public getMopMode(): RoborockMopMode {
    if (!this.hass || !this.entity_id) {
      return RoborockMopMode.High; // Default value
    }
    const entityId = this.mop_intensity_entity ?? `select.${this.name}_mop_intensity`;
    const entity = this.hass.states[entityId];
    console.log('[getMopMode] entityId:', entityId, '| value:', entity?.state);
    if (!entity) {
      return RoborockMopMode.High;
    }
    
    const currentValue = entity.state.toLowerCase();
    
    // If value is vac_followed_by_mop or mop_after_vac, return last known intensity
    if (currentValue === 'vac_followed_by_mop' || currentValue === 'mop_after_vac') {
      console.log('[getMopMode] vac_followed_by_mop detected, returning last intensity:', this.lastMopIntensity);
      // If we don't have a stored value, default to medium
      return this.lastMopIntensity || RoborockMopMode.Medium;
    }
    
    // If it's a valid intensity value, store it for later
    if (currentValue === 'low' || currentValue === 'medium' || currentValue === 'high') {
      this.lastMopIntensity = currentValue as RoborockMopMode;
      console.log('[getMopMode] Stored intensity:', this.lastMopIntensity);
    }
    
    return entity.state as RoborockMopMode;
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
    
    console.log('[isMopActive] intensityEntity:', intensityEntityId, '| value:', intensityEntity?.state, '| lowercase:', intensity);
    console.log('[isMopActive] routeEntity:', routeEntityId, '| value:', routeEntity?.state, '| lowercase:', route);
    
    // Mop is active when:
    // 1. Intensity is NOT 'off' (low/medium/high/vac_followed_by_mop), OR
    // 2. Route is 'deep' or 'deep_plus' (mop-only modes)
    const isMopActive = intensity !== 'off' || route === 'deep' || route === 'deep_plus';
    
    console.log('[isMopActive] isMopActive:', isMopActive);
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
    console.log('[getRouteMode] entityId:', entityId, '| value:', entity.state);
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
    return this.hass.callService('vacuum', 'set_fan_speed', {
      entity_id: this.entity_id,
      fan_speed: value,
    });
  }

  public setMopModeAsync(value: RoborockMopMode) {
    if (!this.hass || !this.entity_id) {
      return Promise.reject('Robot not initialized');
    }
    const entityId = this.mop_intensity_entity ?? `select.${this.name}_mop_intensity`;
    return this.hass.callService('select', 'select_option', {
      entity_id: entityId,
      option: value,
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
