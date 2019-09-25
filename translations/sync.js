const nest = require('depnest')
const merge = require('lodash/merge')

exports.gives = nest('translations.sync.strings')

exports.needs = nest('settings.sync.get', 'first')

const languages = {
  en: require('./en.js')
}

exports.create = (api) => {
  return nest('translations.sync.strings', () => {
    const language = api.settings.sync.get('language', 'en')

    return merge({}, languages.en, languages[language])
  })
}
