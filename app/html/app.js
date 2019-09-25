const nest = require('depnest')
const { h, Value } = require('mutant')

exports.gives = nest('app.html.app')

exports.needs = nest({
  'app.sync.initialize': 'map',
  'history.obs.location': 'first',
  'history.sync.push': 'first',
  'keys.sync.id': 'first',
  'router.sync.router': 'first',
  'settings.sync.get': 'first',
  'settings.sync.set': 'first',
  'config.sync.load': 'first'
})

exports.create = (api) => {
  var view

  return nest({
    'app.html.app': function app () {
      api.app.sync.initialize()

      view = Value()
      var app = h('App', view)
      api.history.obs.location()(renderLocation)
      api.history.obs.location()(loc => console.log('location:', loc))

      startApp()

      return app
    }
  })

  function renderLocation (loc) {
    var page = api.router.sync.router(loc)
    if (page) {
      view.set([
        page
      ])
    }
  }

  function startApp () {
    api.history.sync.push({page: 'main'})
  }

}
