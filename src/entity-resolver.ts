import { MyHomeAssistant, EntityRegistryEntry } from './types';

const ROBOROCK_DOMAIN = 'roborock';

/**
 * Resolves Roborock entities through the entity registry instead of guessing
 * their entity IDs.
 *
 * Home Assistant builds an entity ID from the device name once, when the entity
 * is first created, so entities added later (for example the dock switches that
 * replaced the deprecated mop drying binary sensor) can end up with a different
 * prefix than the vacuum they belong to. Users also rename entities, often into
 * their own language. The registry exposes the stable `translation_key` of every
 * entity, which survives both.
 */
export class RoborockEntityResolver {
  private hass: MyHomeAssistant | undefined;
  private vacuumEntityId: string = '';
  private cache: Map<string, string | undefined> = new Map();

  setHass(hass: MyHomeAssistant): void {
    this.hass = hass;
  }

  setVacuumEntity(entityId: string): void {
    if (entityId !== this.vacuumEntityId) {
      this.vacuumEntityId = entityId;
      this.cache.clear();
    }
  }

  /**
   * Returns the entity ID of a Roborock entity belonging to the configured
   * vacuum, or undefined when the registry is unavailable or has no match.
   */
  find(domain: string, translationKey: string, onDock: boolean): string | undefined {
    return this.lookup(
      `tk.${domain}.${translationKey}.${onDock}`,
      domain,
      onDock,
      entity => entity.translation_key === translationKey,
    );
  }

  /**
   * Same as `find`, but matches on the state's device class. Needed for the few
   * Roborock entities that carry no translation key and take their name from the
   * device class instead - the battery sensor is the only one the card uses.
   */
  findByDeviceClass(domain: string, deviceClass: string, onDock: boolean): string | undefined {
    return this.lookup(
      `dc.${domain}.${deviceClass}.${onDock}`,
      domain,
      onDock,
      entity => this.hass?.states[entity.entity_id]?.attributes?.device_class === deviceClass,
    );
  }

  private lookup(
    cacheKey: string,
    domain: string,
    onDock: boolean,
    matches: (entity: EntityRegistryEntry) => boolean,
  ): string | undefined {
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const entities = this.hass?.entities;
    const devices = this.hass?.devices;
    // The registry is pushed to cards asynchronously; retry until it arrives.
    if (!entities || !devices || !this.vacuumEntityId) {
      return undefined;
    }

    const deviceId = onDock ? this.findDockDeviceId() : entities[this.vacuumEntityId]?.device_id;
    const prefix = `${domain}.`;
    const result = deviceId === undefined
      ? undefined
      : Object.values(entities).find(entity =>
        entity.device_id === deviceId
        && entity.platform === ROBOROCK_DOMAIN
        && entity.entity_id.startsWith(prefix)
        && matches(entity)
      )?.entity_id;

    this.cache.set(cacheKey, result);
    return result;
  }

  /** The dock is a separate device, identified as `<duid>_dock`. */
  private findDockDeviceId(): string | undefined {
    const entities = this.hass?.entities ?? {};
    const devices = this.hass?.devices ?? {};

    const vacuumDeviceId = entities[this.vacuumEntityId]?.device_id;
    if (!vacuumDeviceId) {
      return undefined;
    }

    const duid = devices[vacuumDeviceId]?.identifiers
      ?.find(([integration]) => integration === ROBOROCK_DOMAIN)?.[1];
    if (!duid) {
      return undefined;
    }

    return Object.values(devices).find(device =>
      device.identifiers?.some(
        ([integration, id]) => integration === ROBOROCK_DOMAIN && id === `${duid}_dock`
      )
    )?.id;
  }
}

/** How each configurable entity of the card is found in the registry. */
export interface EntitySpec {
  domain: string;
  translationKey?: string;
  deviceClass?: string;
  onDock: boolean;
}

/**
 * Registry lookup specs for the entities the card reads, taken from the
 * official Roborock integration. `battery` has no translation key upstream, so
 * it is matched by device class instead.
 */
export const ENTITY_SPECS = {
  cleaning: { domain: 'binary_sensor', translationKey: 'in_cleaning', onDock: false },
  status: { domain: 'sensor', translationKey: 'status', onDock: false },
  battery: { domain: 'sensor', deviceClass: 'battery', onDock: false },
  vacuumError: { domain: 'sensor', translationKey: 'vacuum_error', onDock: false },
  dockError: { domain: 'sensor', translationKey: 'dock_error', onDock: true },
  mopDryingSwitch: { domain: 'switch', translationKey: 'mop_drying', onDock: true },
  mopDrying: { domain: 'binary_sensor', translationKey: 'mop_drying_status', onDock: true },
  mopDryingRemainingTime: { domain: 'sensor', translationKey: 'mop_drying_remaining_time', onDock: true },
  mopIntensity: { domain: 'select', translationKey: 'mop_intensity', onDock: false },
  mopMode: { domain: 'select', translationKey: 'mop_mode', onDock: false },
  currentRoom: { domain: 'sensor', translationKey: 'current_room', onDock: false },
  selectedMap: { domain: 'select', translationKey: 'selected_map', onDock: false },
  filterTimeLeft: { domain: 'sensor', translationKey: 'filter_time_left', onDock: false },
  sideBrushTimeLeft: { domain: 'sensor', translationKey: 'side_brush_time_left', onDock: false },
  mainBrushTimeLeft: { domain: 'sensor', translationKey: 'main_brush_time_left', onDock: false },
  sensorTimeLeft: { domain: 'sensor', translationKey: 'sensor_time_left', onDock: false },
} as const satisfies Record<string, EntitySpec>;

export type ResolvableEntity = keyof typeof ENTITY_SPECS;

/** Resolves one of the known entities, or undefined when it cannot be found. */
export function resolveEntity(
  resolver: RoborockEntityResolver,
  entity: ResolvableEntity,
): string | undefined {
  const spec: EntitySpec = ENTITY_SPECS[entity];

  return spec.deviceClass
    ? resolver.findByDeviceClass(spec.domain, spec.deviceClass, spec.onDock)
    : resolver.find(spec.domain, spec.translationKey!, spec.onDock);
}
