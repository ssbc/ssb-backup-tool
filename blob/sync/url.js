const nest = require('depnest')

exports.gives = nest('blob.sync.url')

exports.needs = nest({
  'config.sync.load': 'first'
})

exports.create = function (api) {
  return nest('blob.sync.url', function (link) {
    var config = api.config.sync.load()
    var prefix = config.blobsPrefix != null ? config.blobsPrefix : `http://localhost:${config.ws.port}/blobs/get`
    if (link && typeof link.link === 'string') {
      link = link.link
    }
    return `${prefix}/${encodeURIComponent(link)}`
  })
}
