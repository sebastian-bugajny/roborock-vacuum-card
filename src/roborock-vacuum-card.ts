import { LitElement, CSSResultGroup, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  fireEvent,
} from 'custom-card-helpers';
import styles from './styles.css';
import buildConfig from './config'
import localize from './localize';
import { VacuumRobot } from './vacuum_robot'
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

  get name(): string {
    return this.config.entity.replace('vacuum.', '');
  }

  get sensor(): RoborockSensorIds {
    const name = this.name;
    const defaults = {
      cleaning: `binary_sensor.${name}_cleaning`,
      mopDrying: `binary_sensor.${name}_dock_mop_drying`,
      mopDryingRemainingTime: `sensor.${name}_dock_mop_drying_remaining_time`,
      battery: `sensor.${name}_battery`,
      vacuumError: `sensor.${name}_vacuum_error`,
      dockError: `sensor.${name}_dock_error`,
    };

    // Merge with custom sensor IDs from config
    return { ...defaults, ...(this.config?.sensors || {}) };
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

    const isCleaning = this.state(this.sensor.cleaning) == 'on';
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
    const reachStatusSensor = this._getExistingSensorId([`sensor.${this.name}_status`]);
    if (!reachStatusSensor)
      return localize(`status.${state}`);

    const reachState = this.state(reachStatusSensor);
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
        @close=${this.onPopupClose}>
      </custom-cleaning-popup>
    `;
  }

  private renderErrors(): Template {
    if (!this.hass || !this.config)
      return nothing;

    const vacuumErrorSensor = this.sensor.vacuumError;
    const dockErrorSensor = this.sensor.dockError;

    let isVacuumError = false;
    let vacuum: Template = nothing;
    if (vacuumErrorSensor && this.hass.states[vacuumErrorSensor]) {
      const rawVacuumError = this.state(vacuumErrorSensor);
      const vacuumError = `vacuum_error.${rawVacuumError}`;

      // vacuum_error: 'none' means no error
      isVacuumError = rawVacuumError != "none";
      if (isVacuumError)
        vacuum = html`<div>${localize('common.vacuum_error')}: ${localize(vacuumError)}.</div>`;
    }

    let isDocError = false;
    let doc: Template = nothing;
    if (dockErrorSensor && this.hass.states[dockErrorSensor]) {
      const rawDocError = this.state(dockErrorSensor);
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
    const isMopOnly = suction === RoborockSuctionMode.Off && 
                      (mop !== RoborockMopMode.Off || 
                       route === RoborockRouteMode.Deep || 
                       route === RoborockRouteMode.DeepPlus);
    
    const isVacOnly = suction === RoborockSuctionMode.MaxPlus;

    console.log('[renderMode] suction:', suction, '| mop:', mop, '| route:', route, '| isMopOnly:', isMopOnly, '| isVacOnly:', isVacOnly);

    // Show suction icon if not in Mop-only mode
    if (!isMopOnly)
      icons.push(getSuctionIcon(suction, 24, this.iconColor));
    
    // Show mop icon if not in Vac-only mode  
    if (!isVacOnly && mop != RoborockMopMode.Off)
      icons.push(getMopIcon(mop, 24, this.iconColor));
    
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
    const mopDryingEntity = this.hass.states[this.sensor.mopDrying];
    if (!mopDryingEntity)
      return nothing;

    const isDrying = mopDryingEntity.state;
    if (isDrying != 'on')
      return nothing;

    const mopDryingTimeEntity = this.hass.states[this.sensor.mopDryingRemainingTime];
    if (!mopDryingTimeEntity)
      return nothing;

    const timeValue = Number(mopDryingTimeEntity.state);
    const unit = mopDryingTimeEntity.attributes.unit_of_measurement;

    // Convert to seconds if needed
    const timeInSeconds = unit === 'min' || unit === 'minutes' ? timeValue * 60 : timeValue;

    return html`
      <div class="tip" @click="${() => this.handleMore(this.sensor.mopDryingRemainingTime)}">
        <ha-icon icon="mdi:heat-wave"></ha-icon>
        <span class="icon-title">${formatTime(timeInSeconds)}</span>
      </div>
    `;
  }

  private renderBattery(): Template {
    const entity = this.hass.states[this.sensor.battery];

    if (!entity) {
      return html``;
    }

    const n = Number(entity.state);
    const value = Number.isFinite(n) ? Math.round(n) : entity.state;
    const unit = entity.attributes.unit_of_measurement || (Number.isFinite(n) ? '%' : '');

    return html`
    <div class="tip" @click="${() => this.handleMore(this.sensor.battery)}">
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

  _getExistingSensorId(sensorIds: string[]): string | undefined {
    for (let sensorId of sensorIds) {
      if (this.hass.states[sensorId])
        return sensorId;
    }
  }

  private getAttributeValue(entity: HassEntity, attribute: string): string | undefined {
    return entity.attributes[attribute];
  }

  private state(id: string): string | undefined {
    return this.hass.states[id]?.state;
  }
}
