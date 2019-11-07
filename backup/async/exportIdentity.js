const nest = require('depnest')
const {onceTrue, computed, resolve} = require('mutant')
const path = require('path')
const fs = require('fs')
const parallel = require('run-parallel')
const mapLimit = require('map-limit')

const config = require('../../config').create().config.sync.load()
const gossipFile = path.join(config.path, 'gossip.json')
const connFile = path.join(config.path, 'conn.json')
const secretFile = path.join(config.path, 'secret')
const pull = require('pull-stream')

exports.gives = nest('backup.async.exportIdentity')

exports.needs = nest({
	'sbot.obs.connection': 'first',
	'about.obs.name': 'first',
	'about.obs.image': 'first',
	'about.obs.imageUrl': 'first'
})

exports.create = function (api) {
	return nest('backup.async.exportIdentity', (feed, filename, cb) => {
		if (typeof filename === 'undefined') return cb(new Error('backup requires a filename'))

		console.log("begin export")

		let backup = {
			feed: feed,
			exportDate: new Date().toISOString(),
			secret: fs.readFileSync(secretFile, 'utf8'),
		}

		if (fs.existsSync(gossipFile)) {
			backup.gossip = require(gossipFile)
		}

		if (fs.existsSync(connFile)) {
			backup.conn = require(connFile)
		}

		onceTrue(api.sbot.obs.connection, sbot => {
			function getLatestSequence(done) {
				sbot.latestSequence(sbot.id, (err, seq) => {
					if (err) return done(err)

					backup.latestSequence = seq
					console.log('latest seq', seq)
					done(null)
				})
			}

			async function getName(done) {
				async function getDataUriFromURL(url) {
					return new Promise((resolve, reject) => {
						const image = new Image();

						image.onload = function () {
							var canvas = document.createElement('canvas');
							canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
							canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size

							canvas.getContext('2d').drawImage(this, 0, 0);

							// ... or get as Data URI
							resolve(canvas.toDataURL('image/png'));
						};

						image.src = url;
					})
				}

				const name = resolve(api.about.obs.name(sbot.id))
				const imageUrl = resolve(api.about.obs.imageUrl(sbot.id))
				const imageBlob = await getDataUriFromURL(imageUrl)

				backup.name = name
				backup.avatarImage = imageBlob
				done(null)


			}

			parallel([
				getLatestSequence,
				getName,
			], save)
		})

		function save(err, success) {
			if (err) {
				return cb(err)
			}

			fs.writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf8')
			console.log("done saving")
			cb(null, true)
		}

		return true
	})
}
