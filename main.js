const combine = require('depject')
const entry = require('depject/entry')
const nest = require('depnest')

// polyfills
require('setimmediate')

// from more specialized to more general
const sockets = combine(
	// need some modules first
	{
		settings: require('patch-settings'),
		translations: require('./translations/sync'),
	},
	{
		app: require('./app'),
		blob: require('./blob'),
		about: require('./about'),
		config: require('./config'),
		backup: require('./backup'),
		styles: require('./styles'),
		router: require('./router')
	},
	{
		history: require('patch-history'),
		core: require('patchcore')
	}
)

const api = entry(sockets, nest({
	'app.html.app': 'first'
}))

document.body.appendChild(api.app.html.app())
// console.log(api.config.sync.load())
