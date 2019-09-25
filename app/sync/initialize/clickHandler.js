const nest = require('depnest')
const openExternal = require('open-external')

exports.gives = nest('app.sync.initialize')

exports.needs = nest({
  'app.async.catchLinkClick': 'first',
  'history.sync.push': 'first'
})

exports.create = (api) => {
  return nest({
    'app.sync.initialize': function initializeClickHandling () {
      console.log('> initialise: clickHandler')
      const target = document.body

      api.app.async.catchLinkClick(target, (link, { isExternal }) => {
        if (isExternal) return openExternal(link)

        api.history.sync.push(link)
      })
    }
  })
}
