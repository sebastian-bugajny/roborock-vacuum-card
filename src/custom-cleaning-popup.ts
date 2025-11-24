import { LitElement, CSSResultGroup, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './custom-cleaning-popup.css';
import { getSuctionIcon, getMoppingIcon, getRouteIcon, getCycleIcon } from './resorces'
import localize from './localize';
import { VacuumRobot } from './vacuum_robot'
import {
  Template,
  StringEvent,
  StringArrayEvent,
  Button,
  SvgButton,
  RoborockCleaningMode,
  RoborockSuctionMode,
  RoborockMopMode,
  RoborockRouteMode,
  RoborockArea,
} from './types'
import { MultiselectButtonGroup } from './multiselect-button-group'
import { SegmentButtonGroup } from './segment-button-group'
import { CyclesButton } from './cycles-button'

typeof (MultiselectButtonGroup);
typeof (SegmentButtonGroup);
typeof (CyclesButton);

@customElement('custom-cleaning-popup')
export class CustomCleaningPopup extends LitElement {
  @property()
  public robot!: VacuumRobot;
  @property()
  public areas: RoborockArea[] = [];
  @property()
  public iconColor: string = '#fff';
  @property()
  public primaryColor: string = '';
  @property({ type: Boolean })
  public inline: boolean = false;

  @state()
  private popupRequestInProgress: boolean = false;
  @state()
  private activeCleaningMode: RoborockCleaningMode = RoborockCleaningMode.VacAndMop;
  @state()
  private activeSuctionMode: RoborockSuctionMode = RoborockSuctionMode.Turbo;
  @state()
  private activeMopMode: RoborockMopMode = RoborockMopMode.High;
  @state()
  private activeRouteMode: RoborockRouteMode = RoborockRouteMode.Standard;
  @state()
  private activeCycleMode: string = '1';

  private activeAreas: string[] = [];
  private cleaningModes: Button<string>[] = [];
  private suctionModes: SvgButton<string>[] = [];
  private mopModes: SvgButton<string>[] = [];
  private routeModes: SvgButton<string>[] = [];
  private modesInitialized: boolean = false;

  static get styles(): CSSResultGroup {
    return styles;
  }

  connectedCallback() {
    super.connectedCallback();

    this.cleaningModes = [{
      text: localize('mode.vac&mop'),
      value: RoborockCleaningMode.VacAndMop
    }, {
      text: localize('mode.mop'),
      value: RoborockCleaningMode.Mop
    }, {
      text: localize('mode.vac'),
      value: RoborockCleaningMode.Vac
    }];

    // Always start with VacAndMop mode
    this.activeCleaningMode = RoborockCleaningMode.VacAndMop;
  }
  
  protected willUpdate(changedProps: Map<string, any>) {
    super.willUpdate(changedProps);
    
    console.log('[custom-cleaning-popup] willUpdate, robot:', this.robot);
    console.log('[custom-cleaning-popup] modesInitialized:', this.modesInitialized);
    
    // Initialize modes from robot state when robot becomes available
    if (!this.modesInitialized && this.robot) {
      try {
        console.log('[custom-cleaning-popup] Attempting to initialize modes');
        this.activeSuctionMode = this.robot.getSuctionMode();
        this.activeMopMode = this.robot.getMopMode();
        this.activeRouteMode = this.robot.getRouteMode();
        this.modesInitialized = true;
        console.log('[custom-cleaning-popup] Modes initialized from robot');
      } catch (e) {
        console.warn('[custom-cleaning-popup] Could not get initial modes from robot, using defaults', e);
        // Keep default values if we can't get them from robot
      }
      
      // Set defaults based on cleaning mode
      this.fixModesIfNeeded();
    }
  }

  private onCleaningModeChange(e: StringEvent) {
    const cleaningMode = e.detail as RoborockCleaningMode;;
    this.activeCleaningMode = cleaningMode;
    this.fixModesIfNeeded();
  }

  private onSuctionModeChange(e: StringEvent) {
    this.activeSuctionMode = e.detail as RoborockSuctionMode;
  }

  private onMoppingModeChange(e: StringEvent) {
    this.activeMopMode = e.detail as RoborockMopMode;
  }

  private onRouteModeChange(e: StringEvent) {
    this.activeRouteMode = e.detail as RoborockRouteMode;
  }

  private onCycleModeChange(e: StringEvent) {
    this.activeCycleMode = e.detail;
  }

  private onAreasChange(e: StringArrayEvent) {
    this.activeAreas = e.detail;
    this.requestUpdate();
  }

  private async onRunCleaning() {
    const delay = 100;

    console.log('[custom-cleaning-popup] onRunCleaning called');
    console.log('[custom-cleaning-popup] robot:', this.robot);
    console.log('[custom-cleaning-popup] activeAreas:', this.activeAreas);

    if (this.activeAreas.length == 0) {
      console.log('[custom-cleaning-popup] No areas selected, returning');
      return;
    }

    this.popupRequestInProgress = true;

    try {
      this.fixModesIfNeeded();
      console.log('[custom-cleaning-popup] Setting suction mode:', this.activeSuctionMode);
      await this.robot.setSuctionModeAsync(this.activeSuctionMode as RoborockSuctionMode);
      await new Promise(r => setTimeout(r, delay));
      
      console.log('[custom-cleaning-popup] Setting mop mode:', this.activeMopMode);
      await this.robot.setMopModeAsync(this.activeMopMode as RoborockMopMode);
      await new Promise(r => setTimeout(r, delay));
      
      console.log('[custom-cleaning-popup] Setting route mode:', this.activeRouteMode);
      await this.robot.setRouteModeAsync(this.activeRouteMode as RoborockRouteMode);
      await new Promise(r => setTimeout(r, delay));

      const area_ids = this.activeAreas.map(v => parseInt(v, 10));
      console.log('[custom-cleaning-popup] Starting segments cleaning:', area_ids, 'cycles:', this.activeCycleMode);
      await this.robot.startSegmentsCleaningAsync(area_ids, parseInt(this.activeCycleMode, 10));

      console.log('[custom-cleaning-popup] Cleaning started successfully');
      this.closePopup();
    } catch (error) {
      console.error('[custom-cleaning-popup] Error during cleaning:', error);
    } finally {
      this.popupRequestInProgress = false;
    }
  }

  private async onCleanAll() {
    const delay = 100;

    console.log('[custom-cleaning-popup] onCleanAll called');
    console.log('[custom-cleaning-popup] robot:', this.robot);

    this.popupRequestInProgress = true;

    try {
      this.fixModesIfNeeded();
      console.log('[custom-cleaning-popup] Setting suction mode:', this.activeSuctionMode);
      await this.robot.setSuctionModeAsync(this.activeSuctionMode as RoborockSuctionMode);
      await new Promise(r => setTimeout(r, delay));
      
      console.log('[custom-cleaning-popup] Setting mop mode:', this.activeMopMode);
      await this.robot.setMopModeAsync(this.activeMopMode as RoborockMopMode);
      await new Promise(r => setTimeout(r, delay));
      
      console.log('[custom-cleaning-popup] Setting route mode:', this.activeRouteMode);
      await this.robot.setRouteModeAsync(this.activeRouteMode as RoborockRouteMode);
      await new Promise(r => setTimeout(r, delay));

      // Start cleaning without specifying areas (whole home)
      console.log('[custom-cleaning-popup] Starting whole home cleaning');
      await this.robot.callServiceAsync('start');

      console.log('[custom-cleaning-popup] Cleaning started successfully');
      this.closePopup();
    } catch (error) {
      console.error('[custom-cleaning-popup] Error during cleaning:', error);
    } finally {
      this.popupRequestInProgress = false;
    }
  }

  private onPopupClose(event: MouseEvent) {
    event.stopPropagation();
    this.closePopup();
  }

  private onPopupBackgroundClick(e: MouseEvent) {
    // Don't close in inline mode
    if (this.inline)
      return;

    const target = e.target as Element;
    if (!target || !target.classList.contains('popup-background'))
      return;

    this.closePopup();
  }

  private closePopup() {
    this.activeAreas = [];
    this.dispatchEvent(new CustomEvent('close'));
  }

  render(): Template {
    const suctionMode = this.renderSuctionMode();
    const moppingMode = this.renderMoppingMode();
    const routeMode = this.renderRouteMode();
    const cycleMode = this.renderCycleMode();
    const areas = this.renderAreas();
    const progress = this.renderProgress();

    const containerClass = this.inline ? 'inline-container' : 'popup-background';
    const closeButton = this.inline ? nothing : html`<ha-icon-button icon="mdi:close" @click=${this.onPopupClose} ><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>`;
    
    // Calculate the actual color that should be used for selection background
    // This matches the calculation in segment-button-group.css: color-mix(in srgb, var(--primary-color) 40%, var(--vc-background))
    let styleAttr = '';
    if (this.primaryColor) {
      // We need to pass both --primary-color and calculate --vc-primary-select-background
      const cardBg = getComputedStyle(document.documentElement).getPropertyValue("--ha-card-background").trim() || 
                     getComputedStyle(document.documentElement).getPropertyValue("--card-background-color").trim() || 
                     'white';
      styleAttr = `--primary-color: ${this.primaryColor}; --ha-card-background: ${cardBg}; --card-background-color: ${cardBg};`;
    }

    return html`
      <div class="${containerClass}" style="${styleAttr}" @click=${this.onPopupBackgroundClick}>
        <div class="popup-card">
          <div class="header">
            ${closeButton}
            <div class="text">${localize(`common.custom_cleaning`)}</div>
          </div>
          <div class="content">
            <div class="parameters">
              <segment-button-group primaryColor=${this.primaryColor} buttons=${this.cleaningModes} active=${this.activeCleaningMode} @select=${this.onCleaningModeChange}></segment-button-group>
              ${suctionMode}
              ${moppingMode}
              ${routeMode}
              ${cycleMode}
            </div>
            ${areas}
          </div>
          <div class="actions">
            <button class="clean-button ${this.activeAreas.length == 0 ? 'disabled' : ''}" @click=${this.onRunCleaning}>CLEAN</button>
            <button class="clean-button" @click=${this.onCleanAll}>CLEAN ALL</button>
          </div>
          ${progress}
        </div>
      </div>
    `;
  }

  private renderProgress(): Template {
    if (!this.popupRequestInProgress)
      return nothing;

    return html`
    <div class="progress">
      <ha-circular-progress indeterminate=true size="large"></ha-circular-progress>
    </div>
    `;
  }

  private renderSuctionMode(): Template {
    if (this.activeCleaningMode == RoborockCleaningMode.Mop)
      return nothing;

    this.suctionModes = Object.values(RoborockSuctionMode)
      .map(v => ({ icon: getSuctionIcon(v, 24, this.iconColor), value: v, disabled: !this.isSupportedSuctionMode(v, this.activeCleaningMode) }));
    const mode = localize(`suction_mode.${this.activeSuctionMode}`);

    return html`
      <div class="mode-title">
        <div class="title">${localize('common.suction_mode')}</div>
        <div class="value">${mode}</div>
      </div>
      <segment-button-group primaryColor=${this.primaryColor} buttons=${this.suctionModes} active=${this.activeSuctionMode} @select=${this.onSuctionModeChange}></segment-button-group>
    `;
  }

  private renderMoppingMode(): Template {
    if (this.activeCleaningMode == RoborockCleaningMode.Vac)
      return nothing;

    this.mopModes = Object.values(RoborockMopMode)
      .map(v => ({ icon: getMoppingIcon(v, 24, this.iconColor), value: v, disabled: !this.isSupportedMopMode(v, this.activeCleaningMode) }));
    const mode = localize(`mop_mode.${this.activeMopMode}`);

    return html`
      <div class="mode-title">
        <div class="title">${localize('common.mop_mode')}</div>
        <div class="value">${mode}</div>
      </div>
      <segment-button-group primaryColor=${this.primaryColor} buttons=${this.mopModes} active=${this.activeMopMode} @select=${this.onMoppingModeChange}></segment-button-group>
    `;
  }

  private renderRouteMode(): Template {
    this.routeModes = Object.values(RoborockRouteMode)
      .map(v => ({ icon: getRouteIcon(v, 24, this.iconColor), value: v, disabled: !this.isSupportedRouteMode(v, this.activeCleaningMode) }));
    const mode = localize(`route_mode.${this.activeRouteMode}`);

    return html`
      <div class="mode-title">
        <div class="title">${localize('common.route_mode')}</div>
        <div class="value">${mode}</div>
      </div>
      <segment-button-group primaryColor=${this.primaryColor} buttons=${this.routeModes} active=${this.activeRouteMode} @select=${this.onRouteModeChange}></segment-button-group>
    `;
  }

  private renderCycleMode(): Template {
    const cycleModes = [
      { icon: getCycleIcon('1', 24, this.iconColor), value: '1' },
      { icon: getCycleIcon('2', 24, this.iconColor), value: '2' }
    ];

    return html`
      <div class="mode-title">
        <div class="title">${localize('common.cycle_mode')}</div>
        <div class="value">x${this.activeCycleMode}</div>
      </div>
      <segment-button-group primaryColor=${this.primaryColor} buttons=${cycleModes} active=${this.activeCycleMode} @select=${this.onCycleModeChange}></segment-button-group>
    `;
  }

  private renderAreas(): Template {
    const areas = this.areas
      .map(area => {
        return {
          icon: area.icon,
          text: area.name,
          value: area.roborock_area_id.toString()
        }
      });

    const header = this.inline 
      ? html`<div class="areas-header">${localize(`common.room_selection`)}</div>`
      : nothing;

    return html`
      <div class="areas">
        ${header}
        <multiselect-button-group primaryColor=${this.primaryColor} buttons="${areas}" @select="${this.onAreasChange}"></multiselect-button-group>
      </div>
    `;
  }

  private fixModesIfNeeded() {
    if (!VacuumRobot.isSupportedSuctionMode(this.activeSuctionMode, this.activeCleaningMode))
      this.activeSuctionMode = this.activeCleaningMode == RoborockCleaningMode.Mop ? RoborockSuctionMode.Off : RoborockSuctionMode.Turbo;
    if (!VacuumRobot.isSupportedMopMode(this.activeMopMode, this.activeCleaningMode))
      this.activeMopMode = this.activeCleaningMode == RoborockCleaningMode.Vac ? RoborockMopMode.Off : RoborockMopMode.High;
    
    // Set route mode based on cleaning mode
    if (this.activeCleaningMode == RoborockCleaningMode.Mop) {
      // For Mop mode, always set Deep as default
      this.activeRouteMode = RoborockRouteMode.Deep;
    } else if (!VacuumRobot.isSupportedRouteMode(this.activeRouteMode, this.activeCleaningMode)) {
      // For other modes, only change if current route is not supported
      this.activeRouteMode = RoborockRouteMode.Standard;
    }
  }

  private isSupportedSuctionMode(mode: RoborockSuctionMode, cleaningMode: RoborockCleaningMode): boolean {
    if (mode == RoborockSuctionMode.Off)
      return false;
    return VacuumRobot.isSupportedSuctionMode(mode, cleaningMode);
  }

  private isSupportedMopMode(mode: RoborockMopMode, cleaningMode: RoborockCleaningMode): boolean {
    if (mode == RoborockMopMode.Off)
      return false;
    return VacuumRobot.isSupportedMopMode(mode, cleaningMode);
  }

  private isSupportedRouteMode(mode: RoborockRouteMode, cleaningMode: RoborockCleaningMode): boolean {
    return VacuumRobot.isSupportedRouteMode(mode, cleaningMode);
  }
}
