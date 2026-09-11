import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Template, RoborockCleaningCardConfig } from './types';
import { RoborockCardEditorBase } from './roborock-card-editor-base';

@customElement('roborock-cleaning-card-editor')
export class RoborockCleaningCardEditor extends RoborockCardEditorBase<RoborockCleaningCardConfig> {
  setConfig(config: RoborockCleaningCardConfig): void {
    this.setConfigInternal(config);
  }

  protected render(): Template {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="editor">
        ${this.renderEntityPicker()}
        <div class="divider"></div>
        ${this._config.entity ? this.renderDefaults() : this.renderNoEntityHint()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'roborock-cleaning-card-editor': RoborockCleaningCardEditor;
  }
}
