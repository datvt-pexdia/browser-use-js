<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./static/browser-use-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="./static/browser-use.png">
  <img alt="Shows a black Browser Use Logo in light color mode and a white one in dark color mode." src="./static/browser-use.png"  width="full">
</picture>

<h1 align="center">browser-use-js 🤖</h1>

[![GitHub stars](https://img.shields.io/github/stars/gregpr07/browser-use?style=social)](https://github.com/gregpr07/browser-use/stargazers)

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
