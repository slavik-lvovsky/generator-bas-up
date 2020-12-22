
> uploads extension to BAS

## Installation

First, install [Yeoman](http://yeoman.io) and generator-bas-up using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
recommended option:
====================
1. npm install -g yo
2. Download https://github.com/slavik-lvovsky/generator-bas-up/blob/master/generator-bas-up-1.0.5.tgz
3. npm i -g generator-bas-up-1.0.5.tgz

 
advanced option:
====================
1. npm install -g yo
2. npm i -g https://github.com/slavik-lvovsky/generator-bas-up.git
3. npm i -g puppeteer-page-objects@latest --registry https://nexus.wdf.sap.corp:8443/nexus/content/groups/build.milestones.npm
4. npm i -g chai
```

To upload your vsix run the following command from an extension directory:

```bash
yo bas-up
```
