class SceneSaverCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._selector) {
      this._selector.hass = hass;
    }
  }

  render() {
    if (!this._config || !this._hass) {
      return;
    }

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      
      this.shadowRoot.innerHTML = `
        <style>
          .header {
            font-weight: bold;
            margin-bottom: 8px;
            margin-top: 16px;
          }
          .row-setting {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
          }
        </style>
        <div class="card-config">
          <div class="header">Select Area to Save Scenes From:</div>
          <div id="selector-container"></div>
          
          <div class="row-setting">
            <input type="checkbox" id="assign-checkbox" />
            <label for="assign-checkbox">Assign new scenes to this area automatically</label>
          </div>
        </div>
      `;

      this._selector = document.createElement("ha-selector");
      this._selector.selector = { area: {} };
      this._selector.hass = this._hass;
      
      this._selector.addEventListener("value-changed", (ev) => {
        if (this._config.area_id !== ev.detail.value) {
          const newConfig = {
            ...this._config,
            area_id: ev.detail.value,
          };
          
          this.dispatchEvent(
            new CustomEvent("config-changed", {
              detail: { config: newConfig },
              bubbles: true,
              composed: true,
            })
          );
        }
      });

      this.shadowRoot.getElementById("selector-container").appendChild(this._selector);
      
      const assignCheckbox = this.shadowRoot.getElementById("assign-checkbox");
      assignCheckbox.addEventListener("change", (ev) => {
        const newConfig = {
          ...this._config,
          assign_to_area: ev.target.checked,
        };
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { config: newConfig },
            bubbles: true,
            composed: true,
          })
        );
      });
    }
    
    if (this._selector) {
      this._selector.value = this._config.area_id;
    }
    
    const assignCheckbox = this.shadowRoot.getElementById("assign-checkbox");
    if (assignCheckbox) {
      // Default to true if not explicitly set to false
      assignCheckbox.checked = this._config.assign_to_area !== false;
    }
  }
}

customElements.define("scene-saver-card-editor", SceneSaverCardEditor);


class SceneSaverCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // Define the visual editor for Lovelace
  static getConfigElement() {
    return document.createElement("scene-saver-card-editor");
  }

  // Generate a stub config if none exists
  static getStubConfig() {
    return { area_id: "", assign_to_area: true };
  }

  setConfig(config) {
    if (!config.area_id) {
      console.warn("Scene Saver Card: area_id is not defined");
    }
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  getCardSize() {
    return 2;
  }

  render() {
    if (!this.content) {
      this.shadowRoot.innerHTML = `
        <style>
          ha-card {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .title {
            font-size: var(--paper-font-headline_-_font-size);
            font-weight: var(--paper-font-headline_-_font-weight);
            letter-spacing: var(--paper-font-headline_-_letter-spacing);
            line-height: var(--paper-font-headline_-_line-height);
            color: var(--ha-card-header-color, --primary-text-color);
          }
          .row {
            display: flex;
            gap: 8px;
            align-items: stretch;
          }
          input {
            flex-grow: 1;
            padding: 8px 12px;
            border: 1px solid var(--divider-color, #ccc);
            border-radius: 4px;
            font-size: 16px;
            background: var(--card-background-color, white);
            color: var(--primary-text-color, black);
          }
          button {
            background-color: var(--primary-color, #03a9f4);
            color: var(--text-primary-color, white);
            border: none;
            border-radius: 4px;
            padding: 0 16px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            text-transform: uppercase;
          }
          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .message {
            color: var(--error-color, red);
            font-size: 12px;
            display: none;
          }
        </style>
        <ha-card>
          <div class="title">Save Current Scene</div>
          <div class="row">
            <input type="text" id="scene-name" placeholder="Scene Name" required />
            <button id="save-btn">Save</button>
          </div>
          <div class="message" id="message"></div>
        </ha-card>
      `;
      this.content = true;

      const saveBtn = this.shadowRoot.getElementById('save-btn');
      const nameInput = this.shadowRoot.getElementById('scene-name');
      const msgDiv = this.shadowRoot.getElementById('message');

      saveBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        msgDiv.style.display = 'none';

        if (!name) {
          msgDiv.textContent = "Please enter a scene name.";
          msgDiv.style.display = 'block';
          return;
        }

        if (!this.config.area_id) {
          msgDiv.textContent = "Please configure an Area in the card editor first.";
          msgDiv.style.display = 'block';
          return;
        }

        // Check if scene exists
        let overwrite = false;
        // slugify name the way HA does (roughly)
        const sceneId = "scene." + name.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
        if (this._hass.states[sceneId]) {
          const confirmOverwrite = confirm(`A scene named '${name}' already exists. Do you want to overwrite it?`);
          if (!confirmOverwrite) {
            return;
          }
          overwrite = true;
        }

        // Call the service
        saveBtn.disabled = true;
        try {
          await this._hass.callService("scene_saver", "save_persistent_scene", {
            name: name,
            area_id: this.config.area_id,
            overwrite: overwrite,
            assign_to_area: this.config.assign_to_area !== false
          });
          nameInput.value = "";
          alert(`Scene '${name}' saved successfully!`);
        } catch (e) {
          msgDiv.textContent = "Error saving scene: " + e.message;
          msgDiv.style.display = 'block';
        } finally {
          saveBtn.disabled = false;
        }
      });
    }
  }
}

customElements.define('scene-saver-card', SceneSaverCard);

// Make the custom card discoverable in the Lovelace picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "scene-saver-card",
  name: "Scene Saver",
  description: "A card to save current lights into a persistent scene.",
  preview: true,
});
