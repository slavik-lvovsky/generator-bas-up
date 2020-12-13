'use strict';

const Generator = require('yeoman-generator');
const _ = require('lodash');
const path = require('path');
const fsextra = require('fs-extra');
const uploader = require('./uploader');
const types = require("@sap-devx/yeoman-ui-types");
const { exit } = require('process');


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

    this.opts = opts;

    this.appWizard = types.AppWizard.create(opts);

    this.extensionPath = _.get(opts, "data.extensionPath", process.cwd());

    this.setPromptsCallback = fn => {
      if (this.prompts) {
        this.prompts.setCallback(fn);
      }
    };

    const prompts = [{ name: "Environment and Space", description: "Provide BAS environment and dev space name." }];
    this.prompts = new types.Prompts(prompts);
  }

  async _getExtensionPackageJson() {
    this.packageJsonPath = path.join(this.extensionPath, "package.json");
    const packageJsonString = await fsextra.readFile(this.packageJsonPath, "utf8");
    return JSON.parse(packageJsonString);
  }

  _getSpaces(envName) {
    return envName === 'CANARY' ?
      commonDevSpaces.concat(canaryDevSpaces).concat(basicSpace) :
      commonDevSpaces.concat(basicSpace);
  }

  async initializing() {
    try {
      const packageJson = await this._getExtensionPackageJson();
      if (!_.get(packageJson, "engines.vscode")) {
        this.errorMessage = `${this.extensionPath} is not a vscode extension`;
      } else {
        const extName = packageJson.name;
        const extVersion = packageJson.version;
        this.vsixPath = path.join(this.extensionPath, `${extName}-${extVersion}.vsix`);
        if (!fsextra.existsSync(this.vsixPath)) {
          this.errorMessage = `${this.vsixPath} was not found`;
        }
      }
    } catch (error) {
      this.errorMessage = `${this.packageJsonPath} was not found`;
    }

    if (this.errorMessage) {
      this.appWizard.showError(this.errorMessage, types.MessageType.prompt);
      this.log.error(this.errorMessage);
      exit(1);
    }
  }

  async prompting() {
    const prompts = [{
      name: "env",
      type: "list",
      message: "BAS Environment",
      choices: basEnvironments,
      store: true,
      validate: () => {
        return this.errorMessage ? false : true;
      }
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
      store: true
    }];

    this.answers = await this.prompt(prompts);
  }

  async writing() {
    this.url = _.find(basEnvironments, { name: this.answers.env }).url;
    const space = this.answers.space;
    const headless = !this.answers.headless;
    await uploader.execute({ url: this.url, space, headless, vsixPath: this.vsixPath });
  }

  end() {
    const vscode = _.get(this.opts, "vscode");
    if (!this.errorMessage && vscode) {
      vscode.env.openExternal(this.url);
    }
  }
};
