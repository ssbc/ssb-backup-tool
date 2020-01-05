const m = require("mithril");
const electron = require("electron")
const Navigation = require("./navigation");
const Welcome = require("./welcome");
const Backup = require("./backup");
const root = document.getElementById("root");


electron.ipcRenderer.on('server-started', (event, config) => {
	console.log("server started")
	m.route.set("/backup/connect")
})

m.route(root, "/welcome", {
	"/welcome": {
		render: (vnode) => {
			return m(Navigation, m(Welcome, vnode.attrs))
		}
	},
	"/backup/:key": {
		render: vnode => {
			return m(Navigation, m(Backup, vnode.attrs))
		}
	}
});

