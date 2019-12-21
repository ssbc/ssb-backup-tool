const marked = require("marked");

const welcomeMessage = `
This tool will help backup and restore your Secure Scuttlebutt
account. Use the menu on the left side to select between the backup and restore actions.
`

const Welcome = {
    view: vnode => {
        return m("div.content", [
            m("h1", "Welcome"),
            m.trust(marked(welcomeMessage))
        ])
    }
}

module.exports = Welcome;