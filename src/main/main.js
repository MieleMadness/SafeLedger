/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const Menu = electron.Menu
const {ipcMain: ipc } = electron

const path = require('path');
const url = require('url');
const vault = require('./vault');
const fs = require('fs');
const utils = require('./utils');
const installCodeManager = require('./installManager/installManager/installCodeManager');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let appDir;
let vaultDir = path.join(app.getAppPath(), '/vaults/');
let installCodeDir;
let currentVault = 'zvault-0.json';

function createWindow () {

  const base = app.getAppPath();
  if (base.includes("SafeLedger-darwin-x64")) {
    // console.log("running mac build");
    appDir = base.split("SafeLedger-darwin-x64");
  } else if (base.includes("SafeLedger-win32-x64")){
    // console.log("running win build");
    appDir = base.split("SafeLedger-win32-x64");
  } else if (base.includes("SafeLedgerPlus")){
    appDir = base.split("SafeLedgerPlus");
  } else {
    appDir = base.split("safe-ledger");
  }
  vaultDir = path.join(appDir[0],'safeledgerdata/');
  installCodeDir = path.join(appDir[0],'safeledgersettings/');


  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1200, height: 770, icon: "pen.ico"});

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
 // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });
  // menu setup
  const name = electron.app.getName()
  const template = [{
      label: "SafeLedger",
      submenu: [
          { label: "Version 1.7"},
          { type: "separator" },
          { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
      ]}, {
      label: "Edit",
      submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:", role: "undo" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:", role: "redo" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:", role: "cut"},
          { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:", role: "copy" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:", role: "paste" }
      ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));


};

// /Volumes/KINGSTON/ZVault-darwin-x64/ZVault.app

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

ipc.on('save', (evt, params) => {
  vault.saveVault(path.join(vaultDir,currentVault), JSON.stringify(params.vaultData), params.cryptoKey)
    .then((val) => {
      if (val === "SUCCESS") {
        mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Save successful'});
      } else {
        mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Save failed'});
      }
    })
    .catch((val) => {
      mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Save failed'})
    });
});

ipc.on('read', (evt, params) => {
  vault.readVault(path.join(vaultDir,params.file),params.cryptoKey)
    .then((val) => {
      mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Load successful.',type:params.type,vaultData:val});
    })
    .catch((val) => mainWindow.webContents.send('result',val));
});

