/**
 * Backup
 *
 * This file contains all the logic related to backing up an SSB identity.
 *
 * The backup workflow is composed of multiple phases. Each phase is actually a
 * [Mithril route](https://mithril.js.org/index.html#routing), so by changing
 * routes, we move through phases.
 */

// dependencies needed...
const m = require("mithril")
const electron = require('electron')
const marked = require("marked")
const path = require("path")
const fs = require("fs")
const { dialog } = require("electron").remote
const Config = require("ssb-config/inject")
const ssbKeys = require("ssb-keys")
const ssbClient = require("ssb-client")
const ssbAvatar = require("ssb-avatar")
const {
	MessageWithButton,
	MessageWithIndeterminateProgress,
	getDataUriFromURL
} = require("./common.js")

// get SSB configuration and data files...
const appName = process.env.ssb_appname || "ssb"
const config = Config(appName)

const gossipFile = path.join(config.path, "gossip.json")
const connFile = path.join(config.path, "conn.json")
const secretFile = path.join(config.path, "secret")

// script local variables used by multiple components...
let backup = {}
let sbot = false
let attemptedToStartBuiltinServer = false



/**
 * start - phase 1 of backup
 *
 * Present a message to the user and wait for confirmation
 * before moving along the automated backup phases.
 */
const start = {
	view: function (vnode) {
		return m(MessageWithButton, {
			content: `
Backing up your identity generates a file on your computer with all the data required to
restore your identity in a future moment. This file is very important and you should take
good care of it. If someone else gets their hands on this file, they will be able to impersonate
you and even break your feed.
        `,
			cta: "Create Backup",
			link: "/backup/checkssbfolder"
		})

	}
}

/**
 * checkssbfolder - phase 2 of backup
 *
 * Get data from the files inside `~/.ssb` folder.
 * The data retrieved in this phase is already enough to create
 * a restorable backup. This means that to backup an SSB identity
 * we don"t need a working ssb-server as long as the files on disk
 * are correct.
 *
 * All the other phases gather extra data to make the backup stronger
 * and more friendly.
 */
const checkssbfolder = {
	oncreate: function (vnode) {
		if (fs.existsSync(secretFile)) {
			backup = {
				exportDate: new Date().toISOString(),
				secret: fs.readFileSync(secretFile, "utf8"),
				feed: config.keys.public
			}
		} else {
			m.route.set("/backup/nosecret")
		}

		if (fs.existsSync(gossipFile)) {
			backup.gossip = require(gossipFile)
		}

		if (fs.existsSync(connFile)) {
			backup.conn = require(connFile)
		}

		console.log("backup", backup)
		m.route.set("/backup/connect")

	},
	view: function (vnode) {
		return m(MessageWithIndeterminateProgress, {
			content: `Getting data directly from the files in \`~/.ssb\` folder.`
		})
	}
}

/**
 * connect - phase 3 of backup
 *
 * Connect to the running SSB server and make sbot available
 * to the next phases.
 */
const connect = {
	oncreate: function (vnode) {
		config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, "secret"))
		config.remote = `net:127.0.0.1:${config.port}~shs:${config.keys.id.slice(1).replace(".ed25519", "")}`

		ssbClient(config, (err, server) => {
			if (err) {
				console.error("err", err)
				if (attemptedToStartBuiltinServer) {
					m.route.set("/backup/servernotrunning")
				} else {
					m.route.set("/backup/startserver")
				}
			} else {
				sbot = server
				backup.feed = sbot.id
				m.route.set("/backup/getdatafromserver")
			}
		})
	},
	view: function (vnode) {
		return m(MessageWithIndeterminateProgress, {
			content: `Attempting to connect to the running ssb-server...`
		})
	}
}

const startserver = {
	oncreate: function (vnode) {
		attemptedToStartBuiltinServer = true
		electron.ipcRenderer.send("start-server", "/backup/connect")

	},
	view: function (vnode) {
		return m(MessageWithIndeterminateProgress, {
			content: `Attempting to start SSB server...`
		})
	}
}

/**
 * getdatafromserver - phase 4 of backup
 *
 * Get extra data
 * related to the user.
 *
 * The most important data is the `latestSequence` which will become
 * a target for the _restore process_. Of course, if you keep using this
 * identity after backing it up, the `latestSequence` inside the backup
 * will not reflect the latest sequence in the real world but that is OK
 * because the restore process will know that it need to wait at least until
 * that number. It will try asking your peers for what they think is the latest
 * sequence and compare it with this value.
 */
const getdatafromserver = {
	getLatestSequence: function (vnode) {
		sbot.latestSequence(sbot.id, function (err, seq) {
			if (err) {
				m.route.set("/backup/nolatestsequence")
			} else {
				backup.latestSequence = seq
				console.log("backup", backup)
				getdatafromserver.getAvatarData()
			}
		})
	},
	getAvatarData: () => {
		ssbAvatar(sbot, sbot.id, sbot.id, async (err, data) => {
			console.log(data)
			backup.name = data.name
			const imageBlob = await getDataUriFromURL(`http://localhost:8989/blobs/get/${encodeURIComponent(data.image)}`)
			backup.avatarImage = imageBlob
			console.log("backup", backup)
			m.route.set("/backup/summary")
		})
	},
	oncreate: function (vnode) {
		return this.getLatestSequence()
	},
	view: function (vnode) {
		m(MessageWithIndeterminateProgress, {
			content: `Getting data from ssb-server...`
		})
	}
}

