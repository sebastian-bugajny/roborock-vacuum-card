import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RoborockCleaningCardConfig, VacuumArea } from './types';
import type { HomeAssistant } from 'custom-card-helpers';
import { VacuumRobot } from './vacuum_robot';
import localize from './localize';
import { CustomCleaningPopup } from './custom-cleaning-popup';

// Register custom cleaning popup
typeof CustomCleaningPopup;

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

    // Ensure robot has hass before rendering
    if (this.robot && this.hass) {
      this.robot.setHass(this.hass as any);
    }

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
        .inline=${true}>
      </custom-cleaning-popup>
    `;
  }

  private getAreas() {
    const areas: any[] = [];

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

  static getConfigElement() {
    return document.createElement('roborock-cleaning-card-editor');
  }

  static getStubConfig() {
    return {
      entity: 'vacuum.robot',
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
