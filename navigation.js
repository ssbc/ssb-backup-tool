const m = require("mithril");

const NavigationItem = {
	view: vnode => m("li",
		m(m.route.Link, {
			href: vnode.attrs.link,
			class: vnode.attrs.active ? "is-active" : "",
		}, vnode.attrs.label))
}

const NavigationSidebar = {
	view: vnode => m("aside.menu",
		[
			m("ul.menu-list", vnode.attrs.menu.map(i => m(NavigationItem, i)))
		])
};

const Navigation = {
	onupdate: vnode => {
		const route = m.route.get()
		if (route !== Navigation.oldRoute) {
			console.log("changing route")
		}
		Navigation.oldRoute = route
	},
	view: vnode => {
		const activeRoute = m.route.get();

		return m("div.columns",
			{
				style: {
					height: "100vh",
					margin: "0px"
				}
			}, [
			m("div.column.has-background-primary.is-one-quarter",
				m(NavigationSidebar, {
					menu: [
						{ link: "/welcome", label: "Welcome", active: activeRoute === "/welcome" },
						{ link: "/backup/start", label: "Backup", active: activeRoute.indexOf("/backup") > -1 },
						{ link: "/restore/start", label: "Restore", active: activeRoute.indexOf("/restore") > -1 }
					]
				})
			),
			m("div.column", m("div.section", vnode.children))
		])
	}
};

module.exports = Navigation;
