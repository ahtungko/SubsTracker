import themeResourcesHtml from './theme-resources.html';
import { buildBrowserLocaleResources } from './browser-locale-resources.js';
import loginPageHtml from './loginPage.html';
import adminPageHtml from './adminPage.html';
import configPageHtml from './configPage.html';
import dashboardPageHtml from './dashboardPage.html';
import notifyLogsPageHtml from './notifyLogsPage.html';

const sharedResources = themeResourcesHtml + '\n' + buildBrowserLocaleResources();

function injectTheme(html) {
  return html.replace(/\$\{themeResources\}/g, sharedResources);
}

const loginPage = injectTheme(loginPageHtml);
const adminPage = injectTheme(adminPageHtml);
const configPage = injectTheme(configPageHtml);
const notifyLogsPage = injectTheme(notifyLogsPageHtml);

function dashboardPage() {
  return injectTheme(dashboardPageHtml);
}

export { loginPage, adminPage, configPage, dashboardPage, notifyLogsPage };
