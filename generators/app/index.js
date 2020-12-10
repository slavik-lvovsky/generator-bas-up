'use strict';
const Generator = require('yeoman-generator');
const puppeteer = require('puppeteer');
const _ = require('lodash');


const basEnvironments = [{
  name: 'CI',
  value: 'CI',
  url: 'https://wingtestsubacc.ci10cf.int.applicationstudio.cloud.sap/index.html'
}, {
  name: 'STAGING',
  value: 'STAGING',
  url: 'https://wingtestsubacc.stg10cf.int.applicationstudio.cloud.sap/index.html'
}, {
  name: 'CANARY',
  value: 'CANARY',
  url: 'https://webide.cry10cf.int.applicationstudio.cloud.sap/index.html'
}];

const basicSpace = {
  name: "Basic",
  value: "Basic"
};

const commonDevSpaces = [{
  name: "SAP Fiori",
  value: "SAP Fiori"
}, {
  name: "Full Stack Cloud Application",
  value: "Full Stack Cloud Application"
}, {
  name: "SAP HANA Native Application",
  value: "SAP HANA Native Application"
}];

const canaryDevSpaces = [{
  name: "SAP SME Business Application",
  value: "SAP SME Business Application"
}, {
  name: "SAP Mobile Application",
  value: "SAP Mobile Application"
}];

module.exports = class extends Generator {
  _getSpaces(envName) {
    return (envName === 'CANARY' ?
      commonDevSpaces.concat(canaryDevSpaces).concat(basicSpace) : commonDevSpaces.concat(basicSpace));
  }

  async prompting() {
    const prompts = [
      {
        name: "env",
        type: "list",
        message: "BAS Target Environment",
        choices: basEnvironments,
        default: "STAGING"
      }, {
        name: "space",
        type: "list",
        message: "Space Type",
        choices: value => this._getSpaces(_.get(value, "env")),
        default: "Full Stack Cloud Application"
      }
    ];

    this.answers = await this.prompt(prompts);
  }

  async writing() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const url = _.find(basEnvironments, { name: this.answers.env }).url;
    const space = this.answers.space;
    await page.goto(url);
  }
};
