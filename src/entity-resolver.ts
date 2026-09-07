import { MyHomeAssistant } from './types';

const ROBOROCK_DOMAIN = 'roborock';

/**
 * Resolves Roborock entities through the entity registry instead of guessing
 * their entity IDs.
 *
 * Home Assistant builds an entity ID from the device name once, when the entity
 * is first created, so entities added later (for example the dock switches that
 * replaced the deprecated mop drying binary sensor) can end up with a different
 * prefix than the vacuum they belong to. The registry exposes the stable
 * `translation_key` of every entity, which does not change on rename.
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
    const key = `${domain}.${translationKey}.${onDock}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const entities = this.hass?.entities;
    const devices = this.hass?.devices;
    // The registry is pushed to cards asynchronously; retry until it arrives.
    if (!entities || !devices || !this.vacuumEntityId) {
      return undefined;
    }

    const deviceId = onDock ? this.findDockDeviceId() : entities[this.vacuumEntityId]?.device_id;
    const result = deviceId === undefined
      ? undefined
      : Object.values(entities).find(entity =>
        entity.device_id === deviceId
        && entity.translation_key === translationKey
        && entity.platform === ROBOROCK_DOMAIN
        && entity.entity_id.startsWith(`${domain}.`)
      )?.entity_id;

    this.cache.set(key, result);
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
