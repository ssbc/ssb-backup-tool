const marked = require("marked")
const m = require("mithril")

const titles = {
    backup: "Backup Identity",
    restore: "Restore Identity"
}

/**
 * MessageWithIndeterminateProgress
 * 
 * Generic Mithril component that renders a message
 * with an indeterminate progress progressbar.
 * 
 * This is used by during backup phases in which we gather
 * data from external files and network connections.
 */
const MessageWithIndeterminateProgress = {
    view: function (vnode) {
        let currentRoute = m.route.get().split("/")[1]
        return m("div.content", [
            m("h1", vnode.attrs.title || titles[currentRoute]),
            m.trust(marked(vnode.attrs.content)),
            m("progress.is-large.is-primary", { max: 100 })
        ])
    }
}

/**
 * MessageWithButton
 * 
 * Generic Mithril component that renders a message
 * with a button with a CTA.
 * 
 * This is used by backup phases in which we want to convey
 * a message to the user before moving onto the next phase.
 */
const MessageWithButton = {
    view: function (vnode) {
        let currentRoute = m.route.get().split("/")[1]
        return m("div.content", [
            m("h1", vnode.attrs.title || titles[currentRoute]),
            m.trust(marked(vnode.attrs.content)),
            m(m.route.Link, { selector: "a.button.is-primary.is-pulled-right", href: vnode.attrs.link }, vnode.attrs.cta)
        ])
    }
}

/**
 * getDataUriFromURL
 * 
 * Converts an image URL into a data URI.
 * This is used to insert the avatar image for the user
 * into the backup file.
 *
 * @param {url} url 
 */
async function getDataUriFromURL(url) {
    return new Promise((resolve, reject) => {
        const image = new Image()

        image.onload = function () {
            var canvas = document.createElement("canvas")
            canvas.width = this.naturalWidth // or "width" if you want a special/scaled size
            canvas.height = this.naturalHeight // or "height" if you want a special/scaled size

            canvas.getContext("2d").drawImage(this, 0, 0)

            // ... or get as Data URI
            resolve(canvas.toDataURL("image/png"))
        }

        image.src = url
    })
}

module.exports = {
    MessageWithButton,
    MessageWithIndeterminateProgress,
    getDataUriFromURL
}