import { LitElement, CSSResultGroup, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  fireEvent,
} from 'custom-card-helpers';
import styles from './styles.css';
import buildConfig from './config'
import localize from './localize';
import { VacuumRobot } from './vacuum_robot'
import { RoborockEntityResolver, resolveEntity, ResolvableEntity } from './entity-resolver'
import {
  Template,
  RoborockArea,
  RoborockSensorIds,
  RoborockVacuumCardConfig,
  MyHomeAssistant,
  HassEntity,
  RoborockSuctionMode,
  RoborockMopMode,
  RoborockRouteMode,
} from './types'
import { formatTime, formatTimeAsMinutesSeconds, formatMinutesAsMinutesSeconds } from './format'
import { getSuctionIcon, getMoppingIcon as getMopIcon, getRouteIcon } from './resorces'
import { CustomCleaningPopup } from './custom-cleaning-popup'
import { RoborockCleaningCard } from './roborock-cleaning-card'
import { ROBOROCK_ICON_BASE64 } from './roborock-icon'

typeof (CustomCleaningPopup);
typeof (RoborockCleaningCard);

const PKG_VERSION = 'PKG_VERSION_VALUE';

console.info(
  `%c ROBOROCK-VACUUM-CARD %c ${PKG_VERSION}`,
  'color: white; background: black; font-weight: 700;',
  'color: black; background: white; font-weight: 700;',
);

@customElement('roborock-vacuum-card')
export class RoborockVacuumCard extends LitElement {
  @property({ attribute: false })
  public hass!: MyHomeAssistant;
  @state()
  private config!: RoborockVacuumCardConfig;
  @state()
  private popupActive: boolean = false;

  private iconColor: string = '#000';
  private robot!: VacuumRobot;
  private resolver: RoborockEntityResolver = new RoborockEntityResolver();

  get name(): string {
    return this.config.entity.replace('vacuum.', '');
  }

  /**
   * Guessed entity IDs, used only as a last resort. Home Assistant derives an
   * entity ID from the device name when the entity is first created, so these
   * break on rename, on a non-English setup, and for entities the integration
   * added later than the device - prefer `entityId()`, which asks the registry.
   */
  get sensor(): RoborockSensorIds {
    const name = this.name;
    const defaults = {
      cleaning: `binary_sensor.${name}_cleaning`,
      status: `sensor.${name}_status`,
      mopDrying: `binary_sensor.${name}_dock_mop_drying`,
      mopDryingSwitch: `switch.${name}_dock_mop_drying`,
      mopDryingRemainingTime: `sensor.${name}_dock_mop_drying_remaining_time`,
      battery: `sensor.${name}_battery`,
      vacuumError: `sensor.${name}_vacuum_error`,
      dockError: `sensor.${name}_dock_error`,
    };

    // Merge with custom sensor IDs from config
    return { ...defaults, ...(this.config?.sensors || {}) };
  }

  /**
   * Resolves one of the card's entities: an explicit config override wins, then
   * the entity registry, then the guessed ID.
   */
  private entityId(field: ResolvableEntity & keyof RoborockSensorIds): string | undefined {
    return this.config?.sensors?.[field]
      ?? resolveEntity(this.resolver, field)
      ?? this.sensor[field];
  }

  /** The state object of one of the card's entities, if it exists. */
  private entity(field: ResolvableEntity & keyof RoborockSensorIds): HassEntity | undefined {
    const id = this.entityId(field);
    return id ? this.hass.states[id] : undefined;
  }

  static get styles(): CSSResultGroup {
    return styles;
  }

  constructor() {
    super();
    this.robot = new VacuumRobot();
  }

  setConfig(config: RoborockVacuumCardConfig) {
    this.config = buildConfig(config);
    this.resolver.setVacuumEntity(this.config.entity);
    this.robot.setEntity(this.config.entity);
    this.robot.setMopIntensityEntity(this.config.mop_intensity_entity);
    this.robot.setMopModeEntity(this.config.mop_mode_entity);
  }

