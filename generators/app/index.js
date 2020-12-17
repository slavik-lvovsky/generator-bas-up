"use strict";

const Generator = require("yeoman-generator");
const _ = require("lodash");
const path = require("path");
const fsextra = require("fs-extra");
const uploader = require("./uploader");
const types = require("@sap-devx/yeoman-ui-types");


const basEnvironments = [{
  name: "CI",
  url: "https://wingtestsubacc.ci10cf.int.applicationstudio.cloud.sap/index.html"
}, {
  name: "STAGING",
  url: "https://wingtestsubacc.stg10cf.int.applicationstudio.cloud.sap/index.html"
}, {
  name: "CANARY",
  url: "https://webide.cry10cf.int.applicationstudio.cloud.sap/index.html"
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
    return envName === "CANARY" ?
      commonDevSpaces.concat(canaryDevSpaces).concat(basicSpace) :
      commonDevSpaces.concat(basicSpace);
  }

  async initializing() {
    try {
      const packageJson = await this._getExtensionPackageJson();
      if (!_.get(packageJson, "engines.vscode")) {
        this.errorMessage = `${this.extensionPath} is not a vscode extension`;
      } else {
        this.extName = packageJson.name;
        this.extVersion = packageJson.version;
        this.vsixPath = path.join(this.extensionPath, `${this.extName}-${this.extVersion}.vsix`);
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
      process.exit(1);
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
      name: "spaceType",
      type: "list",
      message: "Dev Space Type",
      choices: () => this.spaces,
      when: answers => {
        this.spaces = this._getSpaces(answers.env);
        return true;
      },
      guiOptions: {
        applyDefaultWhenDirty: true
      },
      default: "SAP Fiori"
    }, {
      name: "spaceName",
      type: "input",
      message: "Dev Space Name",
      validate: (value) => {
        const isValidName = /^[a-zA-Z0-9][a-zA-Z0-9_]{0,39}$/.test(
          value
        );
        return isValidName ? true : "The name must start with a letter or number and may contain any alphanumeric characters or underscores.Special characters can't be used."
      },
      default: () => {
        const regExp = /[^a-zA-Z0-9]+/g;
        const name = this.extName.replace(regExp, "_");
        const version = this.extVersion.replace(regExp, "");
        return `${name}${version}_${Date.now()}`;
      }
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
    const spaceType = this.answers.spaceType;
    const spaceName = this.answers.spaceName;
    const headless = !this.answers.headless;
    await uploader.execute({ url: this.url, spaceType, spaceName, headless, vsixPath: this.vsixPath });
  }

  end() {
    const vscode = _.get(this.opts, "vscode");
    if (!this.errorMessage && vscode) {
      vscode.env.openExternal(this.url); // TODO: open url of created devspace 
    }
  }
};
