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

  public getMopMode(): RoborockMopMode {
    if (!this.hass || !this.entity_id) {
      return RoborockMopMode.High; // Default value
    }
    const entityId = this.mop_intensity_entity ?? `select.${this.name}_mop_intensity`;
    const entity = this.hass.states[entityId];
    if (!entity) {
      return RoborockMopMode.High;
    }
    return entity.state as RoborockMopMode;
  }

  public getRouteMode(): RoborockRouteMode {
    if (!this.hass || !this.entity_id) {
      return RoborockRouteMode.Standard; // Default value
    }
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
