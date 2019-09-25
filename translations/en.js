module.exports = {
	app: {
		name: 'SSB Backup Tool'
	},
	backup: {
		sectionName: 'Backup',
		ftu: {
			importAction: 'Import identity',
			createAction: 'Create new identity',
			busyMessage: 'Processing...',
			welcomeHeader: 'Welcome to Ticktack',
			welcomeMessage: 'Do you want to create a new identity or import one?'
		},
		export: {
			header: 'Export identity',
			message: [
				'Please backup your private key file very carefully.',
				'If your private key is hacked, all your private messages will be retrieved by third party, and your identity will be faked on the network'
			],
			passwordPlaceholder: 'Please enter password to protect export file',
			cancelAction: 'Cancel',
			exportAction: 'Export Identity',
			dialog: {
				label: 'Export Identity',
				title: 'Export Identity'
			}
		},
		import: {
			importAction: 'Import Identity',
			header: 'Importing identity',
			myFeedProgress: 'Progress (your identity)',
			myFriendsProgress: 'Progress (your friends)',
			dialog: {
				label: 'Import Identity',
				title: 'Import Identity'
			},
			details: 'Reconstructing your identity will take some time. Ticktack will launch once your identity is synchronized, but it will take some time to gather your friends data, so some messages and blogs will arrive later. You can safely close this window and Ticktack will resume sync next time you open it.'
		}
	},
	languages: {
		en: 'English'
	}
}
