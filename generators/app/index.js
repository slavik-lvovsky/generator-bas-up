'use strict';

const Generator = require('yeoman-generator');
const _ = require('lodash');
const uploader = require('./uploader');
const types = require("@sap-devx/yeoman-ui-types");


const basEnvironments = [{
  name: 'CI',
  url: 'https://wingtestsubacc.ci10cf.int.applicationstudio.cloud.sap/index.html'
}, {
  name: 'STAGING',
  url: 'https://wingtestsubacc.stg10cf.int.applicationstudio.cloud.sap/index.html'
}, {
  name: 'CANARY',
  url: 'https://webide.cry10cf.int.applicationstudio.cloud.sap/index.html'
}];

const basicSpace = {
  name: "Basic"
};

const commonDevSpaces = [{
  name: "SAP Fiori"
}, {
  name: "Full Stack Cloud Application"
}, {
  name: "SAP HANA Native Application"
}];

const canaryDevSpaces = [{
  name: "SAP SME Business Application"
}, {
  name: "SAP Mobile Application"
}];

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.setPromptsCallback = fn => {
      if (this.prompts) {
        this.prompts.setCallback(fn);
      }
    };

    const prompts = [{ name: "Environment and Space", description: "Provide BAS environment and dev space name." }];
    this.prompts = new types.Prompts(prompts);
  }

  _getSpaces(envName) {
    return (envName === 'CANARY' ?
      commonDevSpaces.concat(canaryDevSpaces).concat(basicSpace) : commonDevSpaces.concat(basicSpace));
  }

  async prompting() {
    const prompts = [
      {
        name: "env",
        type: "list",
        message: "BAS Environment",
        choices: basEnvironments,
        default: "STAGING"
      }, {
        name: "space",
        type: "list",
        message: "Dev Space Name",
        choices: value => this._getSpaces(value.env),
        default: "SAP Fiori"
      }, {
        name: "headless",
        type: "confirm",
        message: "Do you want to see the progress?",
        default: true
      }
    ];

    this.answers = await this.prompt(prompts);
  }

  async writing() {
    const url = _.find(basEnvironments, { name: this.answers.env }).url;
    const space = this.answers.space;
    const headless = !this.answers.headless;
    await uploader.execute({ url, space, headless });
  }
};
