const nest = require('depnest')
const {h, resolve} = require('mutant')

exports.gives = nest('app.page.main')

exports.needs = nest({
	'translations.sync.strings': 'first',
	'keys.sync.id': 'first',
	'about.html.avatar': 'first',
	'about.obs.name': 'first',
	'backup.html.exportIdentityButton': 'first'

})

exports.create = (api) => {

	return nest('app.page.main', main)

	function main(location) {
		const strings = api.translations.sync.strings()
		const feed = api.keys.sync.id()
		const name = api.about.obs.name(feed)
		const exportIdentityButton = api.backup.html.exportIdentityButton(name)

		return h('Page -main', {title: strings.app.name}, [
			h('h1', strings.app.name),
			h('section.about', [
				api.about.html.avatar(feed, 'large'),
				h('h1', [
					name
				])
			]),
			h('section -backup', [
				h('div.left', strings.backup.sectionName),
				h('div.right', [
					exportIdentityButton
				])
			])
		])
	}
}
