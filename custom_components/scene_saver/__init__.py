"""The Scene Saver integration."""
import logging
import os
import yaml
import uuid

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er
import homeassistant.helpers.config_validation as cv
import voluptuous as vol

_LOGGER = logging.getLogger(__name__)

DOMAIN = "scene_saver"

SERVICE_SAVE_SCENE = "save_persistent_scene"
SCHEMA_SAVE_SCENE = vol.Schema({
    vol.Required("name"): cv.string,
    vol.Required("area_id"): cv.string,
    vol.Optional("overwrite", default=False): cv.boolean,
    vol.Optional("assign_to_area", default=True): cv.boolean,
})

async def _async_setup_common(hass: HomeAssistant):
    """Common setup logic for static paths and services."""
    if DOMAIN in hass.data and hass.data[DOMAIN].get("initialized"):
        return

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["initialized"] = True

    # Register static path for frontend Lovelace card
    js_path = hass.config.path("custom_components/scene_saver/www/scene-saver-card.js")
    www_dir = hass.config.path("custom_components/scene_saver/www")

    try:
        if hasattr(hass.http, "async_register_static_paths"):
            from homeassistant.components.http import StaticPathConfig
            await hass.http.async_register_static_paths([
                StaticPathConfig(
                    "/scene_saver",
                    www_dir,
                    cache_headers=False,
                )
            ])
        else:
            hass.http.register_static_path("/scene_saver", www_dir, cache_headers=False)
    except Exception as e:
        _LOGGER.warning(f"Could not register static path (might already be registered): {e}")

    # Automatically load the Lovelace card JS in the frontend globally
    try:
        from homeassistant.components.frontend import add_extra_js_url
        add_extra_js_url(hass, "/scene_saver/scene-saver-card.js")
    except Exception as e:
        _LOGGER.warning(f"Could not automatically register extra JS url: {e}")

    # Register in Lovelace resources registry so it appears in dashboards without manual addition
    async def register_lovelace_resource(event=None):
        try:
            if "lovelace" in hass.data:
                lovelace_data = hass.data["lovelace"]
                resources = getattr(lovelace_data, "resources", None) if hasattr(lovelace_data, "resources") else lovelace_data.get("resources", None) if isinstance(lovelace_data, dict) else None
                if resources:
                    if not resources.loaded:
                        await resources.async_load()
                    url = "/scene_saver/scene-saver-card.js"
                    # Check if already registered
                    if not any(res.url == url for res in resources.async_items()):
                        await resources.async_create_item({"res_type": "module", "url": url})
                        _LOGGER.info("Successfully added scene-saver-card to Lovelace resources")
        except Exception as e:
            _LOGGER.warning(f"Could not automatically add to Lovelace resources: {e}")

    # Delay the lovelace registration slightly to ensure Lovelace component is fully loaded
    hass.bus.async_listen_once("homeassistant_started", register_lovelace_resource)

    async def handle_save_scene(call: ServiceCall):
        """Handle the service call to save a persistent scene."""
        name = call.data.get("name")
        area_id = call.data.get("area_id")
        overwrite = call.data.get("overwrite")
        
        # 1. Resolve area to light entities
        device_reg = dr.async_get(hass)
        entity_reg = er.async_get(hass)
        
        devices = dr.async_entries_for_area(device_reg, area_id)
        device_ids = {device.id for device in devices}
        
        light_entity_ids = set()
        
        # Entities explicitly in the area
        for entity in er.async_entries_for_area(entity_reg, area_id):
            if entity.domain == "light":
                light_entity_ids.add(entity.entity_id)
                
        # Entities whose device is in the area
        for entity in entity_reg.entities.values():
            if entity.device_id in device_ids and entity.domain == "light":
                light_entity_ids.add(entity.entity_id)
                
        if not light_entity_ids:
            _LOGGER.warning(f"No lights found in area '{area_id}'")
            return

        # 2. Capture states
        entities_state = {}
        for entity_id in light_entity_ids:
            state_obj = hass.states.get(entity_id)
            if not state_obj:
                continue
            
            s_data = {"state": state_obj.state}
            
            if state_obj.state == "on":
                for attr in ["brightness", "color_temp", "color_temp_kelvin", "xy_color", "rgb_color", "hs_color", "rgbw_color", "rgbww_color"]:
                    if attr in state_obj.attributes and state_obj.attributes[attr] is not None:
                        s_data[attr] = list(state_obj.attributes[attr]) if isinstance(state_obj.attributes[attr], tuple) else state_obj.attributes[attr]
            
            entities_state[entity_id] = s_data

        # 3. Create Scene data
        scene_id = str(uuid.uuid4()).replace("-", "")
        new_scene = {
            "id": scene_id,
            "name": name,
            "entities": entities_state,
            "icon": "mdi:palette"
        }

        # 4. Write to scenes.yaml
        scenes_file = hass.config.path("scenes.yaml")
        scenes_data = []
        
        if await hass.async_add_executor_job(os.path.exists, scenes_file):
            try:
                def read_scenes():
                    with open(scenes_file, "r", encoding="utf8") as f:
                        return yaml.safe_load(f) or []
                scenes_data = await hass.async_add_executor_job(read_scenes)
                if not isinstance(scenes_data, list):
                    scenes_data = [scenes_data]
            except Exception as e:
                _LOGGER.error(f"Error reading scenes.yaml: {e}")
                scenes_data = []
        
        # Check if scene exists
        existing_index = -1
        for i, s in enumerate(scenes_data):
            if isinstance(s, dict) and s.get("name") == name:
                existing_index = i
                break
                
        if existing_index >= 0:
            if overwrite:
                new_scene["id"] = scenes_data[existing_index].get("id", scene_id)
                scenes_data[existing_index] = new_scene
            else:
                _LOGGER.warning(f"Scene '{name}' already exists and overwrite is False.")
                return
        else:
            scenes_data.append(new_scene)
            
        try:
            def write_scenes():
                with open(scenes_file, "w", encoding="utf8") as f:
                    yaml.safe_dump(scenes_data, f, default_flow_style=False, allow_unicode=True)
            await hass.async_add_executor_job(write_scenes)
        except Exception as e:
            _LOGGER.error(f"Error writing to scenes.yaml: {e}")
            return
            
        # 5. Reload scenes in HA
        await hass.services.async_call("scene", "reload")
        
        assign_to_area = call.data.get("assign_to_area")
        if assign_to_area:
            import asyncio
            from homeassistant.util import slugify
            
            # Wait briefly for the reload to register the new scene entity
            await asyncio.sleep(1.5)
            
            # HA uses slugify to determine the entity ID from the scene name
            entity_id = f"scene.{slugify(name)}"
            entity_entry = entity_reg.async_get(entity_id)
            if entity_entry:
                entity_reg.async_update_entity(entity_id, area_id=area_id)
                _LOGGER.info(f"Assigned scene '{entity_id}' to area '{area_id}'")
            else:
                _LOGGER.warning(f"Could not find '{entity_id}' in entity registry to assign area")

        _LOGGER.info(f"Successfully saved persistent scene '{name}' for area '{area_id}'")

    hass.services.async_register(
        DOMAIN, SERVICE_SAVE_SCENE, handle_save_scene, schema=SCHEMA_SAVE_SCENE
    )

async def async_setup(hass: HomeAssistant, config: dict):
    """Set up the Scene Saver component from configuration.yaml."""
    _LOGGER.info("Setting up Scene Saver via async_setup")
    await _async_setup_common(hass)
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Set up Scene Saver from a config entry."""
    _LOGGER.info("Setting up Scene Saver via async_setup_entry")
    await _async_setup_common(hass)
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Unload a config entry."""
    return True
