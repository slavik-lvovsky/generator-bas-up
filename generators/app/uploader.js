// const pageObjects = require("puppeteer-page-objects");
const puppeteer = require("puppeteer");

exports.execute = async data => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto(data.url);
}