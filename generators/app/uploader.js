"use strict";

const puppeteer = require("puppeteer");
const LoginPage = require("puppeteer-page-objects/common/pageObjects/Login/LoginPage");
const DevSpacesPage = require("puppeteer-page-objects/common/pageObjects/DevSpaces/DevSpacesPage");
const TheiaPage = require("puppeteer-page-objects/common/pageObjects/Theia/TheiaPage");

const DEFAULT_PLUGINS = "default-plugins";
const USER = "user";
const HOME_USER = `/home/${USER}`;

exports.execute = async (data, gen) => {
    const webIdeUrl = data.url;
    const dsName = data.spaceName;
    let dsTypeName = data.spaceType;
    const username = data.username;
    const password = data.password;
    const vsixPath = data.vsix.path;
    const vsixName = data.vsix.name;

    if (dsTypeName === "SAP Mobile Application") {
        dsTypeName = "SAP Mobile Services";
    } else if (dsTypeName === "Full Stack Cloud Application") {
        dsTypeName = "SAP Cloud Business Application";
    } else if (dsTypeName === "SAP HANA Native Application") {
        dsTypeName = "SAP Hana";
    }

    gen.log("\n\n\n");
    gen.log("1 of 6 ==> logging in...");
    const browser = await puppeteer.launch({
        headless: true,
        slowMo: 30,
        defaultViewport: null,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--start-maximized", "--ignore-certificate-errors", "--window-size=1920,1080"]
    });
    const page = await new LoginPage().loginAndNavigate(browser, webIdeUrl, username, password);
    await page.goto(webIdeUrl);

    gen.log("2 of 6 ==> creating a new dev space...");
    const devSpacesPage = new DevSpacesPage();
    await devSpacesPage.deleteDevSpaceIfMaxRunning(page);
    await devSpacesPage.navigateToCreateNewDevSpace(page)
    await devSpacesPage.insertNewDevSpaceName(page, dsName);
    await devSpacesPage.selectDevSpaceType(page, dsTypeName);
    await devSpacesPage.createNewDevSpace(page);
    await devSpacesPage.waitForDevSpaceRunningStatus(page, dsName);

    gen.log("3 of 6 ==> navigating to the dev space...");
    await devSpacesPage.enterDevSpace(page, dsName);
    const theiaPage = new TheiaPage();
    await theiaPage.waitforTheiaToLoad(page);
    await theiaPage.openWorkSpaceFolderDialog(page);
    await theiaPage.openWorkspace(page, USER);

    gen.log("4 of 6 ==> uploading the extension vsix...");
    await theiaPage.createFolder(page, DEFAULT_PLUGINS);
    await theiaPage.selectNode(page, DEFAULT_PLUGINS, "", true, HOME_USER);
    const targetUrl = page._target._targetInfo.url;
    const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        theiaPage.goThroughMenubarItemsAndSelect(page, ["File", "Upload Files..."])
    ]);
    await fileChooser.accept([vsixPath]);
    await theiaPage.selectNode(page, `${DEFAULT_PLUGINS}/${vsixName}`, "", false, HOME_USER);

    gen.log("5 of 6 ==> stopping the dev space...");
    await page.goto(data.url);
    await devSpacesPage.stopDevSpace(page, dsName);
    await devSpacesPage.waitForDevSpaceStoppedStatus(page, dsName, 1000000);

    gen.log("6 of 6 ==> starting the dev space...");
    await devSpacesPage.startDevSpace(page, dsName);
    await devSpacesPage.waitForDevSpaceStartingStatus(page, dsName, 1000000);
    await devSpacesPage.waitForDevSpaceRunningStatus(page, dsName, 1000000);

    await browser.close();
    gen.log("Ready!!!\n\n\n");
    return targetUrl;
}
