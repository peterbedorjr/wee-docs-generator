#!/usr/bin/env node

require('dotenv').config();

const argv = require('yargs').argv
const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const marked = require('marked');
const algoliasearch = require('algoliasearch');
const slugify = require('./slugify');

const algoliaAppId = process.env.ALGOLIA_APP_ID;
const algoliaSecret = process.env.ALGOLIA_SECRET;

const client = algoliasearch(algoliaAppId, algoliaSecret);
const indexes = {
    v3: client.initIndex('v3'),
    v4: client.initIndex('v4'),
};
const basePath = path.resolve(process.cwd());
const version = argv.v === 4 ? 'v4' : 'v3';
const files = glob.sync(path.resolve(basePath, version, '**/*.md'));


/**
 * Get the slug from the file name
 *
 * @param {String} path
 * @param {String} id
 */
const getSlugFromFile = (path, id = '') => {
    let url = path.replace(basePath, '').replace('.md', '').replace('README', '');

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

            if (! index[slug]) {
                index[slug] = {slug, title: '', body: ''};
            } else if (index[slug].body) {
                index[slug].body += '\n' + (token.text || '');
            } else {
                index[slug].body = token.text;
            }
        }
    });
}

fs.writeJsonSync(path.resolve(basePath, 'indexes', `${version}.json`), Object.values(index));

indexes[version].clearIndex(() => {
    indexes[version].addObjects(Object.values(index));
});

