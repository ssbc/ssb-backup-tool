const nest = require('depnest')
const { isMsg, isFeed, isBlob } = require('ssb-ref')
const openExternal = require('open-external')
const get = require('lodash/get')

exports.gives = nest('router.sync.routes')

exports.needs = nest({
  'app.page.error': 'first',
  'app.page.main': 'first'
})

exports.create = (api) => {
  return nest('router.sync.routes', (sofar = []) => {
    const pages = api.app.page
    // route format: [ routeValidator, routeFunction ]

    const routes = [
      [ location => location.page === 'main', pages.main ],

      // Error page
      [ location => true, pages.error ]
    ]

    return [...routes, ...sofar]
  })
}