  getCardSize(): Number {
    return 3;
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  protected shouldUpdate(changedProps: Map<string, any>): boolean {
    // The card reads a dozen entities across two devices, several of them
    // resolved at render time, so there is no cheap subset to diff here - any
    // hass change is treated as relevant.
    if (changedProps.has('hass')) {
      return true;
    }

    return super.shouldUpdate(changedProps);
  }

  private onPopupShow(event: MouseEvent) {
    event.stopPropagation();
    this.popupActive = true;
  }

  private onPopupClose(event: MouseEvent) {
    event.stopPropagation();
    this.popupActive = false;
  }

  protected render(): Template {
    if (!this.hass || !this.config)
      return nothing;

    this.iconColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--state-icon-color")
      .trim();
    this.robot.setHass(this.hass);
    this.resolver.setHass(this.hass);

    const isCleaning = this.entity('cleaning')?.state == 'on';
    const state = this.state(this.config.entity);
    const combinedState = this.renderState(state);
    const errors = this.renderErrors();
    const roborockIcon = this.renderRoborockIcon();
    const name = this.renderName();
    const mode = this.renderMode();
    const mopDrying = this.renderMopDrying();
    const battery = this.renderBattery();
    const stats = this.renderStats(isCleaning ? 'cleaning' : state);
    const actions = this.renderActions(isCleaning, state);

    const popup = this.renderPopup();

    return html`
      <ha-card>
        <div class="header">
          ${name}
          ${mode}
          ${mopDrying}
          ${battery}
        </div>
        <div class="content" @click=${this.config.show_custom_cleaning_inline ? null : this.onPopupShow}>
          ${roborockIcon}
          ${errors}
          <div class="state">
            ${combinedState}
          </div>
        </div>
        ${stats}
        <div class="actions">
          ${actions}
        </div>
      </ha-card>
      ${popup}
    `;
  }

  private renderState(state: string | undefined) {
    const reachStatusEntity = this.entity('status');
    if (!reachStatusEntity)
      return localize(`status.${state}`);

    const reachState = reachStatusEntity.state;
    return state == reachState
      ? localize(`status.${state}`)
      : localize(`status.${state}`) + '. ' + localize(`reach_status.${reachState}`) + '.';
  }

  private renderRoborockIcon(): Template {
    if (!this.config.show_roborock_icon) {
      return nothing;
    }
    
    return html`
      <div class="roborock-icon">
        <img src="${ROBOROCK_ICON_BASE64}" alt="Roborock" />
      </div>
    `;
  }

  private renderPopup(): Template {
    if (!this.hass || !this.config || !this.config.areas)
      return nothing;

    // If inline mode is enabled, always show; otherwise only show when popup is active
    if (!this.config.show_custom_cleaning_inline && !this.popupActive)
      return nothing;

    const areas = this.getAreas();
    const inline = this.config.show_custom_cleaning_inline ?? false;

    return html`
      <custom-cleaning-popup
        .robot=${this.robot}
        .areas=${areas}
        iconColor=${this.iconColor}
        .inline=${inline}
        .defaultMode=${this.config.default_mode}
        .defaultModes=${this.config.default_modes}
        @close=${this.onPopupClose}>
      </custom-cleaning-popup>
    `;
  }

  private renderErrors(): Template {
    if (!this.hass || !this.config)
      return nothing;

    const vacuumErrorEntity = this.entity('vacuumError');
    const dockErrorEntity = this.entity('dockError');

    let isVacuumError = false;
    let vacuum: Template = nothing;
    if (vacuumErrorEntity) {
      const rawVacuumError = vacuumErrorEntity.state;
      const vacuumError = `vacuum_error.${rawVacuumError}`;

      // vacuum_error: 'none' means no error
      isVacuumError = rawVacuumError != "none";
      if (isVacuumError)
        vacuum = html`<div>${localize('common.vacuum_error')}: ${localize(vacuumError)}.</div>`;
    }

    let isDocError = false;
    let doc: Template = nothing;
    if (dockErrorEntity) {
      const rawDocError = dockErrorEntity.state;
      const docError = `doc_error.${rawDocError}`;

      // dock_error: 'ok' means no error
      isDocError = rawDocError != 'ok';
      if (isDocError)
        doc = html`<div>${localize('common.doc_error')}: ${localize(docError)}.</div>`;
    }

    if (!isVacuumError && !isDocError)
      return nothing;

    return html`
      <div class="errors">
        ${vacuum}
        ${doc}
      </div>
    `;
  }

  private renderStats(state: string | undefined): Template {
    if (state === undefined)
      return nothing;

    const statsList = this.config.stats[state] || this.config.stats.default || [];

    const stats = statsList.map(
      ({ entity, attribute, scale, divide_by, unit, title, format }) => {
        if (!entity && !attribute)
          return nothing;

        let state;

        if (entity && attribute) {
          state = this.getAttributeValue(this.hass.states[entity], attribute);
        } else if (attribute) {
          state = this.getAttributeValue(this.hass.states[this.config.entity], attribute);
        } else if (entity) {
          state = this.state(entity);
        } else {
          return nothing;
        }

        if (state === undefined) {
          state = 'N/A';
        } else {
          // Apply custom formatting if specified
          if (format === 'time_minutes_seconds') {
            const seconds = parseFloat(state);
            state = formatTimeAsMinutesSeconds(seconds);
          } else if (format === 'minutes_to_minutes_seconds') {
            const minutes = parseFloat(state);
            state = formatMinutesAsMinutesSeconds(minutes);
          } else {
            const needProcessing = scale != null || divide_by != null;
            if (needProcessing) {
              let value = parseFloat(state);

              if (divide_by != null && divide_by > 0)
                value = value / divide_by;

              if (scale != null)
                state = value.toFixed(scale);
              else
                state = value.toString();
            }
          }
        }

        return html`
          <div class="stats-block" @click="${() => this.handleMore(entity)}">
            <span class="stats-value">${state}</span>
            ${unit}
            <div class="stats-subtitle">${title}</div>
          </div>
        `;
      },
    );

    if (!stats.length) {
      return nothing;
    }

    return html`<div class="stats">${stats}</div>`;
  }

  private renderActions(isCleaning: boolean, state: string | undefined) {
    if (isCleaning) {
      const pauseResume = state == 'paused'
        ? html`
        <paper-button @click="${this.handleVacuumAction('start')}">
          <ha-icon icon="hass:play"></ha-icon>
          ${localize('common.resume')}
        </paper-button>`
        : html`
        <paper-button @click="${this.handleVacuumAction('pause')}">
          <ha-icon icon="hass:pause"></ha-icon>
          ${localize('common.pause')}
        </paper-button>`;

      return html`
      ${pauseResume}
      <paper-button @click="${this.handleVacuumAction('stop')}">
        <ha-icon icon="hass:stop"></ha-icon>
        ${localize('common.stop')}
      </paper-button>
      <paper-button @click="${this.handleVacuumAction('return_to_base')}">
        <ha-icon icon="hass:home-map-marker"></ha-icon>
        ${localize('common.return_to_base')}
      </paper-button>
      `;
    } else {
      return html`
      <paper-button @click="${this.handleVacuumAction('start')}">
        <ha-icon icon="hass:play"></ha-icon>
        ${localize('common.start')}
      </paper-button>
      <paper-button @click="${this.handleVacuumAction('locate')}">
      <ha-icon icon="mdi:map-marker"></ha-icon>
      ${localize('common.locate')}
      </paper-button>
      `;
    }
  }

  private renderName(): Template {
    const entity = this.hass.states[this.config.entity];
    const data = {
      friendly_name: this.getAttributeValue(entity, 'friendly_name'),
      icon: this.getAttributeValue(entity, 'icon'),
    };

    return html`
      <div class="tip" @click="${() => this.handleMore(this.config.entity)}">
        <ha-icon icon="${data.icon}"></ha-icon>
        <span class="icon-title">${data.friendly_name}</span>
      </div>
    `;
  }

  private renderMode(): Template {
    const icons = [],
      suction = this.robot.getSuctionMode(),
      mop = this.robot.getMopMode(),
      route = this.robot.getRouteMode();

    // Determine cleaning mode based on ACTUAL sensor values:
    // - Mop-only: suction is Off AND (mop is not Off OR route is Deep/DeepPlus)
    // - Vac-only: suction is MaxPlus
    // - VacAndMop: everything else where both are active
    const isMopOnly = [RoborockSuctionMode.Off, RoborockSuctionMode.OffRaiseMainBrush].includes(suction) && 
                      (mop !== RoborockMopMode.Off || 
                       route === RoborockRouteMode.Deep || 
                       route === RoborockRouteMode.DeepPlus);
    
    const isVacOnly = suction === RoborockSuctionMode.MaxPlus;

    // Show suction icon if not in Mop-only mode
    if (!isMopOnly)
      icons.push(getSuctionIcon(suction, 24, this.iconColor));
    
    // Show mop icon if not in Vac-only mode (getMopIcon returns nothing for 'off')
    if (!isVacOnly) {
      const mopIcon = getMopIcon(mop, 24, this.iconColor);
      if (mopIcon !== nothing)
        icons.push(mopIcon);
    }
    
    // Always show route icon
    icons.push(getRouteIcon(route, 24, this.iconColor));

    const result = icons.map(icon => html`<div class="tip">${icon}</div>`)

    return html`
    <div class="modes" @click=${this.config.show_custom_cleaning_inline ? null : this.onPopupShow}>
      ${result}
    </div>
    `;
  }

  private renderMopDrying(): Template {
    // The mop drying binary sensor is deprecated and stops working in HA
    // 2027.3.0. The switch that replaced it reports the same state, so prefer
    // it and keep the binary sensor only for older integrations.
    const mopDryingEntity = this.entity('mopDryingSwitch') ?? this.entity('mopDrying');
    if (!mopDryingEntity)
      return nothing;

    const isDrying = mopDryingEntity.state;
    if (isDrying != 'on')
      return nothing;

    const mopDryingTimeEntity = this.entity('mopDryingRemainingTime');
    if (!mopDryingTimeEntity)
      return nothing;

    const timeValue = Number(mopDryingTimeEntity.state);
    const unit = mopDryingTimeEntity.attributes.unit_of_measurement;

    // Convert to seconds if needed
    const timeInSeconds = unit === 'min' || unit === 'minutes' ? timeValue * 60 : timeValue;

    return html`
      <div class="tip" @click="${() => this.handleMore(mopDryingTimeEntity.entity_id)}">
        <ha-icon icon="mdi:heat-wave"></ha-icon>
        <span class="icon-title">${formatTime(timeInSeconds)}</span>
      </div>
    `;
  }

  private renderBattery(): Template {
    const entity = this.entity('battery');

    if (!entity) {
      return html``;
    }

    const n = Number(entity.state);
    const value = Number.isFinite(n) ? Math.round(n) : entity.state;
    const unit = entity.attributes.unit_of_measurement || (Number.isFinite(n) ? '%' : '');

    return html`
    <div class="tip" @click="${() => this.handleMore(entity.entity_id)}">
      <state-badge class="battery-badge" .hass=${this.hass} .stateObj=${entity}></state-badge>
      <span class="icon-title">${value}${unit}</span>
    </div>
    `;
  }

  private handleVacuumAction(action: string) {
    return () => this.robot.callServiceAsync(action);
  }

  private handleMore(entityId?: string): void {
    fireEvent(
      this,
      'hass-more-info',
      {
        entityId,
      },
      {
        bubbles: false,
        composed: true,
      },
    );
  }

  private getAreas() {
    const areas: RoborockArea[] = [];

    if (!this.config.areas)
      return areas;

    for (let { area_id, roborock_area_id } of this.config.areas) {
      area_id = area_id.replace(/ /g, '_').toLowerCase();
      const area = this.hass.areas[area_id];
      if (!area)
        continue;

      areas.push({
        icon: area.icon,
        name: area.name,
        area_id,
        roborock_area_id,
      });
    }

    return areas;
  }

  private getAttributeValue(entity: HassEntity, attribute: string): string | undefined {
    return entity.attributes[attribute];
  }

  private state(id: string): string | undefined {
    return this.hass.states[id]?.state;
  }

  static getStubConfig() {
    return {
      entity: 'vacuum.robot',
      stats: {},
    };
  }
}

// Register card in customCards so it shows up in the "Add card" picker
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'roborock-vacuum-card',
  name: 'Roborock Vacuum Card',
  description: 'Status, modes and custom cleaning for Roborock vacuums',
  preview: false,
  documentationURL: 'https://github.com/sebastian-bugajny/roborock-vacuum-card',
});

declare global {
  interface HTMLElementTagNameMap {
    'roborock-vacuum-card': RoborockVacuumCard;
  }
}
