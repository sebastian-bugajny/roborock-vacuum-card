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

    console.log('[roborock-cleaning-card] setConfig called with:', config);

    this.config = config;
    this.robot.setEntity(config.entity);
    this.robot.setMopIntensityEntity(config.mop_intensity_entity);
    this.robot.setMopModeEntity(config.mop_mode_entity);

    console.log('[roborock-cleaning-card] Robot configured:');
    console.log('  entity:', config.entity);
    console.log('  mop_intensity_entity:', config.mop_intensity_entity);
    console.log('  mop_mode_entity:', config.mop_mode_entity);
  }

  protected willUpdate(changedProps: Map<string, any>): void {
    super.willUpdate(changedProps);

    if (changedProps.has('hass') && this.hass) {
      console.log('[roborock-cleaning-card] hass updated, setting on robot');
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

    console.log('[roborock-cleaning-card] render called, robot:', this.robot);
    console.log('[roborock-cleaning-card] robot has hass:', !!this.robot?.['hass']);

    // Verify robot has all required data before rendering popup
    const robotHass = (this.robot as any).hass;
    const robotEntityId = (this.robot as any).entity_id;
    console.log('[roborock-cleaning-card] robot.hass:', robotHass);
    console.log('[roborock-cleaning-card] robot.entity_id:', robotEntityId);

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

    console.log('[roborock-cleaning-card] Processing areas:', this.config.areas);
    console.log('[roborock-cleaning-card] Available hass.areas:', (this.hass as any).areas);

    for (let areaConfig of this.config.areas) {
      const { area_id, roborock_area_id } = areaConfig;
      console.log('[roborock-cleaning-card] Processing area:', { area_id, roborock_area_id });

      const normalizedAreaId = area_id.replace(/ /g, '_').toLowerCase();
      const hassArea = (this.hass as any).areas?.[normalizedAreaId];

      console.log('[roborock-cleaning-card] Looking for normalized area:', normalizedAreaId);
      console.log('[roborock-cleaning-card] Found hassArea:', hassArea);

      if (!hassArea)
        continue;

      const processedArea = {
        icon: hassArea.icon,
        name: hassArea.name,
        area_id: normalizedAreaId,
        roborock_area_id,
      };

      console.log('[roborock-cleaning-card] Adding area:', processedArea);
      areas.push(processedArea);
    }

    console.log('[roborock-cleaning-card] Final areas array:', areas);
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
