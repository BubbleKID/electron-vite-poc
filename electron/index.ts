// Native
import { join } from 'path';

// Packages
import { BrowserWindow, BrowserView, app, ipcMain, IpcMainEvent } from 'electron';
import isDev from 'electron-is-dev';

const height = 1200;
const width = 1600;

function createWindow() {
  // Create the browser window.
  const window = new BrowserWindow({
    width,
    height,
    //  change to false to use AppBar
    frame: true,
    show: true,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      nodeIntegration: true,
      preload: join(__dirname, 'preload.js')
    }
  });

  const port = process.env.PORT || 3000;
  const url = isDev ? `http://localhost:${port}` : join(__dirname, '../src/out/index.html');

  const chatGptView = new BrowserView()
    window.addBrowserView(chatGptView)
    chatGptView.setBounds({ x: 0, y: 480, width: 800, height: 720 })
    chatGptView.webContents.loadURL('https://chat.openai.com/')

  const webContents  = chatGptView.webContents;
  webContents.openDevTools(); 
  
  const bardView = new BrowserView()
    window.addBrowserView(bardView)
    bardView.setBounds({ x: 800, y: 480, width: 800, height: 720 })
    bardView.webContents.loadURL('https://bard.google.com/')
  const BwebContents  = bardView.webContents;
  BwebContents.openDevTools(); 
  // and load the index.html of the app.
  if (isDev) {
    window?.loadURL(url);
  } else {
    window?.loadFile(url);
  }
  // Open the DevTools.
  // window.webContents.openDevTools();

  // For AppBar
  ipcMain.on('minimize', () => {
    // eslint-disable-next-line no-unused-expressions
    window.isMinimized() ? window.restore() : window.minimize();
    // or alternatively: win.isVisible() ? win.hide() : win.show()
  });
  ipcMain.on('maximize', () => {
    // eslint-disable-next-line no-unused-expressions
    window.isMaximized() ? window.restore() : window.maximize();
  });

  ipcMain.on('close', () => {
    window.close();
  });

  // @ts-ignore: TS6133
  ipcMain.on('send-to-chatgpt', (event, text) => {
    let script = `
        let textarea = document.querySelector('#prompt-textarea');
        if (textarea) {
            // Set the value as if typed by a user
            const text = '${text.replace(/'/g, "\\'")}';
            for (let i = 0; i < text.length; i++) {
                textarea.value += text[i];
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Dispatch a 'change' event
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }

        let sendButton = document.querySelector('[data-testid="send-button"]');
        if (sendButton) {
            setTimeout(() => {
              sendButton.click();
            }, 100);
        }
    `;
    chatGptView.webContents.executeJavaScript(script);
  });


  // @ts-ignore: TS6133
  ipcMain.on('send-to-bard', (event, text) => {
    let script = `
        let richTextArea = document.querySelector('.text-input-field_textarea'); // Replace with the actual selector
        let sendButton = document.querySelector('[aria-label="Send message"]');

        if (richTextArea) {
            // Focus the rich text editor
            richTextArea.focus();

            // Simulate typing
            const text = '${text.replace(/'/g, "\\'")}';
            document.execCommand('insertText', false, text);

            // Alternatively, if execCommand doesn't work, you might need to directly manipulate the innerHTML or textContent
            // richTextArea.innerHTML = text; // Use with caution, and only if other methods fail

            // Trigger any necessary events (input, keyup, change, etc.)
            richTextArea.dispatchEvent(new Event('input', { bubbles: true }));
            richTextArea.dispatchEvent(new Event('keyup', { bubbles: true, key: 'Enter' }));
            richTextArea.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Wait for a brief moment to allow any UI updates
        setTimeout(() => {
            if (sendButton && !sendButton.disabled) {
                sendButton.click();
            }
        }, 100);
    `;
    bardView.webContents.executeJavaScript(script);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// @ts-ignore: TS6133
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url === 'https://chat.openai.com/') { // Replace with your URL
        event.preventDefault();
        callback(true); // Ignore certificate errors
    } else {
        callback(false); // Handle other URLs normally
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// listen the channel `message` and resend the received message to the renderer process
ipcMain.on('message', (event: IpcMainEvent, message: any) => {
  console.log(message);
  setTimeout(() => event.sender.send('message', 'hi from electron'), 500);
});
