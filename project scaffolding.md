PalletDew/
  index.html              # markup + UI chrome only
  package.json
  vite.config.js
  plan.md
  src/
    main.js               # boot: load save / new game / animate loop
    style.css             # move styles out of <style>
    core/
      noise.js            # mulberry32, hash2, noise2D, fbm, smoothstep
      registry.js         # Registry class
      constants.js        # TILE, RADIUS, seasons, SAVE_KEY, etc.
      state.js            # GameState, currentSeason, log
      save.js             # saveGame, loadSaveData, applySave hooks
    engine/
      renderer.js         # scene, camera, renderer, lights
      sky.js              # sky dome, stars, updateSky
      weather.js          # precip, WeatherFX, pickWeather
      input.js            # keys, click/raycast helpers
      loop.js             # clock + animate orchestration (optional)
    world/
      terrain.js          # height, biome, buildTerrain, repaintSeason
      water.js            # water plane + shader
      decor.js            # instanced trees/grass/rocks
      generate.js         # generateWorld, resources
      farm.js             # farmTiles, flower beds, dirt meshes
    entities/
      WorldEntity.js
      PlacedObject.js
      Crop.js
      player.js           # mesh, movement, collision-ish bounds
    content/
      items.js            # defineItem calls
      crops.js
      objects.js          # trees, rocks, chests, etc.
      actions.js          # hoe/water/plant/chop/mine
      recipes.js
    systems/
      inventory.js        # addItem, consume, hotbar selection
      crafting.js         # craft panel logic
      time.js             # day advance, sleep, updateTime
      tools.js            # useToolOnFarmTile, harvest
    ui/
      hud.js              # updateUI, energy/gold/day
      minimap.js
      craftPanel.js
      hotbar.js