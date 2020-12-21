"use strict";

const Generator = require("yeoman-generator");
const _ = require("lodash");
const path = require("path");
const fsextra = require("fs-extra");
const uploader = require("./uploader");
const types = require("@sap-devx/yeoman-ui-types");
const BottomBar = require("inquirer/lib/ui/bottom-bar");


const BAS_ENVIRONMENTS = [{
  name: "CI",
  url: "https://wingtestsubacc.ci10cf.int.applicationstudio.cloud.sap/index.html"
}, {
  name: "STAGING",
  url: "https://wingtestsubacc.stg10cf.int.applicationstudio.cloud.sap/index.html"
}, {
  name: "CANARY",
  url: "https://webide.cry10cf.int.applicationstudio.cloud.sap/index.html"
}];

const BASIC_SPACE = {
  name: "Basic"
};

const COMMON_DEV_SPACES = [{
  name: "SAP Fiori"
}, {
  name: "Full Stack Cloud Application"
}, {
  name: "SAP HANA Native Application"
}];

const CANARY_DEV_SPACES = [{
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
    return COMMON_DEV_SPACES.concat(envName === "CANARY" ? CANARY_DEV_SPACES : []).concat(BASIC_SPACE);
  }

  async initializing() {
    try {
      const packageJson = await this._getExtensionPackageJson();
      if (!_.get(packageJson, "engines.vscode")) {
        this.errorMessage = `${this.extensionPath} is not a vscode extension`;
      } else {
        this.extName = packageJson.name;
        this.extVersion = packageJson.version;
        this.vsixName = `${this.extName}-${this.extVersion}.vsix`;
        this.vsixPath = path.join(this.extensionPath, this.vsixName);
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
      choices: BAS_ENVIRONMENTS,
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
      name: "username",
      type: "input",
      message: "User Name",
      store: true
    }, {
      name: "password",
      type: "password",
      message: "Password",
      mask: true,
      store: true
    }];

    this.answers = await this.prompt(prompts);
  }

  async writing() {
    // const loader = ['/ ', '| ', '\\ ', '- '];
    // let i = 4;
    // const ui = new BottomBar({ bottomBar: loader[i % 4] });

    // this.intervalId = setInterval(() => {
    //   ui.updateBottomBar(loader[i++ % 4]);
    // }, 100);

    this.url = _.find(BAS_ENVIRONMENTS, { name: this.answers.env }).url;
    const spaceType = this.answers.spaceType;
    const spaceName = this.answers.spaceName;
    const username = this.answers.username;
    const password = this.answers.password;
    const before = Date.now();
    this.targetUrl = await uploader.execute({
      url: this.url, spaceType, spaceName,
      vsix: {
        path: this.vsixPath, name: this.vsixName
      }, username, password
    });
    const after = Date.now();
    this.uploadTime = after - before;
    // clearInterval(this.intervalId);
  }

  end() { 
    const line = "-".repeat(_.size(this.targetUrl));
    this.log(`Uploaded in just: ${this.uploadTime} millis`);
    this.log(line);
    this.log(this.targetUrl);
    this.log(line);

    const vscode = _.get(this.opts, "vscode");
    if (vscode) {
      vscode.env.openExternal(this.targetUrl);
    }
  }
};

