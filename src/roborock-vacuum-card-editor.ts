import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import localize from './localize';
import { Template, RoborockVacuumCardConfig } from './types';
import { RoborockCardEditorBase } from './roborock-card-editor-base';

@customElement('roborock-vacuum-card-editor')
export class RoborockVacuumCardEditor extends RoborockCardEditorBase<RoborockVacuumCardConfig> {
  setConfig(config: RoborockVacuumCardConfig): void {
    this.setConfigInternal(config);
  }

  protected render(): Template {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="editor">
        ${this.renderEntityPicker()}
        ${this._config.entity ? this.renderCardOptions() : this.renderNoEntityHint()}
      </div>
    `;
  }

  private renderCardOptions(): Template {
    return html`
      <div class="divider"></div>

      <div class="toggle-row">
        <ha-switch
          .checked=${this._config.show_roborock_icon ?? false}
          @change=${this.onShowIconChange}>
        </ha-switch>
        <span>${localize('editor.show_roborock_icon')}</span>
      </div>

      <div class="toggle-row">
        <ha-switch
          .checked=${this._config.show_custom_cleaning_inline ?? false}
          @change=${this.onShowInlineChange}>
        </ha-switch>
        <span>${localize('editor.show_inline_panel')}</span>
      </div>

      <div class="divider"></div>

      ${this.renderDefaults()}
    `;
  }

  private onShowIconChange(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.updateConfig({ ...this._config, show_roborock_icon: checked });
  }

  private onShowInlineChange(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.updateConfig({ ...this._config, show_custom_cleaning_inline: checked });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'roborock-vacuum-card-editor': RoborockVacuumCardEditor;
  }
}
