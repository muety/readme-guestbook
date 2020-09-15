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

const 
    TPL_ENTRY_AUTHOR = [`<a href="{2}"><img src="{1}" height="30"/></a>`, ' '],
    TPL_ENTRY_GUESTBOOK = [`**[{1}]({2}) wrote on {3}:** {4}`, '\n'],
    TPL_COMBINED = `{1}\n\n**All guests:**\n\n{2}`,
    TPL_PLACEHOLDER = `Nothing here, yet. Be the first to [post something](https://github.com/{1}/{2}/issues/new?title=${TITLE_PREFIX}) to {3}'s guestbook!`

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
    const header = [...new Set(issues.map(e => TPL_ENTRY_AUTHOR[0]
        .replace('{1}', e.authorAvatar)
        .replace('{2}', `https://github.com/${e.author}`)))]
        .join(TPL_ENTRY_AUTHOR[1])

    const body = issues.map(e => TPL_ENTRY_GUESTBOOK[0]
        .replace('{1}', e.author)
        .replace('{2}', `https://github.com/${e.author}`)
        .replace('{3}', e.createdAt.toLocaleDateString('en-US'))
        .replace('{4}', e.text.substring(0, N_CHARS).split('\n').join(' ')))
        .join(TPL_ENTRY_GUESTBOOK[1])

    return TPL_COMBINED
        .replace('{1}', header)
        .replace('{2}', body)
}

async function run() {
    const token = core.getInput('token')
    const nIssues = core.getInput('max_entries')
    const octokit = github.getOctokit(token)
    const context = github.context

    const issues = await getIssues(octokit, context, nIssues)
    const content = issues.length
        ? formatIssues(issues)
        : TPL_PLACEHOLDER
            .replace('{1}', context.repo.owner)
            .replace('{2}', context.repo.repo)
            .replace('{3}', context.repo.owner)

    await updateReadme(token, context, content)
}

run()