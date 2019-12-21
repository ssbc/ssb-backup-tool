const m = require("mithril");
const Navigation = require("./navigation");
const Welcome = require("./welcome");
const Backup = require("./backup");
const root = document.getElementById("root");


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