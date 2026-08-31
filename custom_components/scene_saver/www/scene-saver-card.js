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
    this.render();
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
            align-items: center;
            justify-content: center;
          }
          .main-btn {
            background-color: var(--primary-color, #03a9f4);
            color: var(--text-primary-color, white);
            border: none;
            border-radius: 4px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            text-transform: uppercase;
            width: 100%;
          }
          dialog {
            border: none;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 16px 24px 2px rgba(0,0,0,0.14), 0 6px 30px 5px rgba(0,0,0,0.12), 0 8px 10px -5px rgba(0,0,0,0.2);
            background: var(--card-background-color, white);
            color: var(--primary-text-color, black);
            width: 90%;
            max-width: 400px;
          }
          dialog::backdrop {
            background: rgba(0, 0, 0, 0.5);
          }
          .dialog-title {
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 16px;
          }
          .dialog-content {
            margin-bottom: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          label {
            font-size: 14px;
            color: var(--secondary-text-color, #727272);
            margin-bottom: -4px;
          }
          select, input {
            width: 100%;
            box-sizing: border-box;
            padding: 12px;
            border: 1px solid var(--divider-color, #ccc);
            border-radius: 4px;
            font-size: 16px;
            background: var(--primary-background-color, #fafafa);
            color: var(--primary-text-color, black);
          }
          .dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }
          .btn {
            background: transparent;
            color: var(--primary-color, #03a9f4);
            border: none;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            text-transform: uppercase;
            border-radius: 4px;
          }
          .btn:hover {
            background: rgba(128, 128, 128, 0.1);
          }
          .btn.primary {
            background-color: var(--primary-color, #03a9f4);
            color: var(--text-primary-color, white);
          }
          .btn.primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .message {
            color: var(--error-color, red);
            font-size: 14px;
            display: none;
            margin-top: 8px;
          }
        </style>
        <ha-card>
          <button id="open-dialog-btn" class="main-btn">Save Scene</button>
        </ha-card>
        
        <dialog id="scene-dialog">
          <div class="dialog-title">Save or Update Scene</div>
          <div class="dialog-content">
            <label for="existing-scenes">Update an existing scene:</label>
            <select id="existing-scenes">
              <option value="">-- Create New Scene --</option>
            </select>
            
            <label for="scene-name">Or enter a new scene name:</label>
            <input type="text" id="scene-name" placeholder="Scene Name" autocomplete="off" />
            
            <div class="message" id="message"></div>
          </div>
          <div class="dialog-actions">
            <button id="cancel-btn" class="btn">Cancel</button>
            <button id="save-btn" class="btn primary">Save</button>
          </div>
        </dialog>
      `;
      this.content = true;

      const openBtn = this.shadowRoot.getElementById('open-dialog-btn');
      const dialog = this.shadowRoot.getElementById('scene-dialog');
      const cancelBtn = this.shadowRoot.getElementById('cancel-btn');
      const saveBtn = this.shadowRoot.getElementById('save-btn');
      const nameInput = this.shadowRoot.getElementById('scene-name');
      const sceneSelect = this.shadowRoot.getElementById('existing-scenes');
      const msgDiv = this.shadowRoot.getElementById('message');

      // Sync select and input
      sceneSelect.addEventListener('change', () => {
        if (sceneSelect.value) {
          nameInput.value = sceneSelect.value;
          nameInput.disabled = true;
        } else {
          nameInput.value = "";
          nameInput.disabled = false;
        }
      });

      openBtn.addEventListener('click', () => {
        // Populate the select with existing scenes just before opening
        sceneSelect.innerHTML = '<option value="">-- Create New Scene --</option>';
        if (this._hass && this._hass.states) {
          const sceneStates = Object.values(this._hass.states).filter(state => state.entity_id.startsWith('scene.'));
          sceneStates.forEach(state => {
            const name = state.attributes.friendly_name || state.entity_id.replace('scene.', '');
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            sceneSelect.appendChild(option);
          });
        }
        
        nameInput.value = "";
        nameInput.disabled = false;
        msgDiv.style.display = "none";
        dialog.showModal();
      });

      cancelBtn.addEventListener('click', () => {
        dialog.close();
      });

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

        // Check if scene exists for overwrite flag
        let overwrite = false;
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
          dialog.close();
          // Short delay before alert so modal closes smoothly
          setTimeout(() => alert(`Scene '${name}' saved successfully!`), 100);
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
