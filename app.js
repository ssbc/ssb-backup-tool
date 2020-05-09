const m = require("mithril");
const electron = require("electron")
const Navigation = require("./navigation");
const Welcome = require("./welcome");
const root = document.getElementById("root");


electron.ipcRenderer.on('server-started', (event, config, url) => {
	console.log("server started", url)
	m.route.set(url)
})

m.route(root, "/welcome", {
	"/welcome": {
		render: (vnode) => {
			return m(Navigation, m(Welcome, vnode.attrs))
		}
	},
	"/backup/:key": {
		render: vnode => {
			const Backup = require("./backup");
			return m(Navigation, m(Backup, vnode.attrs))
		}
	},
	"/restore/:key": {
		render: vnode => {
			const Restore = require("./restore");
			return m(Navigation, m(Restore, vnode.attrs))
		}
	}
});

