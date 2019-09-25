'use strict';
const path = require('path')
const {app, BrowserWindow, Menu, shell, ipcMain} = require('electron')
/// const {autoUpdater} = require('electron-updater')
const {is} = require('electron-util')
const unhandled = require('electron-unhandled')
const debug = require('electron-debug')
const contextMenu = require('electron-context-menu')
const menu = require('./menu')
const appName = process.env.SSB_APPNAME || 'ssb'
const os = require('os')
const fs = require('fs')
const CONFIG_FOLDER = path.join(os.homedir(), `.${appName}`)


unhandled();
debug();
contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId('nz.scuttlebutt.ssb-backup-tool')

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

// Prevent window from being garbage collected
let windows = {};


const createBackgroundWindow = async () => {
	if (!windows.background) {
		const bgWin = new BrowserWindow({
			title: "SSB Backup tool server",
			show: false,
			width: 150,
			height: 150,
			webPreferences: { nodeIntegration: true }

		});

		await bgWin.loadFile(path.join(__dirname, 'background.html'))

		return bgWin
	}
}

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: "SSB Backup Tool",
		show: false,
		width: 600,
		height: 400,
		webPreferences: { nodeIntegration: true }
	});

	win.on('ready-to-show', () => {
		win.show()
		win.closeDevTools()
	});

	win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		windows.main = undefined
		app.quit()
	});

	await win.loadFile(path.join(__dirname, 'index.html'))

	return win
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	if (windows.main) {
		if (windows.main.isMinimized()) {
			windows.main.restore()
		}

		windows.main.show()
	}
});

app.on('window-all-closed', () => {
	if (!is.macos) {
		app.quit()
	}
});


(async () => {
	await app.whenReady()
	Menu.setApplicationMenu(menu)
	windows.main = await createMainWindow()

	if (!fs.existsSync(path.join(CONFIG_FOLDER, 'secret'))) {
		console.log('SSB not installed, run restore?')
	} else {
		console.log("creating server")
		windows.background = await createBackgroundWindow();
	}

	ipcMain.once('server-started', async (ev, config) => {
		console.log("server started!", config)
	})
})();
