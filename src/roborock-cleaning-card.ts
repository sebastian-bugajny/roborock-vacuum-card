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

  // Disable shadow DOM to inherit CSS variables from parent
  protected createRenderRoot() {
    return this;
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

    // Get colors from Home Assistant theme
    // Since we don't have Shadow DOM, try to get from this element or closest parent
    let primaryColor = '';
    let cardBackground = '';
    
    try {
      // Try to get from this element's computed style
      const computedStyle = getComputedStyle(this);
      primaryColor = computedStyle.getPropertyValue("--primary-color").trim();
      cardBackground = computedStyle.getPropertyValue("--ha-card-background").trim();
      
      // If not found on this element, try document root
      if (!primaryColor) {
        primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary-color").trim();
      }
      
      if (!cardBackground) {
        cardBackground = getComputedStyle(document.documentElement)
          .getPropertyValue("--ha-card-background").trim();
      }
    } catch (e) {
      console.error('[roborock-cleaning-card] Error getting styles:', e);
    }
    
    // Debug: log the colors
    console.log('[roborock-cleaning-card] primaryColor:', primaryColor);
    console.log('[roborock-cleaning-card] cardBackground:', cardBackground);
    
    // Get icon color
    this.iconColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--state-icon-color")
      .trim() || '#fff';

    const areas = this.getAreas();

    return html`
      <custom-cleaning-popup 
        robot=${this.robot} 
        .areas=${areas} 
        iconColor=${this.iconColor}
        primaryColor=${primaryColor || undefined}
        .inline=${true}>
      </custom-cleaning-popup>
    `;
  }

  private getAreas() {
    const areas: any[] = [];

    if (!this.config.areas)
      return areas;

    for (let { area_id, roborock_area_id } of this.config.areas) {
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
