const fs = require('fs-extra');
const glob = require('glob');
const marked = require('marked');
const slugify = require('./slugify');

const version = process.argv.length === 3 ? process.argv[2] : 'v4';

console.log(version);

const files = glob.sync(`./docs/${version}/**/*.md`);

const getSlugFromFile = (path, id = '') => {
    let url = path.replace('./docs', '').replace('.md', '').replace('README', '');

    if (id) {
        url += `?id=${id}`;
    }

    return url;
};

const index = {};

for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const content = fs.readFileSync(file, 'utf-8');
    const tokens = marked.lexer(content);
    let slug;

    tokens.forEach(token => {
        if (token.type === 'heading' && token.depth <= 2) {
            slug = getSlugFromFile(file, slugify(token.text));
            index[slug] = {slug, title: token.text, body: ''};
        } else {
            if (! slug) {
                return;
            }

            if ( !index[slug]) {
                index[slug] = {slug, title: '', body: ''};
            } else if (index[slug].body) {
                index[slug].body += '\n' + (token.text || '');
            } else {
                index[slug].body = token.text;
            }
        }
    });
}

fs.writeJsonSync(`./indexes/${version}.json`, Object.values(index), 'utf-8');

