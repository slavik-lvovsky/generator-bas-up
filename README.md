
> uploads extension to BAS

## Installation

First, install [Yeoman](http://yeoman.io) and generator-bas-up using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g yo
npm i -g https://github.com/slavik-lvovsky/generator-bas-up.git
npm i -g puppeteer-page-objects@latest --registry https://nexus.wdf.sap.corp:8443/nexus/content/groups/build.milestones.npm
npm i -g chai
```

To upload your vsix run the following command from an extension directory:

```bash
yo bas-up
```
