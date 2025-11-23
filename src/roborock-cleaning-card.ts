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

  setConfig(config: RoborockCleaningCardConfig): void {
    if (!config.entity) {
      throw new Error(localize('error.missing_entity'));
    }

    this.config = config;
    this.robot.setEntity(config.entity);
    this.robot.setMopIntensityEntity(config.mop_intensity_entity);
    this.robot.setMopModeEntity(config.mop_mode_entity);
  }

  protected updated(changedProps: Map<string, any>): void {
    super.updated(changedProps);

    if (changedProps.has('hass') && this.hass) {
      this.robot?.setHass(this.hass as any);
    }
  }

  protected render() {
    if (!this.hass || !this.config) {
      return nothing;
    }

    const areas = this.config.areas?.map((a: VacuumArea) => ({
      id: a.area_id,
      name: localize(`area.${a.area_id}`),
      icon: 'mdi:home',
      roborock_area_id: a.roborock_area_id
    })) || [];

    return html`
      <custom-cleaning-popup 
        robot=${this.robot} 
        areas=${areas} 
        iconColor=${this.iconColor} 
        .inline=${true}>
      </custom-cleaning-popup>
    `;
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
