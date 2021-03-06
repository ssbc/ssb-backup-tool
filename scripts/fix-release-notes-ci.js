/**
 * Picks the first release draft whose name is the same as the current version listed
 * in the _package.json_ file and updates its body.
 *
 * Requires that Travis CI exports:
 *
 * - `GH_TOKEN=<personal token>`
 *
 * this is tied to the SSBC collaborator account called `hermes-bot`, its user is hardcoded in the URLs.
 *
 * Call it with:
 * - `npm run fix-release-notes-ci`
 */

const fs = require("fs")
const fetch = require("node-fetch")
const Handlebars = require("handlebars")
const open = require("open");

const pkg = JSON.parse(fs.readFileSync("./package.json"))
const version = pkg.version
const token = process.env.GH_TOKEN
const user = "hermes-bot"
const changes = fs.readFileSync("./CHANGELOG.md", {encoding:  "utf8"})
const template_source = fs.readFileSync("./scripts/release-notes.hbs", {encoding:  "utf8"})
const template = Handlebars.compile(template_source)
const api = (url) => url.replace("api.github.com", `${user}:${token}@api.github.com`)
const releases_url = api("https://api.github.com/repos/ssbc/ssb-backup-tool/releases") // <-- customize this if using for another repo.


let main = async () => {
    console.log(`[CI VERSION] Fixing release notes for draft ${version}`)
    console.log(`- Getting releases from GitHub...`)

    let releases = await (await fetch(releases_url)).json()
    let release = releases.filter(r => r.tag_name === `v${version}`)[0]

    if (!release) {
        console.log(`- Can't find a release for ${version}`)
        process.exit(1)
    }

    console.log(`- Release found: ${release.url}`)
    console.log(`- Updating release notes...`)
    const notes = template({pkg, version, changes, release})


    let payload = {
        name: `${pkg.name} v${version}`,
        body: notes,
		tag_name: `v${version}`,
		draft: false
    }
    let url_with_auth = api(release.url)
    let response = await (await fetch(`${url_with_auth}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })).json()

	console.log(response.html_url)
	process.exit(0)
}

main()
