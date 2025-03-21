/**
 * Browser-Use Agent GIF
 * JavaScript ES6 version of gif.py
 * 
 * Functions for creating GIFs from agent history
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils.js';

/**
 * Create a GIF from the agent's history with overlaid task and goal text
 * @param {string} task - Task description
 * @param {import('./views.js').AgentHistoryList} history - Agent history
 * @param {Object} options - Options
 * @param {string} [options.outputPath='agent_history.gif'] - Output path
 * @param {number} [options.duration=3000] - Frame duration in ms
 * @param {boolean} [options.showGoals=true] - Whether to show goals
 * @param {boolean} [options.showTask=true] - Whether to show task
 * @param {boolean} [options.showLogo=false] - Whether to show logo
 * @param {number} [options.fontSize=40] - Font size
 * @param {number} [options.titleFontSize=56] - Title font size
 * @param {number} [options.goalFontSize=44] - Goal font size
 * @param {number} [options.margin=40] - Margin
 * @param {number} [options.lineSpacing=1.5] - Line spacing
 * @returns {Promise<void>}
 */
export async function createHistoryGif(
  task,
  history,
  {
    outputPath = 'agent_history.gif',
    duration = 3000,
    showGoals = true,
    showTask = true,
    showLogo = false,
    fontSize = 40,
    titleFontSize = 56,
    goalFontSize = 44,
    margin = 40,
    lineSpacing = 1.5,
  } = {}
) {
  try {
    // Check if history is empty
    if (!history.history || history.history.length === 0) {
      logger.warning('No history to create GIF from');
      return;
    }

    // Check if first screenshot exists
    if (!history.history[0].state.screenshot) {
      logger.warning('No screenshot in first history item to create GIF from');
      return;
    }

    // Try to import the required packages
    let sharp, gifEncoder, canvas;
    try {
      // Dynamic imports to avoid requiring these dependencies if not used
      sharp = (await import('sharp')).default;
      gifEncoder = (await import('gifencoder')).default;
      canvas = await import('canvas');
    } catch (error) {
      logger.error(`Failed to import required packages for GIF creation: ${error.message}`);
      logger.info('Please install the required packages: npm install sharp gifencoder canvas');
      return;
    }

    const { createCanvas, loadImage, registerFont } = canvas;

    // Try to load fonts
    let regularFont, titleFont, goalFont;
    try {
      // Try to register custom fonts
      const fontOptions = ['Helvetica', 'Arial', 'DejaVuSans', 'Verdana'];
      let fontLoaded = false;

      // Get the directory of the current module
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      
      // Check for fonts in the fonts directory
      const fontsDir = path.join(__dirname, '..', '..', 'fonts');
      
      for (const fontName of fontOptions) {
        try {
          let fontPath;
          
          // Check if we're on Windows
          if (process.platform === 'win32') {
            // Try Windows font directory
            const winFontDir = process.env.WIN_FONT_DIR || 'C:\\Windows\\Fonts';
            fontPath = path.join(winFontDir, `${fontName}.ttf`);
          } else {
            // Try common Unix font directories
            const unixFontDirs = [
              '/usr/share/fonts/truetype',
              '/usr/local/share/fonts',
              '/Library/Fonts',
              path.join(process.env.HOME || '', 'Library/Fonts'),
              fontsDir
            ];
            
            for (const dir of unixFontDirs) {
              const testPath = path.join(dir, `${fontName}.ttf`);
              if (fs.existsSync(testPath)) {
                fontPath = testPath;
                break;
              }
            }
          }
          
          if (fontPath && fs.existsSync(fontPath)) {
            registerFont(fontPath, { family: fontName });
            regularFont = `${fontSize}px ${fontName}`;
            titleFont = `${titleFontSize}px ${fontName}`;
            goalFont = `${goalFontSize}px ${fontName}`;
            fontLoaded = true;
            break;
          }
        } catch (e) {
          logger.debug(`Failed to load font ${fontName}: ${e.message}`);
        }
      }
      
      if (!fontLoaded) {
        // Use default fonts if custom fonts can't be loaded
        regularFont = `${fontSize}px sans-serif`;
        titleFont = `${titleFontSize}px sans-serif`;
        goalFont = `${goalFontSize}px sans-serif`;
      }
    } catch (e) {
      logger.warning(`Failed to load fonts: ${e.message}`);
      regularFont = `${fontSize}px sans-serif`;
      titleFont = `${titleFontSize}px sans-serif`;
      goalFont = `${goalFontSize}px sans-serif`;
    }

    // Load logo if requested
    let logo = null;
    if (showLogo) {
      try {
        const logoPath = path.join(__dirname, '..', '..', 'static', 'browser-use.png');
        if (fs.existsSync(logoPath)) {
          logo = await loadImage(logoPath);
          // Resize logo to be small
          const logoHeight = 150;
          const aspectRatio = logo.width / logo.height;
          const logoWidth = Math.round(logoHeight * aspectRatio);
          
          // Create a canvas for the resized logo
          const logoCanvas = createCanvas(logoWidth, logoHeight);
          const logoCtx = logoCanvas.getContext('2d');
          logoCtx.drawImage(logo, 0, 0, logoWidth, logoHeight);
          logo = logoCanvas;
        } else {
          logger.warning(`Logo file not found at ${logoPath}`);
        }
      } catch (e) {
        logger.warning(`Could not load logo: ${e.message}`);
      }
    }

    // Process the first screenshot to get dimensions
    const firstScreenshotBuffer = Buffer.from(history.history[0].state.screenshot.split(',')[1], 'base64');
    const firstImage = await sharp(firstScreenshotBuffer).metadata();
    const { width, height } = firstImage;

    // Create GIF encoder
    const encoder = new gifEncoder(width, height);
    const outputStream = fs.createWriteStream(outputPath);
    encoder.createReadStream().pipe(outputStream);
    encoder.start();
    encoder.setRepeat(0); // 0 = loop forever
    encoder.setDelay(duration); // ms
    encoder.setQuality(10); // 10 = best quality

    // Create canvas for drawing
    const canv = createCanvas(width, height);
    const ctx = canv.getContext('2d');

    // Create task frame if requested
    if (showTask && task) {
      await _createTaskFrame({
        task,
        firstScreenshot: history.history[0].state.screenshot,
        titleFont,
        regularFont,
        logo,
        lineSpacing,
        width,
        height,
        canvas: canv,
        ctx,
        loadImage,
      });
      
      // Add frame to GIF
      encoder.addFrame(ctx);
    }

    // Process each history item
    for (let i = 0; i < history.history.length; i++) {
      const item = history.history[i];
      if (!item.state.screenshot) {
        continue;
      }

      // Convert base64 screenshot to image
      const screenshotBuffer = Buffer.from(item.state.screenshot.split(',')[1], 'base64');
      const img = await loadImage(screenshotBuffer);
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw screenshot
      ctx.drawImage(img, 0, 0, width, height);

      // Add overlay if requested
      if (showGoals && item.modelOutput) {
        await _addOverlayToImage({
          ctx,
          stepNumber: i + 1,
          goalText: item.modelOutput.currentState.nextGoal,
          regularFont,
          titleFont,
          goalFont,
          margin,
          logo,
          width,
          height,
        });
      }

      // Add frame to GIF
      encoder.addFrame(ctx);
    }

    // Finish GIF
    encoder.finish();
    logger.info(`Created GIF at ${outputPath}`);
  } catch (error) {
    logger.error(`Error creating GIF: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
  }
}

/**
 * Create task frame
 * @param {Object} options - Options
 * @param {string} options.task - Task description
 * @param {string} options.firstScreenshot - First screenshot
 * @param {string} options.titleFont - Title font
 * @param {string} options.regularFont - Regular font
 * @param {Object|null} options.logo - Logo
 * @param {number} options.lineSpacing - Line spacing
 * @param {number} options.width - Width
 * @param {number} options.height - Height
 * @param {Object} options.canvas - Canvas
 * @param {Object} options.ctx - Canvas context
 * @param {Function} options.loadImage - Load image function
 * @private
 */
async function _createTaskFrame({
  task,
  firstScreenshot,
  titleFont,
  regularFont,
  logo,
  lineSpacing,
  width,
  height,
  canvas,
  ctx,
  loadImage,
}) {
  // Clear canvas and fill with black
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Calculate vertical center of image
  const centerY = height / 2;

  // Draw task text with increased font size
  const margin = 140; // Increased margin
  const maxWidth = width - (2 * margin);
  
  // Parse font size from regularFont
  const fontSizeMatch = regularFont.match(/(\d+)px/);
  const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 40;
  
  // Create larger font
  const largerFont = regularFont.replace(/\d+px/, `${fontSize + 16}px`);
  ctx.font = largerFont;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  
  // Wrap text
  const wrappedText = _wrapText(ctx, task, maxWidth);
  
  // Calculate line height with spacing
  const lineHeight = (fontSize + 16) * lineSpacing;
  
  // Split text into lines
  const lines = wrappedText.split('\n');
  const totalHeight = lineHeight * lines.length;
  
  // Start position for first line
  let textY = centerY - (totalHeight / 2) + 50; // Shifted down slightly
  
  // Draw each line
  for (const line of lines) {
    ctx.fillText(line, width / 2, textY);
    textY += lineHeight;
  }
  
  // Add logo if provided (top right corner)
  if (logo) {
    const logoMargin = 20;
    const logoX = width - logo.width - logoMargin;
    ctx.drawImage(logo, logoX, logoMargin);
  }
}

/**
 * Add overlay to image
 * @param {Object} options - Options
 * @param {Object} options.ctx - Canvas context
 * @param {number} options.stepNumber - Step number
 * @param {string} options.goalText - Goal text
 * @param {string} options.regularFont - Regular font
 * @param {string} options.titleFont - Title font
 * @param {string} options.goalFont - Goal font
 * @param {number} options.margin - Margin
 * @param {Object|null} options.logo - Logo
 * @param {number} options.width - Width
 * @param {number} options.height - Height
 * @param {boolean} [options.displayStep=true] - Whether to display step
 * @param {string} [options.textColor='rgba(255,255,255,1)'] - Text color
 * @param {string} [options.textBoxColor='rgba(0,0,0,0.7)'] - Text box color
 * @private
 */
async function _addOverlayToImage({
  ctx,
  stepNumber,
  goalText,
  regularFont,
  titleFont,
  goalFont,
  margin,
  logo,
  width,
  height,
  displayStep = true,
  textColor = 'rgba(255,255,255,1)',
  textBoxColor = 'rgba(0,0,0,0.7)',
}) {
  // Set up for drawing text
  ctx.textBaseline = 'top';
  
  if (displayStep) {
    // Add step number (bottom left)
    const stepText = stepNumber.toString();
    ctx.font = titleFont;
    
    // Measure text
    const stepMetrics = ctx.measureText(stepText);
    const stepWidth = stepMetrics.width;
    const stepHeight = stepMetrics.actualBoundingBoxAscent + stepMetrics.actualBoundingBoxDescent;
    
    // Position step number in bottom left
    const xStep = margin + 10; // Slight additional offset from edge
    const yStep = height - margin - stepHeight - 10; // Slight offset from bottom
    
    // Draw rounded rectangle background for step number
    const padding = 20; // Increased padding
    _drawRoundedRect(
      ctx,
      xStep - padding,
      yStep - padding,
      stepWidth + padding * 2,
      stepHeight + padding * 2,
      15,
      textBoxColor
    );
    
    // Draw step number
    ctx.fillStyle = textColor;
    ctx.fillText(stepText, xStep, yStep);
  }
  
  // Draw goal text (centered, bottom)
  ctx.font = goalFont;
  const maxWidth = width - (4 * margin);
  const wrappedGoal = _wrapText(ctx, goalText, maxWidth);
  
  // Measure wrapped text
  const lines = wrappedGoal.split('\n');
  let goalHeight = 0;
  let goalWidth = 0;
  
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    const lineWidth = metrics.width;
    const lineHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    goalHeight += lineHeight * 1.2; // Add some line spacing
    goalWidth = Math.max(goalWidth, lineWidth);
  }
  
  // Center goal text horizontally, place at bottom
  const xGoal = (width - goalWidth) / 2;
  const yGoal = height - margin - goalHeight - 100; // Position above step number
  
  // Draw rounded rectangle background for goal
  const paddingGoal = 25; // Increased padding for goal
  _drawRoundedRect(
    ctx,
    xGoal - paddingGoal,
    yGoal - paddingGoal,
    goalWidth + paddingGoal * 2,
    goalHeight + paddingGoal * 2,
    15,
    textBoxColor
  );
  
  // Draw goal text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  
  let currentY = yGoal;
  for (const line of lines) {
    ctx.fillText(line, xGoal, currentY);
    const metrics = ctx.measureText(line);
    const lineHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    currentY += lineHeight * 1.2;
  }
  
  // Add logo if provided (top right corner)
  if (logo) {
    const logoMargin = 20;
    const logoX = width - logo.width - logoMargin;
    ctx.drawImage(logo, logoX, logoMargin);
  }
}

/**
 * Draw rounded rectangle
 * @param {Object} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} radius - Corner radius
 * @param {string} fill - Fill color
 * @private
 */
function _drawRoundedRect(ctx, x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * Wrap text to fit within a given width
 * @param {Object} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in pixels
 * @returns {string} Wrapped text with newlines
 * @private
 */
function _wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = [];
  
  for (const word of words) {
    currentLine.push(word);
    const line = currentLine.join(' ');
    const metrics = ctx.measureText(line);
    const lineWidth = metrics.width;
    
    if (lineWidth > maxWidth) {
      if (currentLine.length === 1) {
        // If a single word is too long, keep it but move to next line
        lines.push(currentLine[0]);
        currentLine = [];
      } else {
        // Remove the last word and add the line
        currentLine.pop();
        lines.push(currentLine.join(' '));
        currentLine = [word];
      }
    }
  }
  
  // Add the last line
  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '));
  }
  
  return lines.join('\n');
} 