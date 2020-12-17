/**
 * Restore
 *
 * This file contains all the logic needed for restoring an SSB identity.
 *
 * The restore workflow is composed of multiple phases. Each phase is a
 * [MithrilJS](https://mithril.js.org) component and routing is used to
 * move between phases.
 *
 * There is a tricky problem in restore which is that we can't load the certain modules
 * because they cause a side-effect of creating the "secret" file if there isn't one
 * present which is unfortunate. So, the moment to load those modules is after placing
 * the files from the backup. We can't let the modules place the "secret" file and then
 * try to replace them because they'd be in use by the app and the replacement operation
 * will fail.
 */

// dependencies needed...
const m = require("mithril")
const electron = require('electron')
const marked = require("marked")
const path = require("path")
const fs = require("fs")
const os = require("os")
const pull = require("pull-stream")
const { dialog } = require("electron").remote

const ssbClient = require("ssb-client")

const {
	MessageWithButton,
	MessageWithIndeterminateProgress,
	getDataUriFromURL
} = require("./common.js")

// get SSB configuration and data files...
const appName = process.env.ssb_appname || "ssb"
const ssbFolder = path.join(os.homedir(), `.${appName}`)
const gossipFile = `${ssbFolder}/gossip.json`
const connFile = `${ssbFolder}/conn.json`
const secretFile = `${ssbFolder}/secret`

// script local variables used by multiple components...
let backup = {}
let sbot = false

/**
 * start - phase 1 of restore
 *
 * Present a message to the user and wait for confirmation
 * before moving along the automated restore phases.
 */
const start = {
	loadfile: function () {
		dialog.showOpenDialog(
			{
				title: "Load Identity Backup",
				buttonLabel: "Load"
			})
			.then((data) => {
				console.log(data)
				const canceled = data.canceled
				const filenames = data.filePaths
				if (canceled) {
					m.route.set("/restore/cancelled")
				} else {
					try {
						backup = JSON.parse(fs.readFileSync(filenames[0], "utf8"))
						backup.exportDate = new Date(backup.exportDate)
					} catch (n) {
						m.route.set("/restore/badbackupfile")
					}
					// console.log("done loading", backup)
					if (typeof backup.secret !== "string") {
						m.route.set("/restore/badbackupfile")
					} else {
						m.route.set("/restore/summary")
					}
				}
			})
			.catch(err => {
				console.log("error saving backup", err)
				m.route.set("/restore/error")
			})
	},
	view: function (vnode) {
		return m("div.content", [
			m("h1", "Restore Identity"),
			m.trust(marked(`
Restoring up your identity will take a while and you need to be able to connect to SSB peers during the
process either by having an Internet connection or by having other peers available on your LAN. If you've
added pubs or rooms before backing up your account, and have an Internet connection, the process should
just work.
		`)),
			m("button.button.is-primary.is-pulled-right", { onclick: start.loadfile }, "Load backup file")
		])
	}
}

/**
 * summary - phase 2 of restore
 *
 * Allow the user to select a backup file. Load it, double check it, move forward.
 */
const summary = {
	moveon: function () {
		m.route.set("/restore/checkssbfolder")
	},
	avatarAndName: function (vnode) {
		return m("div", [
			m("figure.image.is-128x128", { style: { margin: "auto" } }, m("img.is-rounded", { src: backup.avatarImage, style: { marginBottom: "10px" } })),
			m("h3", backup.name),
		])
	},
	minimalBackup: function (vnode) {
		return m.trust(marked(`This is a minimal backup for identity: \`${backup.feed}\``))
	},
	view: function (vnode) {
		let identityCard = backup.avatarImage ? this.avatarAndName() : this.minimalBackup()
		return m("div.content.has-text-centered", [
			m("h1", "Identity in backup file"),
			identityCard,
			m("h4", `Backup date: ${backup.exportDate.toString()}`),
			m("button.button.is-primary.is-large", { onclick: summary.moveon }, "Restore this identity")
		])
	}
}


/**
 * checkssbfolder - phase 3 of restore
 *
 * Double check if there is a current installation.
 */
const checkssbfolder = {
	oncreate: function (vnode) {
		if (fs.existsSync(secretFile)) {
			m.route.set("/restore/installationpresent")
		} else {
			m.route.set("/restore/placefiles")
		}

	},
	view: function (vnode) {
		return m(MessageWithIndeterminateProgress, {
			content: `Checking current installation...`
		})
	}
}

/**
 * installationpresent - phase 3.1 of restore
 *
 * There is an installation present on disk, we should warn the user.
 */
