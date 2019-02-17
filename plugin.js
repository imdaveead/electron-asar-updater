// Post processing stolen from material-clicker
const PluginBase = require('@electron-forge/plugin-base').default;
const asar = require('asar');
const path = require('path');
const fs = require('fs-extra');

module.exports = class AsarPlugin extends PluginBase {
  constructor() {
    super();
    this.name = 'Asar Plugin';
    this.startLogic = undefined;
  }

  init() { }

  getHook(hookName) {
    if (hookName === 'packageAfterPrune') {
      return function packageAfterPrune(conf, appDir) {
        return new Promise(async (done) => {
          const json = await fs.readJSON(path.join(appDir, 'package.json'));
          await fs.writeJSON(path.join(appDir, 'package.json'), {
            name: json.name,
            description: json.description,
            version: json.version,
            main: json.main,
            license: json.license,
          });
          await Promise.all((await fs.readdir(appDir))
            .filter(item =>
              item !== 'package.json'
              && item !== 'src'
              && item !== 'node_modules')
            .map(item => {
              return fs.remove(path.join(appDir, item));
            }));
          // 1. asar the /resources/app to resources/
          asar.createPackage(appDir, path.join(appDir, '../app.asar'), async function () {
            // 2. delete the original /resources/app folder
            await fs.remove(appDir);
            done();
          });
        });
      };
    }
    return undefined;
  }
};
