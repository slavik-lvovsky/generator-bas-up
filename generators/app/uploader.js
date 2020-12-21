"use strict";

const puppeteer = require("puppeteer");
const LoginPage = require("puppeteer-page-objects/common/pageObjects/Login/LoginPage");
const DevSpacesPage = require("puppeteer-page-objects/common/pageObjects/DevSpaces/DevSpacesPage");
const TheiaPage = require("puppeteer-page-objects/common/pageObjects/Theia/TheiaPage");

exports.execute = async data => {
    const webIdeUrl = data.url;
    const dsName = data.spaceName;
    const dsTypeName = data.spaceType;
    const username = data.username; 
    const password = data.password; 

    const browser = await puppeteer.launch({
        slowMo: 40,
        defaultViewport: null,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--start-maximized", "--ignore-certificate-errors", "--window-size=1920,1080"]
    });
    const page = await new LoginPage().loginAndNavigate(browser, webIdeUrl, username, password);

    await page.goto(webIdeUrl);
    const devSpacesPage = new DevSpacesPage();
    await devSpacesPage.deleteDevSpaceIfMaxRunning(page);
    await devSpacesPage.navigateToCreateNewDevSpace(page)
    await devSpacesPage.insertNewDevSpaceName(page, dsName);
    await devSpacesPage.selectDevSpaceType(page, dsTypeName);
    await devSpacesPage.createNewDevSpace(page);
    await devSpacesPage.waitForDevSpaceRunningStatus(page, dsName);
    await devSpacesPage.enterDevSpace(page, dsName);
    const theiaPage = new TheiaPage();
    await theiaPage.waitforTheiaToLoad(page);
    await theiaPage.openWorkSpaceFolderDialog(page);
    await theiaPage.openWorkspace(page, "user");
    await theiaPage.createFolder(page, "default-plugins");
    await theiaPage.selectNode(page, "default-plugins", "", true, "/home/user");

    const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        theiaPage.goThroughMenubarItemsAndSelect(page, ["File", "Upload Files..."])
    ]);

    await fileChooser.accept([data.vsixPath]);
    await theiaPage.checkNotificationText(page, "Uploading Files...: 0 out of 1");
    await page.waitFor(10000);
    await page.goto(data.url);
    await devSpacesPage.stopDevSpace(page, dsName);
    await devSpacesPage.waitForDevSpaceStoppedStatus(page, dsName, 1000000);
    await devSpacesPage.startDevSpace(page, dsName);
    await devSpacesPage.waitForDevSpaceStartingStatus(page, dsName, 1000000);
    await devSpacesPage.waitForDevSpaceRunningStatus(page, dsName, 1000000);

    await devSpacesPage.enterDevSpace(page, dsName);
    await theiaPage.waitForTheiaToBeVisible(page);
}
