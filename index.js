// https://developer.github.com/v4/explorer/
// https://developer.github.com/v4/object/issue/
// $ GITHUB_REPOSITORY=muety/test-repo node index.js

const core = require('@actions/core'),
    github = require('@actions/github'),
    Issue = require('./issue.class'),
    ReadmeBox = require('readme-box').ReadmeBox

const TITLE_PREFIX = 'Guestbook:'
const N_ISSUES = 10
const N_CHARS = 140
const SECTION_KEY = 'guestbook'
const PRE_ENTRY_TPL = `<a href="{2}"><img src="{1}" height="30"/></a>`
const ENTRY_TPL = `
**[{1}]({2}) wrote on {3}:** {4}
`
const NO_ENTRY_TPL = `
Nothing here, yet. Be the first to [post something](https://github.com/{1}/{2}/issues/new?title=${TITLE_PREFIX}) to {1}'s guestbook!
`

async function getIssues(octokit, context, num) {
    // Fetch issues
    const query = `
        query lastIssues($owner: String!, $repo: String!, $num: Int) {
            repository(owner: $owner, name: $repo) {
                issues(first: $num, orderBy: {field: CREATED_AT, direction: DESC}, filterBy: {states: [OPEN]}) {
                    edges {
                        node {
                            title
                            bodyText
                            createdAt
                            author {
                                login
                                avatarUrl
                            }
                        }
                    }
                }
            }
        }
        `

    const result = await octokit.graphql(query, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        num: (num || N_ISSUES) * 2
    })

    const issues = result.repository.issues.edges
        .map(e => new Issue(
            e.node.title,
            e.node.bodyText,
            e.node.author.login,
            e.node.author.avatarUrl,
            e.node.createdAt
        ))
        .filter(e => !!e.text)
        .filter(e => e.title.indexOf(TITLE_PREFIX) === 0)

    return issues.slice(0, Math.min(issues.length, (num || N_ISSUES)))
}

async function updateReadme(token, context, content) {
    return await ReadmeBox.updateSection(content, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        token: token,
        section: SECTION_KEY
    })
}

function formatIssues(issues) {
    const header = [...new Set(issues.map(e => PRE_ENTRY_TPL
        .replace('{1}', e.authorAvatar)
        .replace('{2}', `https://github.com/${e.author}`)))]
        .join(' ')

    const body = issues.map(e => ENTRY_TPL
        .replace('{1}', e.author)
        .replace('{2}', `https://github.com/${e.author}`)
        .replace('{3}', e.createdAt.toLocaleDateString('en-US'))
        .replace('{4}', e.text.substring(0, N_CHARS).split('\n').join(' ')))
        .join('\n')

    return `${header}\n\n${body}`
}

async function run() {
    const token = core.getInput('token')
    const nIssues = core.getInput('max_entries')
    const octokit = github.getOctokit(token)
    const context = github.context

    const issues = await getIssues(octokit, context, nIssues)
    const content = issues.length
        ? formatIssues(issues)
        : NO_ENTRY_TPL
            .replace('{1}', context.repo.owner)
            .replace('{2}', context.repo.repo)

    await updateReadme(token, context, content)
}

run()