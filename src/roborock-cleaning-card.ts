import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RoborockCleaningCardConfig, RoborockCleaningMode, VacuumArea } from './types';
import type { HomeAssistant } from 'custom-card-helpers';
import { VacuumRobot } from './vacuum_robot';
import localize from './localize';
import { CustomCleaningPopup } from './custom-cleaning-popup';
import { RoborockRoomSource } from './room-source';
import { MyHomeAssistant, RoborockArea } from './types';
import { RoborockCleaningCardEditor } from './roborock-cleaning-card-editor';

// Register custom cleaning popup
typeof CustomCleaningPopup;
// Register the visual config editor
typeof RoborockCleaningCardEditor;

@customElement('roborock-cleaning-card')
export class RoborockCleaningCard extends LitElement {
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @state()
  private config!: RoborockCleaningCardConfig;

  @state()
  private robot!: VacuumRobot;

  @state()
  private iconColor: string = '#fff';

  private roomSource: RoborockRoomSource = new RoborockRoomSource();

  constructor() {
    super();
    this.robot = new VacuumRobot();
  }

  connectedCallback() {
    super.connectedCallback();

    // Use the same blue color as the main card's Shadow DOM default
    const defaultBlue = '#89B3F8';
    this.style.setProperty('--primary-color', defaultBlue);
  }

  setConfig(config: RoborockCleaningCardConfig): void {
    if (!config.entity) {
      throw new Error(localize('error.missing_entity'));
    }

    this.config = config;
    this.roomSource.setVacuumEntity(config.entity);
    this.robot.setEntity(config.entity);
    this.robot.setMopIntensityEntity(config.mop_intensity_entity);
    this.robot.setMopModeEntity(config.mop_mode_entity);
  }

  protected willUpdate(changedProps: Map<string, any>): void {
    super.willUpdate(changedProps);

    if (changedProps.has('hass') && this.hass) {
      this.robot.setHass(this.hass as any);
    }
  }

  protected render() {
    if (!this.hass || !this.config) {
      return nothing;
    }

    // Without the vacuum entity the panel would render but every action would
    // silently do nothing.
    if (!this.hass.states[this.config.entity]) {
      return html`
        <ha-card>
          <div style="padding: 16px;">
            ${localize('error.entity_not_found', '{entity}', this.config.entity)}
          </div>
        </ha-card>
      `;
    }

    // Ensure robot has hass before rendering
    if (this.robot && this.hass) {
      this.robot.setHass(this.hass as any);
    }

    this.syncRooms();

    // Get icon color
    this.iconColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--state-icon-color")
      .trim() || '#fff';

    const areas = this.getAreas();

    // Don't pass primaryColor - let components use their default CSS variables
    // which should inherit from the document/theme
    return html`
      <custom-cleaning-popup
        .robot=${this.robot}
        .areas=${areas}
        iconColor=${this.iconColor}
        .inline=${true}
        .defaultMode=${this.config.default_mode ?? RoborockCleaningMode.VacAndMop}
        .defaultModes=${this.config.default_modes ?? {}}>
      </custom-cleaning-popup>
    `;
  }

  /** See the main card: configured `areas` win, otherwise rooms are discovered. */
  private getAreas(): RoborockArea[] {
    return this.config.areas?.length
      ? this.getConfiguredAreas()
      : this.roomSource.getAreas();
  }

  private syncRooms(): void {
    if (this.config.areas?.length)
      return;

    this.roomSource.setHass(this.hass as MyHomeAssistant);
    this.roomSource.sync().then(changed => {
      if (changed)
        this.requestUpdate();
    });
  }

  private getConfiguredAreas(): RoborockArea[] {
    const areas: RoborockArea[] = [];

    if (!this.config.areas)
      return areas;

    for (let areaConfig of this.config.areas) {
      const { area_id, roborock_area_id } = areaConfig;
      const normalizedAreaId = area_id.replace(/ /g, '_').toLowerCase();
      const hassArea = (this.hass as any).areas?.[normalizedAreaId];

      if (!hassArea)
        continue;

      areas.push({
        icon: hassArea.icon,
        name: hassArea.name,
        area_id: normalizedAreaId,
        roborock_area_id,
      });
    }

    return areas;
  }

  getCardSize(): number {
    return 3;
  }

  /** Provide the visual editor shown in the card configuration dialog. */
  static getConfigElement(): HTMLElement {
    return document.createElement('roborock-cleaning-card-editor');
  }

  /** Called by the card picker - offer a vacuum that actually exists. */
  static getStubConfig(hass?: HomeAssistant) {
    const vacuum = hass
      ? Object.keys(hass.states).find(entityId => entityId.startsWith('vacuum.'))
      : undefined;

    return {
      entity: vacuum ?? 'vacuum.robot',
      areas: []
    };
  }
}

// Register card in customCards
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'roborock-cleaning-card',
  name: 'Roborock Cleaning Card',
  description: 'Custom cleaning panel for Roborock vacuums'
});

declare global {
  interface HTMLElementTagNameMap {
    'roborock-cleaning-card': RoborockCleaningCard;
  }
}