ipc.on('read-vaultlist-init', (evt, params) => {
  // Initalize the vault
  vault.makeDir(vaultDir)
    .then((val) => {
      if (val === "CREATED") {
        // Create the initial Vault list
        vault.initVaultList(vaultDir,params.cryptoKey)
          .then((val) => {
            // Create the initial vault 0 data
            vault.initVaultData(vaultDir,currentVault,params.cryptoKey)
              .then((val) => {
                // load the vault list
                vault.readVaultList(path.join(vaultDir,"vaultlist.json"),params.cryptoKey)
                  .then((val) => {
                    mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Loaded Successfully',type:'vaultlist-init',vaultList:val});
                  })
                  .catch((val) => mainWindow.webContents.send('result',val));
              })
              .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Unable to init vault data'}));
          })
          .catch((val) =>  mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Unable to init vault list'}));
      } else {
        // load the vault list
        vault.readVaultList(path.join(vaultDir,"vaultlist.json"),params.cryptoKey)
          .then((val) => {
            mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Loaded Successfully',type:'vaultlist-init',vaultList:val});
          })
          .catch((val) => mainWindow.webContents.send('result',val));
      }
    })
    .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Unable to access vault list'}));
});

ipc.on('process-vault-list', (evt, params) => {
  let idInfo = null;
  if (params.action === "create") {
    // get vault id
    idInfo = vault.nextVaultFileName(params.vaultList);
    params.vault.id = idInfo.id;
    params.vault.file = idInfo.fileName;
    params.vault.path = vaultDir;
    params.vaultList.vaults.push(params.vault);
    params.vaultList.vaults.sort(utils.compareIgnoreCase);
    params.vaultList.vaultSelected = params.vaultList.vaults.indexOf(params.vault);
  } else if (params.action === "modify") {
  //  console.log("vault " + JSON.stringify(params.vault));
  //  console.log("in modify " +JSON.stringify(params.vaultList));
    const vaults = params.vaultList.vaults;
    for (i = 0; i < vaults.length; i++) {
      if (vaults[i].id == params.vault.id) {
        params.vaultList.vaults[i] = params.vault;
        break;
      }
    }
    params.vaultList.vaults.sort(utils.compareIgnoreCase);
    params.vaultList.vaultSelected = params.vaultList.vaults.indexOf(params.vault);
  }
//  console.log("modified " + JSON.stringify(params.vaultList));
  // save vault list
  vault.saveVault(path.join(vaultDir,"vaultlist.json"), JSON.stringify(params.vaultList),params.cryptoKey)
    .then((val) => {
    //  console.log("val " + val);
      if (params.action === "create") {
        if (val === "SUCCESS") {
      //    console.log("erere " + idInfo.fileName);
          vault.initVaultData(vaultDir,idInfo.fileName,params.cryptoKey)
            .then((val) => {
        //      console.log("val init " + val);
              mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Save successful',type:"vault-create",vaultList:params.vaultList,vaultData:val});
            })
            .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Unable to init vault data'}));
        } else {
          mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Save failed'});
        }
      } else {
        mainWindow.webContents.send('result',{type:"vault-modify",vaultList:params.vaultList,status:'SUCCESS',statusMsg:'Save successful'});
      }
    })
    .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Save failed'}));
});

ipc.on('vault-list-delete', (evt, params) => {
  //console.log("vault-list-delete");
  // save vaultList
  vault.saveVault(path.join(vaultDir,"vaultlist.json"), JSON.stringify(params.vaultList),params.cryptoKey)
    .then((val) => {
      //console.log("save vault list " + val);
      // delete vault file
      vault.deleteVault(path.join(vaultDir,params.fileName))
        .then((val) => {
        //console.log("delete vault " + val);
          if (val === "SUCCESS") {
            mainWindow.webContents.send('result',{type:'vault-delete',status:'SUCCESS',statusMsg:'Delete successful'});
          } else {
            mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Delete failed'});
          }
        })
        .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Delete failed'}));
    })
    .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Delete failed'}));
});

ipc.on('process-group', (evt, params) => {
  //console.log("process-group " + JSON.stringify(params.vaultData));
  vault.saveVault(path.join(vaultDir,params.vaultData.file), JSON.stringify(params.vaultData),params.cryptoKey)
    .then((val) => {
      if (val === "SUCCESS") {
        mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Save successful',type:params.type,vaultData:params.vaultData});
      } else {
        mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Save failed'});
      }
    })
    .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Save failed'}));
});

ipc.on('process-record', (evt, params) => {
  //console.log("process-record");
  vault.saveVault(path.join(vaultDir,params.vaultData.file), JSON.stringify(params.vaultData),params.cryptoKey)
    .then((val) => {
      if (val === "SUCCESS") {
        mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Save successful',type:"record",vaultData:params.vaultData});
      } else {
        mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Save failed'});
      }
    })
    .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Save failed'}));
});

ipc.on('process-rotate-crypto', (evt, params) => {
  //console.log("old key " + params.oldCryptoKey);
  //console.log("new key " + params.newCryptoKey);

  vault.rotateCrypto(vaultDir,params.oldCryptoKey,params.newCryptoKey,params.vaultList)
    .then((val) => {
      if (val.status === "SUCCESS") {
        mainWindow.webContents.send('result-rotate-crypto',val);
      } else {
        mainWindow.webContents.send('result-rotate-crypto',val);
      }
    })
    .catch((val) => mainWindow.webContents.send('result-rotate-crypto',val));

});

ipc.on('check-install-code', (evt, params) => {
  // console.log(" check install code ");
  installCodeManager.checkInstallCode(installCodeDir)
  .then((val) => {
    if (val.status === "SUCCESS") {
      mainWindow.webContents.send('result-check-install-code',{keyStatus:val.status});
    } else {
      mainWindow.webContents.send('result-check-install-code',{status:'ERROR',statusMsg:'Activation code missing',keyCode:val.keyCode,fileCode:val.fileCode});
    }
  })
  .catch((val) => mainWindow.webContents.send('result-check-install-code',{status:'ERROR',statusMsg:'Activation code check error'}));
});

ipc.on('save-install-code', (evt, params) => {
  // console.log(" main save installCode " + params.installCode.key + " " + params.installCode.fileCode);
  installCodeManager.saveInstallCode(path.join(installCodeDir,'installcode.json'),JSON.stringify(params.installCode))
  .then((val) => {
    if (val.status === "SUCCESS") {
      mainWindow.webContents.send('result-save-install-code',{status:val.status,statusMsg:'Activation code saved',keyCode:params.installCode.key});
    } else {
      mainWindow.webContents.send('result-save-install-code',{status:'ERROR',statusMsg:'Activation code save failed',fileCode:params.installCode.fileCode,keyCode:params.installCode.key});
    }
  })
  .catch((val) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:'Activation code save failed'}));
});
