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
  
  connectedCallback() {
    super.connectedCallback();
    
    console.log('[roborock-cleaning-card] connectedCallback called');
    
    // Try to find and use the correct primary color from the theme
    const docStyle = getComputedStyle(document.documentElement);
    
    // Get all potentially useful color variables
    const primaryColor = docStyle.getPropertyValue("--primary-color").trim();
    const stateActiveColor = docStyle.getPropertyValue("--state-active-color").trim();
    const accentColor = docStyle.getPropertyValue("--accent-color").trim();
    const lightPrimaryColor = docStyle.getPropertyValue("--light-primary-color").trim();
    const darkPrimaryColor = docStyle.getPropertyValue("--dark-primary-color").trim();
    
    console.log('[roborock-cleaning-card] CSS Variables:');
    console.log('  --primary-color:', primaryColor);
    console.log('  --state-active-color:', stateActiveColor);
    console.log('  --accent-color:', accentColor);
    console.log('  --light-primary-color:', lightPrimaryColor);
    console.log('  --dark-primary-color:', darkPrimaryColor);
    
    // Use the same blue color as the main card's Shadow DOM default
    // This is the color defined in styles.css line 10
    const defaultBlue = '#89B3F8';
    
    console.log('[roborock-cleaning-card] Using default blue color:', defaultBlue);
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
