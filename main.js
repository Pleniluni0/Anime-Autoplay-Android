{
  "manifest_version": 2,
  "name": "Anime AutoPlay",
  "version": "1.0.0",
  "description": "Pasa automáticamente al siguiente episodio en AnimeAV1 y AnimeFLV. Incluye salto de intro y créditos configurable.",
  "homepage_url": "https://github.com/Pleniluni0/Anime-Autoplay-Android",
  "author": "Pleniluni0",
  "permissions": [
    "storage",
    "tabs",
    "*://*.animeav1.com/*",
    "*://animeav1.com/*",
    "*://*.animeflv.net/*",
    "*://animeflv.net/*",
    "*://www4.animeflv.net/*",
    "*://www3.animeflv.net/*",
    "*://www2.animeflv.net/*",
    "*://www.animeflv.net/*",
    "*://*/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "*://*.animeav1.com/*",
        "*://animeav1.com/*",
        "*://*.animeflv.net/*",
        "*://animeflv.net/*",
        "*://www4.animeflv.net/*",
        "*://www3.animeflv.net/*",
        "*://www2.animeflv.net/*",
        "*://www.animeflv.net/*"
      ],
      "js": [
        "main.js"
      ],
      "run_at": "document_end",
      "all_frames": false
    },
    {
      "matches": [
        "*://*/*"
      ],
      "js": [
        "player.js"
      ],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  "browser_action": {
    "default_popup": "popup.html",
    "default_title": "Anime AutoPlay",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "anime-autoplay@indalmix.es",
      "strict_min_version": "120.0",
      "data_collection_permissions": {
        "required": [],
        "optional": []
      }
    },
    "gecko_android": {
      "strict_min_version": "120.0"
    }
  }
}
