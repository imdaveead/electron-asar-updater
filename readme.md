# Electron Easy ASAR Updater
Simple and fast multiplatform updating framework using ASAR archives.

## How to create a updater
### 1. Edit the src/update-meta.json and package.json
```json
{
    "name": "electron-app",
    "display-name": "Electron App",
    "update-url": "http://localhost:8080",
    "theme-color": "#4286f4"
}
```
Theme color is used for the application titlebar.

Make sure to also modify the `package.json`'s name to the same as in `update-meta.json`.

### 2. Host a update.json file somewhere with the following contents.
```json
{
    "name": "electron-app",
    "versions": {
        "latest": "1.0.0",
        "beta": "1.0.5"
    }
}
```
You can have as many versions as you want for different update tracks,
for beta builds and other stuff.

### 3. Publish App ASARs to the same folder as the package.json file
If your update json is at url `https://example.com/app/update.json`,
and the app name is `electron-app`, then you publish asar packages as
`https://example.com/app/electron-app-{version}.asar`.

### 3.5 (Optional) Place a icon to use in the titlebar
Add `./src/icon.png` as a transperent logo to use in the top left corner.

### 4. Package this app
Package the app using electron forge.