const installationpresent = {
	view: function (vnode) {
		return m(MessageWithButton, {
			content: `
**DANGER:** There is already an identity installed on your \`~/.ssb\` folder.
If you proceed, you'll overwrite this identity. We advise that you
[click here and make a backup of that identity](#//backup/start) before proceeding with the restore
process.

Are you sure you want to continue and overwrite the current identity?
        `,
			cta: "Overwrite identity",
			link: "/restore/placefiles"
		})

	}
}

/**
 * checkconnection - phase 4 of restore
 *
 * Attempt connection to sbot. For the restore process to work the
 * ssb server must be off. If there is a running SSB server we'll ask the
 * user to quit it.
 */
const checkconnection = {
	oncreate: function (vnode) {
		const Config = require("ssb-config/inject")
		const ssbKeys = require("ssb-keys")
		const config = Config(appName)
		config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, "secret"))
		config.remote = `net:127.0.0.1:${config.port}~shs:${config.keys.id.slice(1).replace(".ed25519", "")}`

		ssbClient(config, (err, server) => {
			if (err) {
				console.log("can't connect, this is good.")
				m.route.set("/restore/placefiles")
			} else {
				console.log("there is a running server...")
				m.route.set("/restore/pleasequitssbserver")
			}
		})
	},
	view: function (vnode) {
		return m(MessageWithIndeterminateProgress, {
			content: `Attempting to connect to the running ssb-server...`
		})
	}
}

const placefiles = {
	oncreate: function () {
		try {
			// check folder
			if (!fs.existsSync(ssbFolder)) {
				fs.mkdirSync(ssbFolder)
			}
			// secret
			fs.writeFileSync(secretFile, backup.secret, "utf8")
			// gossip.json
			if (backup.gossip) {
				fs.writeFileSync(gossipFile, JSON.stringify(backup.gossip), "utf8")
			}
			// conn.json
			if (backup.conn) {
				fs.writeFileSync(connFile, JSON.stringify(backup.conn), "utf8")
			}
			m.route.set("/restore/startserver")
		} catch (n) {
			console.error(n)
			m.route.set("/restore/error")
		}

	},
	view: function (vnode) {
		return m(MessageWithIndeterminateProgress, {
			content: "Adding files to `.ssb` folder..."
		})
	}
}

const startserver = {
	oncreate: function (vnode) {
		attemptedToStartBuiltinServer = true
		electron.ipcRenderer.send("start-server", "/restore/connect")

	},
	view: function (vnode) {
		return m(MessageWithIndeterminateProgress, {
			content: `Attempting to start SSB server...`
		})
	}
}

/**
 * connect
 *
 * Connect to the running SSB server and make sbot available
 * to the next phases.
 */
const connect = {
	oncreate: function (vnode) {
		const Config = require("ssb-config/inject")
		const ssbKeys = require("ssb-keys")
		const config = Config(appName)
		config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, "secret"))
		config.remote = `net:127.0.0.1:${config.port}~shs:${config.keys.id.slice(1).replace(".ed25519", "")}`

		ssbClient(config, (err, server) => {
			if (err) {
				console.error(err)
				m.route.set("/restore/servernotrunning")
			} else {
				sbot = server
				window.sbot = server
				m.route.set("/restore/waitforrestore")
			}
		})
	},
	view: function (vnode) {
		return m(MessageWithIndeterminateProgress, {
			content: `Attempting to connect to the running ssb-server...`
		})
	}
}