/**
 * summary - phase 5 of backup
 *
 * Stop and present the user with their avatar and name and let them chose a file
 * to use for the backup.
 */
const summary = {
	save: function () {
		let feedFragment = backup.feed.slice(1, 6)
		dialog.showSaveDialog(
			{
				title: "Save Identity Backup",
				buttonLabel: "Save",
				defaultPath: `${feedFragment}.ssb-backup`
			})
			.then((data) => {
				const canceled = data.canceled
				const filename = data.filePath
				if (canceled) {
					m.route.set("/backup/cancelled")
				} else {

					fs.writeFileSync(filename, JSON.stringify(backup, null, 2), "utf8")
					console.log("done saving")
					m.route.set("/backup/saved")
				}
			})
			.catch(err => {
				console.log("error saving backup", err)
				m.route.set("/backup/error")
			})

	},
	avatarAndName: function (vnode) {
		return m("div", [
			m("figure.image.is-128x128", { style: { margin: "auto" } }, m("img.is-rounded", { src: backup.avatarImage })),
			m("h3", backup.name || config.keys.public),
		])
	},
	minimalBackup: function (vnode) {
		return m.trust(marked(`This is a minimal backup for identity: \`${backup.feed}\``))
	},
	view: function (vnode) {
		let identityCard = backup.avatarImage ? this.avatarAndName() : this.minimalBackup()
		return m("div.content.has-text-centered", [
			m("h1", "Ready To Save"),
			identityCard,
			m("button.button.is-primary.is-large", { onclick: summary.save }, "Save")
		])
	}
}

/**
 * cancelled - phase 5.1 of backup
 *
 * This only happens if the user cancel the file selection in phase 5.
 */
const cancelled = {
	view: function (vnode) {
		return m(MessageWithButton, {
			title: "Backup cancelled",
			content: `You cancelled the backup.`,
			cta: "Try Again?",
			link: "/backup/start"
		})
	}
}

/**
 * saved - phase 6 of backup
 *
 * Everything was saved and is fine.
 */
const saved = {
	view: function (vnode) {
		return m("div.content", [
			m("h1", "Backup saved ❤"),
			m("p", "Backup saved successfully.")
		])
	}
}

/**
 * nosecret - phase 2.1 of backup
 *
 * This only happens if the SSB installation is broken and we can"t find a secret file.
 */
const nosecret = {
	view: function (vnode) {
		return m(MessageWithButton, {
			title: "Can't backup!!! 🙀",
			content: `
There is something deeply wrong here. We can"t find the \`secret\` file used by
SSB to store your identity. It usually is located inside a folder called \`.ssb\`
inside your home folder. Can you verify that the file is there?

If it is there and the backup tool can"t find it, then this is bug in the backup tool. Please,
use the _help_ menu to _submit an issue_ to us so that we can be aware of it and fix it.
        `,
			cta: "Try Again?",
			link: "/backup/start"
		})
	}
}

/**
 * nolatestsequence
 *
 * This only used if some unknown error happens.
 */
const nolatestsequence = {
	view: function (vnode) {
		return m(MessageWithButton, {
			title: "Can't backup!!! 🙀",
			content: `
There is something deeply wrong here. We were able to connect to the running SSB server
but we couldn't ask for the latest sequence. This should never happen. Please submit an issue
using the help menu.
        `,
			cta: "Try Again?",
			link: "/backup/start"
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
			title: "Can't backup!!! 🙀",
			content: `
There is something deeply wrong here. There was an unrecoverable error. Please submit an issue.
        `,
			cta: "Try Again?",
			link: "/backup/start"
		})
	}
}

/**
 * servernotrunning - phase 3.1 of backup
 *
 * We've failed to connect to the running SSB server. We still have enough data
 * for a minimal backup so we present both options for the user.
 */
const servernotrunning = {
	msg: `
Either we can't connect to the SSB server or it is not running. Please, make sure
SSB server is running and then try again.

You can backup with the current data we have but the restore process will be harder as we don't
yet have information about your last sequence number, your name, and your avatar.
    `,
	view: function (vnode) {
		return m("div.content", [
			m("h1", "SSB Server Not Running"),
			m.trust(marked(this.msg)),
			m(m.route.Link, { selector: "a.button.is-primary.is-pulled-right", style: { marginLeft: "10px" }, href: "/backup/connect" }, "Try to connect again"),
			m(m.route.Link, { selector: "a.button.is-pulled-right", href: "/backup/summary" }, "Backup without the extra data"),

		])
	}
}



const BackupView = {
	phases: {
		start,
		checkssbfolder,
		connect,
		startserver,
		getdatafromserver,
		summary,
		saved,
		cancelled,
		nosecret,
		servernotrunning,
		error,
		nolatestsequence
	},
	view: () => {
		let phase = m.route.param("key") || "start"
		let component = BackupView.phases[phase]
		return m(component)
	}
}

module.exports = BackupView
