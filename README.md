# readme-guestbook

**A GitHub action that generates a simple guestbook from your repository's issues.**

## Usage
All you need to do is create a workflow file in your repository (under `.github/workflows`), see [example](examples/workflow.yml).

### Inputs
* `max_entries` (**required**): Maximum number of guestbook entries to display. Default `10`.

### Example Usage
```yaml
uses: muety/readme-guestbook@v1.0.0
with:
    token: ${{ secrets.GITHUB_TOKEN }}
    max_entries: 5
```

Note: Issues need to have a title prfixed with `Guestbook:` to be considered

## Development
### Setup
```bash
yarn
```

### Build
```bash
yarn build
```

## License
MIT