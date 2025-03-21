<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./static/browser-use-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="./static/browser-use.png">
  <img alt="Shows a black Browser Use Logo in light color mode and a white one in dark color mode." src="./static/browser-use.png"  width="full">
</picture>

<h1 align="center">browser-use-js 🤖</h1>

[![GitHub stars](https://img.shields.io/github/stars/datvt-pexdia/browser-use-js?style=social)](https://github.com/datvt-pexdia/browser-use-js/stargazers)
[![npm version](https://img.shields.io/npm/v/browser-use-js.svg)](https://www.npmjs.com/package/browser-use-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)](https://www.ecma-international.org/ecma-262/)
[![Playwright](https://img.shields.io/badge/Playwright-1.40+-blue)](https://playwright.dev/)
[![LangChain](https://img.shields.io/badge/LangChain-0.1.9+-green)](https://js.langchain.com/)

🌐 browser-use-js is a JavaScript port of the [original Python project](https://github.com/browser-use/browser-use), making it easy to connect AI agents with web browsers using JavaScript.

# Installation

```bash
# Using npm
npm install

# Install Playwright browsers
npx playwright install
```

Add your API keys to your `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key
```

# Quick Start

```javascript
import { Browser, BrowserConfig, Agent } from "browser-use-js";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const browser = new Browser(
    new BrowserConfig({
      headless: false,
      disableSecurity: true,
    })
  );

  const agent = new Agent({
    task: "Compare the price of gpt-4o and DeepSeek-V3",
    llm: new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.7,
    }),
    browser: browser,
    useVision: true,
  });

  await agent.run();
  await browser.close();
}

main().catch(console.error);
```
