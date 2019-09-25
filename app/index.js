module.exports = {
  async: {
    catchLinkClick: require('./async/catch-link-click')
  },
  html: {
    app: require('./html/app')
  },
  obs: {
  },
  page: {
    main: require('./page/main'),
    error: require('./page/error'),
  },
  sync: {
    initialize: {
      clickHandler: require('./sync/initialize/clickHandler'),
      settings: require('./sync/initialize/settings'),
      styles: require('./sync/initialize/styles')
    }
  }
}
