class Issue {
    constructor(title, text, author, authorAvatar, createdAt) {
        this.title = title
        this.text = text
        this.author = author
        this.authorAvatar = authorAvatar
        this.createdAt = new Date(createdAt)
    }

    toString() {
        return `${this.author} on ${this.createdAt}: ${this.text}`
    }
}

module.exports = Issue