import { LitElement, CSSResultGroup, css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import localize from './localize';
import { VacuumRobot } from './vacuum_robot';
import { getSuctionIcon, getMoppingIcon, getRouteIcon, getCycleIcon } from './resorces';
import {
  Template,
  StringEvent,
  SvgButton,
  MyHomeAssistant,
  RoborockCleaningMode,
  RoborockCleaningParameters,
  RoborockDefaultModes,
  RoborockSuctionMode,
  RoborockMopMode,
  RoborockRouteMode,
} from './types';
import { SegmentButtonGroup } from './segment-button-group';

typeof (SegmentButtonGroup);

/** Fields of a card config that the shared defaults editor reads and writes. */
export interface RoborockEditorConfig {
  entity: string;
  default_mode?: RoborockCleaningMode;
  default_modes?: RoborockDefaultModes;
  mop_intensity_entity?: string;
  mop_mode_entity?: string;
}

// Mirrors the built-in defaults from config.ts, so the editor shows the value
// the popup would actually use when a mode has no override configured yet.
const BUILTIN_DEFAULTS: Record<RoborockCleaningMode, Required<Omit<RoborockCleaningParameters, 'cycle'>> & { cycle: string }> = {
  [RoborockCleaningMode.VacAndMop]: {
    suction: RoborockSuctionMode.Turbo,
    mop: RoborockMopMode.High,
    route: RoborockRouteMode.Standard,
    cycle: '1',
  },
  [RoborockCleaningMode.Mop]: {
    suction: RoborockSuctionMode.Turbo,
    mop: RoborockMopMode.High,
    route: RoborockRouteMode.Deep,
    cycle: '1',
  },
  [RoborockCleaningMode.Vac]: {
    suction: RoborockSuctionMode.Max,
    mop: RoborockMopMode.Medium,
    route: RoborockRouteMode.Standard,
    cycle: '1',
  },
};

/**
 * Shared base for the two card editors. Owns the entity picker and the
 * per-tab defaults UI (default open tab + suction / mop / route / cycle),
 * which both `roborock-cleaning-card` and `roborock-vacuum-card` expose.
 * Subclasses implement `setConfig` and `render`.
 */
export abstract class RoborockCardEditorBase<C extends RoborockEditorConfig> extends LitElement {
  @property({ attribute: false })
  public hass?: HomeAssistant;

  @state()
  protected _config: C = { entity: '' } as C;

  @state()
  protected _editMode: RoborockCleaningMode = RoborockCleaningMode.VacAndMop;

  protected robot: VacuumRobot = new VacuumRobot();

  static get styles(): CSSResultGroup {
    return css`
      .editor {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 4px 0;
      }
      .section-title {
        font-weight: 500;
        margin-bottom: 4px;
      }
      .hint {
        color: var(--secondary-text-color);
        font-size: 0.85em;
        margin-top: -8px;
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .row-title {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 0.9em;
      }
      .row-title .value {
        color: var(--primary-color);
      }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .divider {
        height: 1px;
        background: var(--divider-color, rgba(127, 127, 127, 0.2));
      }
    `;
  }

  protected willUpdate(): void {
    if (this.hass) {
      this.robot.setHass(this.hass as MyHomeAssistant);
    }
    if (this._config?.entity) {
      this.robot.setEntity(this._config.entity);
      this.robot.setMopIntensityEntity(this._config.mop_intensity_entity);
      this.robot.setMopModeEntity(this._config.mop_mode_entity);
    }
  }

  protected setConfigInternal(config: C): void {
    this._config = { ...config };
    this._editMode = config.default_mode ?? RoborockCleaningMode.VacAndMop;
  }

  protected renderEntityPicker(): Template {
    return html`
      <ha-entity-picker
        .hass=${this.hass}
        .value=${this._config.entity}
        .label=${'Vacuum'}
        .includeDomains=${['vacuum']}
        allow-custom-entity
        @value-changed=${this.onEntityChange}>
      </ha-entity-picker>
    `;
  }

  protected renderNoEntityHint(): Template {
    return html`<div class="hint">${localize('editor.pick_entity_first')}</div>`;
  }

  protected renderDefaults(): Template {
    const cleaningModeButtons = this.cleaningModeButtons();

    return html`
      <div class="row">
        <div class="section-title">${localize('editor.default_open_tab')}</div>
        <segment-button-group
          .buttons=${cleaningModeButtons}
          active=${this._config.default_mode ?? RoborockCleaningMode.VacAndMop}
          @select=${this.onDefaultModeChange}>
        </segment-button-group>
      </div>

      <div class="divider"></div>

      <div class="row">
        <div class="section-title">${localize('editor.defaults_for_tab')}</div>
        <segment-button-group
          .buttons=${cleaningModeButtons}
          active=${this._editMode}
          @select=${this.onEditModeChange}>
        </segment-button-group>
      </div>

      ${this.renderSuctionRow()}
      ${this.renderMopRow()}
      ${this.renderRouteRow()}
      ${this.renderCycleRow()}
    `;
  }

  private renderSuctionRow(): Template {
    if (this._editMode === RoborockCleaningMode.Mop)
      return nothing;

    const buttons: SvgButton<string>[] = this.robot.getAvailableSuctionModes()
      .filter(v => v !== RoborockSuctionMode.Off && v !== RoborockSuctionMode.OffRaiseMainBrush)
      .filter(v => VacuumRobot.isSupportedSuctionMode(v, this._editMode))
      .map(v => ({ icon: getSuctionIcon(v, 24, this.iconColor()) as Template, value: v }));

    const active = this.effectiveValue('suction');
    return this.renderRow('common.suction_mode', `suction_mode.${active}`, buttons, active, this.onSuctionChange);
  }

  private renderMopRow(): Template {
    if (this._editMode === RoborockCleaningMode.Vac)
      return nothing;

    const buttons: SvgButton<string>[] = this.robot.getVisibleMopModes()
      .filter(v => v !== RoborockMopMode.Off)
      .filter(v => VacuumRobot.isSupportedMopMode(v, this._editMode))
      .map(v => ({ icon: getMoppingIcon(v, 24, this.iconColor()) as Template, value: v }));

    const active = this.effectiveValue('mop');
    return this.renderRow('common.mop_mode', `mop_mode.${active}`, buttons, active, this.onMopChange);
  }

  private renderRouteRow(): Template {
    const buttons: SvgButton<string>[] = this.robot.getAvailableRouteModes()
      .filter(v => VacuumRobot.isSupportedRouteMode(v, this._editMode))
      .map(v => ({ icon: getRouteIcon(v, 24, this.iconColor()) as Template, value: v }));

    const active = this.effectiveValue('route');
    return this.renderRow('common.route_mode', `route_mode.${active}`, buttons, active, this.onRouteChange);
  }

  private renderCycleRow(): Template {
    const buttons: SvgButton<string>[] = [
      { icon: getCycleIcon('1', 24, this.iconColor()) as Template, value: '1' },
      { icon: getCycleIcon('2', 24, this.iconColor()) as Template, value: '2' },
    ];

    const active = this.effectiveValue('cycle');
    return this.renderRow('common.cycle_mode', undefined, buttons, active, this.onCycleChange, `x${active}`);
  }

  private renderRow(
    titleKey: string,
    valueKey: string | undefined,
    buttons: SvgButton<string>[],
    active: string,
    onSelect: (e: StringEvent) => void,
    rawValue?: string,
  ): Template {
    if (!buttons.length)
      return nothing;

    const value = rawValue ?? (valueKey ? localize(valueKey) : '');
    return html`
      <div class="row">
        <div class="row-title">
          <div class="title">${localize(titleKey)}</div>
          <div class="value">${value}</div>
        </div>
        <segment-button-group .buttons=${buttons} active=${active} @select=${onSelect}></segment-button-group>
      </div>
    `;
  }

  private cleaningModeButtons(): SvgButton<string>[] {
    return [
      { text: localize('mode.vac&mop'), value: RoborockCleaningMode.VacAndMop },
      { text: localize('mode.mop'), value: RoborockCleaningMode.Mop },
      { text: localize('mode.vac'), value: RoborockCleaningMode.Vac },
    ];
  }

  private iconColor(): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-text-color')
      .trim() || '#fff';
  }

  /** Configured override for the active tab, otherwise the built-in default. */
  private effectiveValue(param: keyof RoborockCleaningParameters): string {
    const configured = this._config.default_modes?.[this._editMode]?.[param];
    if (configured !== undefined && configured !== null)
      return `${configured}`;
    return `${BUILTIN_DEFAULTS[this._editMode][param]}`;
  }

  private onEntityChange(e: CustomEvent): void {
    const value = e.detail?.value ?? '';
    this.updateConfig({ ...this._config, entity: value });
  }

  private onDefaultModeChange(e: StringEvent): void {
    this.updateConfig({ ...this._config, default_mode: e.detail as RoborockCleaningMode });
  }

  private onEditModeChange(e: StringEvent): void {
    this._editMode = e.detail as RoborockCleaningMode;
  }

  private onSuctionChange(e: StringEvent): void {
    this.setModeParam('suction', e.detail);
  }

  private onMopChange(e: StringEvent): void {
    this.setModeParam('mop', e.detail);
  }

  private onRouteChange(e: StringEvent): void {
    this.setModeParam('route', e.detail);
  }

  private onCycleChange(e: StringEvent): void {
    this.setModeParam('cycle', e.detail === '2' ? 2 : 1);
  }

  private setModeParam(param: keyof RoborockCleaningParameters, value: string | number): void {
    const default_modes: RoborockDefaultModes = { ...(this._config.default_modes ?? {}) };
    default_modes[this._editMode] = {
      ...(default_modes[this._editMode] ?? {}),
      [param]: value,
    } as RoborockCleaningParameters;
    this.updateConfig({ ...this._config, default_modes });
  }

  /** Merge a change into the config and notify Home Assistant. */
  protected updateConfig(config: C): void {
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }
}
