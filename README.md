# Home Assistant Custom Elements & Integrations

A collection of custom integrations and Lovelace UI elements designed to expand and enhance the Home Assistant smart home experience.

---

## 📦 Contained Integrations & Add-ons

### 1. [Scene Saver](custom_components/scene_saver)
> **One-click persistent scene capture and management for any room or area.**

* **Domain:** `scene_saver`
* **Type:** Integration + Lovelace Custom Card
* **Key Capabilities:**
  * Dynamically scans any configured Area/Room for all light entities (brightness, color, power state).
  * Saves or updates scenes directly into `scenes.yaml` for permanent persistence across restarts.
  * Automatically assigns generated scenes to their corresponding Area in the Home Assistant Entity Registry.
  * Includes a sleek Lovelace card with a single "Save Scene" button that launches a smart scene selection modal.
  * Auto-registers frontend resources on startup — zero manual resource URL setup required!

👉 **[Read full Scene Saver documentation & configuration guide](custom_components/scene_saver/README.md)**

---

## 🚀 Installation

### Option 1: Via HACS (Home Assistant Community Store)
1. Open **HACS** in your Home Assistant instance.
2. Click the top-right menu (3 dots) and select **Custom repositories**.
3. Paste the repository URL: `https://github.com/BndktCG/Home_Assistant_Custom_Elements`
4. Set the Category to **Integration**.
5. Find **Scene Saver** and click **Download**.
6. Restart Home Assistant.
7. *(If the card is not detected automatically)* Go to **Settings** > **Dashboards** > **⋮ (three dots top right)** > **Resources** > **Add Resource**:
   - **URL:** `/scene_saver/scene-saver-card.js`
   - **Resource type:** `JavaScript-Modul` (JavaScript Module)

### Option 2: Manual Installation
1. Copy the desired integration folder from `custom_components/` (e.g. `custom_components/scene_saver/`) into your Home Assistant `<config>/custom_components/` directory.
2. Restart Home Assistant.
3. Add the Lovelace resource under **Settings** > **Dashboards** > **⋮** > **Resources**:
   - **URL:** `/scene_saver/scene-saver-card.js`
   - **Resource type:** `JavaScript-Modul`

---

## 🛠️ Local Development & Testing

This repository includes a local Docker Compose setup for fast testing against a containerized Home Assistant instance:

```bash
# Start local Home Assistant container
docker compose up -d

# Restart to reload custom components
docker compose restart homeassistant

# View live logs
docker compose logs -f homeassistant
```

Access the local web interface at `http://localhost:8123`.
