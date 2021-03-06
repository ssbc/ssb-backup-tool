const fs = require('fs')
const Path = require('path')
const electron = require('electron')
const Client = require('ssb-client')
const ssbKeys = require('ssb-keys')
const Config = require("ssb-config/inject")
const appName = process.env.ssb_appname || "ssb"
const config = Config(appName)

// pull config options out of depject

const createSbot = require('ssb-server')
	.use(require('ssb-logging'))
	.use(require('ssb-master'))
	.use(require('ssb-no-auth'))
	.use(require('ssb-unix-socket'))
	// who and how to peer
	.use(require('ssb-conn'))
	.use(require('ssb-lan'))
	.use(require('ssb-replicate'))
	.use(require('ssb-friends'))
	.use(require('ssb-blobs'))
	.use(require('ssb-backlinks'))

	// needed by device device-addrs
	.use(require('ssb-query'))
	.use(require('ssb-about'))

	// view index stuff
	.use(require('ssb-ebt'))
	.use(require('ssb-ooo'))


	// ws
	.use(require('ssb-ws'))


const manifestPath = Path.join(Path.join(config.path), 'manifest.json')
const isNewInstall = !fs.existsSync(manifestPath)

const url = location.hash.slice(1)

if (isNewInstall) {
	startSbot()
} else {
	// see if we can connect to an existing sbot on this config
	Client(config.keys, config, (err, server) => {
		// err implies no, we should start an sbot
		if (err) startSbot()
		else {
			// there's already and sbot running and we've connected to it
			console.log('> sbot running elsewhere. You are', server.id)
			server.close() // close this client connection (app starts one of its own)
			electron.ipcRenderer.send('server-started', config, url)
		}
	})
}

function startSbot() {
	console.log('> starting sbot')
	const sbot = createSbot(config)
	window.sbot = sbot
	console.log("you are", sbot.id)

	console.log('  > updating updating manifest.json');
	const manifest = sbot.getManifest();
	fs.writeFileSync(manifestPath, JSON.stringify(manifest))
	electron.ipcRenderer.send('server-started', config, url)
}
