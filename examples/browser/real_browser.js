/**
 * Browser-Use Real Browser Example
 * JavaScript ES6 version of real_browser.py
 * 
 * This example demonstrates how to use Browser-Use with a real browser
 * and an AI agent to automate browser tasks.
 */

// Polyfill for Node.js < 18
import { ReadableStream } from 'web-streams-polyfill/dist/ponyfill.js';
import { TextEncoder, TextDecoder } from 'util';

// Add polyfills to global
global.ReadableStream = ReadableStream;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import {
  Browser,
  BrowserConfig,
  Agent,
  Controller
} from '../../browser_use/index.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create browser instance with configuration
const browser = new Browser(
  new BrowserConfig({
    headless: false, // Show the browser
    disableSecurity: true,
    // NOTE: You may need to close your Chrome browser first
    // Uncomment and modify the line below for your OS

    // For Windows
    chromeInstancePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',

    // For macOS
    // chromeInstancePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

    // For Linux
    // chromeInstancePath: '/usr/bin/google-chrome',
  })
);
const task = `
   vào link https://fuse-react-vitejs-demo.fusetheme.com/apps/e-commerce/products/new, nhập dữ liệu sample vào form và submit form. lấy thông tin trang sau khi submit. kết thúc`;
/**
 * Main function to demonstrate browser automation with an AI agent
 */
async function main() {
  try {
    // Import ChatOpenAI dynamically to avoid issues with Node.js 16
    const { ChatOpenAI } = await import('@langchain/openai');

    // console.log(a.withStructuredOutput);process.exit(1);
    // Create a browser context
    const context = await browser.newContext();

    // Create a controller
    const controller = new Controller({ context });
    // Create an agent with a task
    const agent = new Agent({
      task,
      // task: 'Tìm kiếm kênh youtube của công ty Pexdia JSC,  10 video link mới nhất trong list full videos',
      llm: new ChatOpenAI({

        modelName: 'gpt-4o-mini', // Using a model that works better with Node.js 16
        temperature: 1,
      }),
      browser: browser,
      // controller: controller, // Pass the controller explicitly
      // initialActions: [], // Add empty initial actions
      // // Additional settings
      // useVision: false, // Vision may not work well with Node.js 16
      maxActionsPerStep: 1, // Maximum actions per step
      // includeAttributes: [
      //   'title', 'type', 'name', 'role', 'tabindex',
      //   'aria-label', 'placeholder', 'value', 'alt', 'aria-expanded'
      // ],
    });

    // Run the agent
    console.log('Starting agent to complete the task...');
    await agent.run();
    console.log('Final Result:', agent.state.history.finalResult);
    console.log('Success:', agent.state.history.isSuccessful);
    // Close the browser when done
    console.log('Task completed, closing browser...');
    await browser.close();

    // Wait for user input before exiting
    console.log('Press Enter to exit...');
    process.stdin.once('data', () => {
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack trace:', error.stack);

    // Make sure to close the browser even if there's an error
    try {
      await browser.close();
    } catch (e) {
      console.error('Error closing browser:', e);
    }

    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}); 