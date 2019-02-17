/** eslint-disable max-len */
const { app, BrowserWindow, ipcMain } = require('electron');
const request = require('request');
const fs = require('fs-extra');
const semver = require('semver');
const path = require('path');
const updateMeta = require('./update-meta.json');

app.commandLine.appendSwitch('force-color-profile', 'srgb');

const appData = app.getPath('userData');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let errorCode = null;
let updateFailed;
let updateTo;
let updateType;
let track = 'latest';

const appQuitHandler = () => {
  app.quit();
};

const resolveUpdate = new Promise((done) => {
  request(updateMeta['update-url'] + '/update.json', async(err, resp, body) => {
    try {
      try {
        const config = await fs.readJSON(path.join(appData, 'update-config.json'));
        if (config.updateTrack) {
          track = config.updateTrack;
        }
      } catch (error) {
        // That's fine if this file cannot be loaded.
      }
      if (err) {
        if (await fs.exists(path.join(appData, 'app.asar'))) {
          // Case A: When downloaded app is avaliable and http fails
          updateTo = null;
          errorCode = 'A';
          updateFailed = null;
          return done();
        } else {
          // Case B: when downloaded app is not avaliable and http fails
          // fail installation.
          updateFailed = 'Cannot reach update server. Check your'
            + 'internet connection and try again.';
          updateTo = null;
          errorCode = 'B';
          return done();
        }
      }
      let updates;
      try {
        updates = JSON.parse(body);
      } catch (error) {
        // Case C: when update.json is unparsable
        updateTo = null;
        errorCode = 'C';
        updateFailed = 'Update server is configured incorrectly or is down.';
        return done();
      }
      if (updates.name !== updateMeta.name) {
        // Case D: when name doesnt match
        updateTo = null;
        errorCode = 'D';
        updateFailed = 'Update server is configured incorrectly or is down.';
        return done();
      }
      if (typeof updates.versions !== 'object' || Array.isArray(updates.versions)) {
        // Case E: when versions is not an object
        updateTo = null;
        errorCode = 'E';
        updateFailed = 'Update server is configured incorrectly or is down.';
        return done();
      }
      if (!updates.versions[track] && !updates.versions.latest) {
        // Case F: when the track doesnt exist
        updateTo = null;
        errorCode = 'F';
        updateFailed = 'Update server is configured incorrectly or is down.';
        return done();
      }
      if (!updates.versions[track]) {
        track = 'latest';
      }
      let latestUpdate = updates.versions[track];
      if (typeof latestUpdate !== 'string') {
        // Case G: when the latest version is not a string.
        updateTo = null;
        errorCode = 'G';
        updateFailed = 'Update server is configured incorrectly or is down.';
        return done();
      }
      latestUpdate = semver.valid(latestUpdate);
      if (!latestUpdate) {
        // Case H: when the latest version is not a valid semver.
        updateTo = null;
        errorCode = 'H';
        updateFailed = 'Update server is configured incorrectly or is down.';
        return done();
      }
      // Decide if to update.
      if (await fs.exists(path.join(appData, 'app.asar'))) {
        // Are we behind or equal
        if (await fs.exists(path.join(appData, 'app.asar', 'package.json'))) {
          try {
            const currentAsarPackageJSON = await fs.readJSON(
              path.join(appData, 'app.asar', 'package.json')
            );
            let currentVersion = currentAsarPackageJSON.version;
            if (typeof currentVersion !== 'string') {
              // Case K: Invalid package.json version type.
              updateType = 'update';
              updateTo = latestUpdate;
              errorCode = 'K';
              return done();
            }
            currentVersion = semver.valid(currentVersion);
            if (!currentVersion) {
              // Case L: version is not semver, developer fault.
              updateType = 'update';
              updateTo = latestUpdate;
              errorCode = 'L';
              return done();
            }
            if (semver.gt(latestUpdate, currentVersion)) {
              // Case M: version is not semver, developer fault.
              updateType = 'update';
              updateTo = latestUpdate;
              errorCode = 'M';
              return done();
            } else {
              // Case N: latest version is not newer, no update
              errorCode = 'N';
              updateTo = null;
              return done();
            }
          } catch (error) {
            // Case J: Cannot read asar's package.json.
            updateType = 'install';
            updateTo = latestUpdate;
            errorCode = 'J';
            return done();
          }
        }
      } else {
        // Case I: Installing first update
        updateType = 'install';
        updateTo = latestUpdate;
        errorCode = 'I';
        return done();
      }
    } catch (error) {
      // Case Z: Unknown Error, probably due to a file issue
      updateFailed = 'Unknown Error, try restarting.';
      updateTo = null;
      errorCode = 'Z';
      return done();
    }
  });
});

const appReady = new Promise((done) => {
  app.once('ready', done);
});

Promise.all([resolveUpdate, appReady]).then(async() => {
  app.setAppPath = () => path.join(appData, 'app.asar');

  if(updateFailed || updateTo) {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'Installing DisplayName',
      frame: false,
    });

    mainWindow.loadURL(`file://${__dirname}/index.html`);

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    ipcMain.on('ready', () => {
      mainWindow.webContents.send('data', {
        errorCode,
        updateFailed,
        updateTo,
        updateType,
      });
    });

    await new Promise(a => setTimeout(a, 1500));

    if(updateTo) {
      try {
        const req = request.get(`${updateMeta['update-url']}/${updateMeta.name}-${updateTo}.asar`);
        req.on('error', (err) => {
          mainWindow.webContents.send('data', {
            // Case O: Download throws error.
            errorCode: 'O',
            updateFailed: 'Error Downloading Update.',
            updateTo: null,
            updateType: null,
          });
          console.error(err); //eslint-disable-line no-console
        });
        const pathWrite = path.join(
          app.getPath('temp'), updateMeta.name + '-' + updateTo + '.update'
        );
        const write = fs.createWriteStream(pathWrite);
        write.on('error', (err) => {
          mainWindow.webContents.send('data', {
            // Case Q: Download throws error.
            errorCode: 'Q',
            updateFailed: 'Error Downloading Update.',
            updateTo: null,
            updateType: null,
          });
          console.error(err); //eslint-disable-line no-console
        });
        req.pipe(write);
        req.on('end', async() => {
          // Overwrite the current archive.
          await fs.move(
            pathWrite,
            path.join(appData, 'app.asar')
          );

          app.off('window-all-closed', appQuitHandler);
          mainWindow.close();
          require(path.join(appData, 'app.asar'));
        });
      } catch (error) {
        mainWindow.webContents.send('data', {
          // Case P: Something else throws error I guess.
          errorCode: 'P',
          updateFailed: 'Error Downloading Update.',
          updateTo: null,
          updateType: null,
        });
      }
    }
  } else {
    app.off('window-all-closed', appQuitHandler);
    require(path.join(appData, 'app.asar'));
    app.emit('ready');
  }
});

app.on('window-all-closed', appQuitHandler);
