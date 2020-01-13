/**
 * Restore
 * 
 * This file contains all the logic needed for restoring an SSB identity.
 * 
 * The restore workflow is composed of multiple phases. Each phase is a
 * [MithrilJS](https://mithril.js.org) component and routing is used to 
 * move between phases.
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

config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, "secret"))
config.remote = `net:127.0.0.1:${config.port}~shs:${config.keys.id.slice(1).replace(".ed25519", "")}`

const gossipFile = path.join(config.path, "gossip.json")
const connFile = path.join(config.path, "conn.json")
const secretFile = path.join(config.path, "secret")
const ssbFolder = config.path

// script local variables used by multiple components...
let backup = {}
let sbot = false
let attemptedToStartBuiltinServer = false

/**
 * start - phase 1 of restore
 * 
 * Present a message to the user and wait for confirmation
 * before moving along the automated restore phases.
 */
const start = {
    view: function (vnode) {
        return m(MessageWithButton, {
            content: `
Restoring up your identity will take a while and you need to be able to connect to SSB peers during the 
process either by having an Internet connection or by having other peers available on your LAN. If you've
added pubs or rooms before backing up your account, and have an Internet connection, the process should
just work.
        `,
            cta: "Restore Account",
            link: "/restore/checkssbfolder"
        })

    }
}

/**
 * checkssbfolder - phase 2 of restore
 * 
 * Double check if there is a current installation.
 */
const checkssbfolder = {
    oncreate: function (vnode) {
        if (fs.existsSync(secretFile)) {
            m.route.set("/restore/installationpresent")
        } else {
            m.route.set("/restore/checkconnection")
        }

    },
    view: function (vnode) {
        return m(MessageWithIndeterminateProgress, {
            content: `Checking current installation...`
        })
    }
}

/**
 * installationpresent - phase 2.1 of restore
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
            link: "/restore/checkconnection"
        })

    }
}

/**
 * checkconnection - phase 3 of restore
 * 
 * Attempt connection to sbot. For the restore process to work the 
 * ssb server must be off. If there is a running SSB server we'll ask the
 * user to quit it.
 */
const checkconnection = {
    oncreate: function (vnode) {
        ssbClient(config, (err, server) => {
            if (err) {
                m.route.set("/restore/placefiles")
            } else {
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

/**
 * pleasequitssbserver - phase 3.1 of restore
 * 
 * There is a running SSB server for the current installation, ask
 * the user to quit it.
 */
const pleasequitssbserver = {
    view: function (vnode) {
        return m(MessageWithButton, {
            content: `
**DANGER:** There is already an identity installed on your \`~/.ssb\` folder and
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

const placefiles = {}

const RestoreView = {
    phases: {
        start,
        checkssbfolder,
        installationpresent,
        checkconnection,
        pleasequitssbserver,
        placefiles
    },
    view: () => {
        let phase = m.route.param("key") || "start"
        let component = RestoreView.phases[phase]
        return m(component)
    }
}

module.exports = RestoreView