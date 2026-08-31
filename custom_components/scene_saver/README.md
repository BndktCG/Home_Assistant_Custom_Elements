# Scene Saver for Home Assistant

**Scene Saver** is a powerful Home Assistant integration and custom Lovelace card that allows you to easily capture the current state of your lights in any room and save them into a permanent Home Assistant scene with a single click.

---

## ✨ Features

- **📍 Area-Aware Auto-Detection**: Select an area (e.g. `Living Room`, `Bedroom`, `Kitchen`), and Scene Saver automatically identifies all light entities belonging to that room.
- **💾 True Persistence Across Reboots**: Unlike standard dynamic scenes, scenes created by Scene Saver are written directly to `scenes.yaml` so they remain available after restarting Home Assistant.
- **🏷️ Automatic Area Assignment**: Newly saved scenes are automatically assigned to the chosen area in Home Assistant's Entity Registry.
- **🎨 Sleek Lovelace Modal Card**: A clean, single-button card (`Save Scene`) that pops up a modal dialog allowing you to:
  - Select an existing scene from a dropdown to update it.
  - Or type a brand new scene name.
  - Safeguard against accidental overwrites with built-in confirmation prompts.
- **⚡ Zero-Config Lovelace Setup**: The frontend card resource (`/scene_saver/scene-saver-card.js`) is automatically registered upon startup. No manual resource configuration needed!
- **🤖 Service Support**: Exposes the `scene_saver.save_persistent_scene` service for easy use in automations, scripts, or dashboards.

---

## 📥 Installation

### Method 1: HACS (Recommended)
1. In Home Assistant, open **HACS** > **Integrations**.
2. Add this repository as a custom repository if not in the default store.
3. Search for **Scene Saver** and click **Download**.
4. Restart Home Assistant.
5. *(Optional/Fallback)* If the card is not found when adding cards, add the dashboard resource under **Settings** > **Dashboards** > **⋮ (three dots top right)** > **Resources**:
   - **URL:** `/scene_saver/scene-saver-card.js`
   - **Resource type:** `JavaScript Module`

### Method 2: Manual
1. Copy the `custom_components/scene_saver` folder to your Home Assistant `<config>/custom_components/` directory.
2. Restart Home Assistant.
3. Register the Lovelace resource under **Settings** > **Dashboards** > **⋮** > **Resources**:
   - **URL:** `/scene_saver/scene-saver-card.js`
   - **Resource type:** `JavaScript Module`

---

## ⚙️ Configuration

### 1. Integration Setup
Add Scene Saver via your UI or YAML:
- **UI**: Go to **Settings** > **Devices & Services** > **Add Integration** > Search for **Scene Saver**.
- **YAML**: Alternatively, add the following to your `configuration.yaml`:
  ```yaml
  scene_saver:
  ```

---

## 🎴 Dashboard (Lovelace) Card

### Visual Editor
1. Edit any Lovelace dashboard and click **Add Card**.
2. Search for **Scene Saver**.
3. Pick the **Area** you want this card to manage.
4. (Optional) Toggle whether new scenes should automatically be assigned to this area (enabled by default).
5. Click **Save**.

### YAML Configuration Example
```yaml
type: custom:scene-saver-card
area_id: living_room
assign_to_area: true
```

---

## 🛠️ Service Reference

Scene Saver exposes a service that you can use in custom automations or scripts:

### `scene_saver.save_persistent_scene`

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | **Yes** | — | Name of the scene to save or update. |
| `area_id` | string | **Yes** | — | Target Area identifier containing the lights. |
| `overwrite` | boolean | No | `false` | Set to `true` to allow overwriting an existing scene. |
| `assign_to_area` | boolean | No | `true` | Automatically assign the scene entity to the area in HA. |

#### Service Call Example:
```yaml
service: scene_saver.save_persistent_scene
data:
  name: "Dinner Mood"
  area_id: "dining_room"
  overwrite: true
  assign_to_area: true
```

---

## 💡 How It Works Under the Hood

1. **Light Resolution**: Scans the Home Assistant Device and Entity Registries for all `light` domain entities located in the specified `area_id`.
2. **State & Color Capture**: Extracts `state` (on/off), `brightness`, and color properties (`rgb_color`, `xy_color`, `hs_color`, `color_temp_kelvin`, etc.).
3. **YAML Serialization**: Writes the scene payload to `scenes.yaml` in non-blocking worker threads.
4. **Instant Reload**: Triggers `scene.reload` and registers the entity in the Entity Registry so the scene is immediately available without a reboot.