const waitforrestore = {
	currentSequence: 0,
	importComplete: false,
	updateSequence: function () {
		sbot.latestSequence(sbot.id, function (err, seq) {
			if (err) {
				console.error("error in latestSequence call", err)
				console.log("target", backup.latestSequence)
				if (err.message && err.message == "stream is closed") {
					if (waitforrestore.updateTimeout) {
						clearTimeout(waitforrestore.updateTimeout)
						delete waitforrestore.updateTimeout
					}
					m.route.set("/restore/connect")
				} else {
					waitforrestore.updateTimeout = setTimeout(waitforrestore.updateSequence, 5000)
				}
			} else {
				waitforrestore.currentSequence = seq
				console.log("latest sequence", seq)
				console.log("target", backup.latestSequence)
				if (seq < backup.latestSequence) {
					waitforrestore.updateTimeout = setTimeout(waitforrestore.updateSequence, 5000)
				} else {
					console.log("restored?")
				}
			}
			m.redraw()
		})
	},
	connectToPeers: function ({ peers }) {
		if (peers.length > 10) {
			const lessPeers = peers.filter(p => !p.error)
			if (lessPeers.length > 10) peers = lessPeers
			console.log('CONNECTING TO PEERS:', peers.length)
		}

		peers.forEach((p) => {
			if (p.address) {
				sbot.conn.connect(p.address, (err, v) => {
					if (err) {
						// console.error(`error connecting to ${p.address}`, err)
					} else {
						console.log('connected to ', p.address)
					}
				})
			}
		})
	},
	reconnectToPeers: function ({ peers, period }) {
		sbot.status((err, data) => {
			console.log("reconnectToPeers")
			if (err) return setTimeout(() => waitforrestore.reconnectToPeers({ peers, period }), period)


			peers
				.sort((a, b) => Math.random() > 0.5 ? -1 : 1)
				.slice(0, 5)
				.forEach(p => sbot.conn.connect(p.address, (err, v) => {
					if (err) {
						// console.error(`error connecting to ${p.address}`, err)
					} else {
						console.log('connected to ', p.address)
					}
				}))


			if (waitforrestore.importComplete) return

			waitforrestore.reconnectTimeout = setTimeout(() => waitforrestore.reconnectToPeers({ peers, period }), period)
		})
	},
	connectToLocalPeers: function () {
		pull(
			sbot.lan.discoveredPeers(),
			pull.drain(p => {

				if (p.verified) {
					console.log("local peer", p)
					sbot.conn.connect(p.address, (err, v) => {
						if (err) {
							console.error(`error connecting to lan ${p.address}`, err)
						} else {
							console.log('connected to ', p.address)
						}
					})
				}

			}, err => {
				if (err) {
					console.error("error on drain", err)
				} else {
					console.log("drained.")
				}
			})
		)
	},
	oncreate: function (vnode) {
		waitforrestore.updateSequence()
		// sbot.gossip.peers((err, peers) => {
		// 	if (err) return console.error(err)

		// 	waitforrestore.connectToPeers({ peers })
		// 	// waitforrestore.reconnectToPeers({ peers, period: 20000 })
		// 	// waitforrestore.connectToLocalPeers()

		// })

	},
	view: function (vnode) {
		return m("div.content", [
			m("h1", "Restore Identity"),
			m.trust(marked(`
Restoring up your identity will take a while. Please wait while we load your messages.
		`)),
			m("progress.progress.is-large.is-primary", { value: waitforrestore.currentSequence, max: backup.latestSequence }),
			m("p", `${waitforrestore.currentSequence} / ${backup.latestSequence}`)
		])
	}
}

/**
 * pleasequitssbserver
 *
 * There is a running SSB server for the current installation, ask
 * the user to quit it.
 */
const pleasequitssbserver = {
	view: function (vnode) {
		return m(MessageWithButton, {
			content: `
**DANGER:** There is already an identity installed on your \`${secretFile}\` folder and
a **running SSB server**. Please quit that SSB server before continuing, the
_restore identity_ process can't run while there is a running SSB server.

You might be running a client such as patchwork, patchbay or scuttle-shell that
starts an SSB server. Please quit all SSB apps before continuing.
        `,
			cta: "Check again",
			link: "/restore/checkconnection"
		})

	}
}

const servernotrunning = {
	view: function (vnode) {
		return m(MessageWithButton, {
			title: "Error",
			content: `
Can't start SSB server.
        `,
			cta: "Start over?",
			link: "/restore/start"
		})

	}
}

/**
 * error
 *
 * This only used if some unknown error happens.
 */
const error = {
	view: function (vnode) {
		return m(MessageWithButton, {
			title: "Can't restore!!! 🙀",
			content: `
There is something deeply wrong here. There was an unrecoverable error. Please submit an issue.
        `,
			cta: "Try Again?",
			link: "/restore/start"
		})
	}
}

/**
 * cancelled
 * This only happens if the user cancel the file selection in phase 5.
 */
const cancelled = {
	view: function (vnode) {
		return m(MessageWithButton, {
			title: "Restore cancelled",
			content: `You cancelled the restore identity process.`,
			cta: "Try Again?",
			link: "/restore/start"
		})
	}
}

const badbackupfile = {
	view: function (vnode) {
		return m(MessageWithButton, {
			title: "Bad backup file",
			content: `The file you selected doesn't contain a valid backup.`,
			cta: "Try again?",
			link: "/restore/start"
		})
	}
}


const RestoreView = {
	phases: {
		// restore phases...
		start,
		summary,
		checkssbfolder,
		installationpresent,
		checkconnection,
		pleasequitssbserver,
		placefiles,
		connect,
		startserver,
		waitforrestore,
		// auxiliary views, mostly error handling...
		error,
		cancelled,
		badbackupfile,
		servernotrunning

	},
	view: () => {
		let phase = m.route.param("key") || "start"
		let component = RestoreView.phases[phase]
		return m(component)
	}
}

module.exports = RestoreView
