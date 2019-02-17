const updateMeta = require('./update-meta.json');
const { Titlebar, Color } = require('custom-electron-titlebar');
const { ipcRenderer } = require('electron');
const { fs } = require('fs');

// Titlebar
const titlebar = new Titlebar({
  backgroundColor: Color.fromHex(updateMeta['theme-color']),
  icon: fs.existsSync(__dirname + '/icon.png') ? __dirname + '/icon.png' : null,
  menu: null,
});

titlebar.updateTitle(updateMeta['display-name']);
titlebar.title.style.position = 'absolute';
titlebar.title.style.width = '100%';
titlebar.title.style.textAlign = 'center';
titlebar.title.style.webkitAppRegion = 'no-drag';
titlebar.title.style.pointerEvents = 'none';

const spacer = document.createElement('div');
spacer.style.flex = '1';
spacer.style.webkitAppRegion = 'drag';
spacer.style.height = '100%';
titlebar.titlebar.insertBefore(spacer, titlebar.title.nextSibling);

// Templating
ipcRenderer.on('data', (sender, data) => {
  document.querySelector('#error-state').style.display = 'none';
  document.querySelector('#install-state').style.display = 'none';
  if (data.updateFailed) {
    document.querySelector('#error-state').style.display = 'flex';
    document.querySelector('#error-message').innerText = data.updateFailed;
    document.querySelector('#error-code').innerText = data.errorCode;
  } else {
    document.querySelector('#install-state').style.display = 'flex';
    document.querySelector('#install-type').innerText = data.updateType === 'install'
      ? 'Installing'
      : 'Updating';
    document.querySelector('#install-name').innerText = updateMeta['display-name'];
  }
});
ipcRenderer.send('ready');
