const nest = require('depnest')
const {h, Value, computed} = require('mutant')
const {dialog} = require('electron').remote

exports.gives = nest({
	'backup.html': ['exportIdentityButton']
})

exports.needs = nest({
	'keys.sync.id': 'first',
	'translations.sync.strings': 'first',
	'about.obs.name': 'first',
	'backup.async.exportIdentity': 'first'
})

exports.create = (api) => {
	return nest('backup.html.exportIdentityButton', () => {
		const strings = api.translations.sync.strings()

		const exporting = Value()
		const success = Value()
		const feed = api.keys.sync.id()

		function exportAction() {
			exporting.set(true)
			success.set() // the resets the tick if there are multiple backup exports done

			let feedFragment = feed.slice(1, 6)
			dialog.showSaveDialog(
				{
					title: strings.backup.export.dialog.title,
					buttonLabel: strings.backup.export.dialog.label,
					defaultPath: `${feedFragment}.ssb-backup`
				})
				.then((data) => {
					const canceled = data.canceled
					const filename = data.filePath
					if (canceled ) {
						exporting.set(false)
					} else {
						api.backup.async.exportIdentity(feed, filename, (err, res) => {
							exporting.set(false)
							if (err) {
								console.error(err)
								success.set(false)
							} else {
								console.log('exported')
								success.set(true)
							}
						})
					}
				})

		}

		function importAction() {

		}

		return h('div.backupKeys', [
			h('Button -backup', {'ev-click': exportAction}, strings.backup.export.exportAction),
			// h('Button -import', {'ev-click': importAction}, strings.backup.import.importAction),
			h('div.status',
				computed([exporting, success], (exporting, success) => {
					if (success === true) return h('i.fa.fa-2x.fa-check')
					if (success === false) return h('i.fa.fa-2x.fa-times')

					if (exporting) return h('i.fa.fa-2x.fa-spinner.fa-pulse')
				}))
		])
	})
}
