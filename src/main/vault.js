/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const fs = require('fs')
const path = require('path')
const crypto = require('crypto');
const encryption = require('./encryption');

const logError = (err) => { err && console.error(err) }

exports.saveVault = (vaultFile, jsonString, myCryptKey) => {
  return getSaveVault(vaultFile, jsonString, myCryptKey);
};

const getSaveVault = (vaultFile, jsonString, myCryptKey) => {
  return new Promise((resolve,reject) => {
    // encrypt here
    const result = encryption.encrypt(myCryptKey, jsonString);
    // save file
    fs.writeFile(vaultFile, result, (err, data) => {
      // console.log("Save Vault Error " + err);
      if(err){
        reject("Could not write file");
      } else {
        resolve("SUCCESS");
      }
    });
  });
};

exports.deleteVault = (vaultFile) => {
  return new Promise((resolve,reject) => {
    // delete file
    if (fs.existsSync(vaultFile)) {
      fs.unlink(vaultFile, (err) => {
        // console.log("Delete Vault Error " + err);
        if(err){
          reject("Could not delete file");
        } else {
          resolve("SUCCESS");
        }
      });
    } else {
      reject("File does not exist!");
    }
  });
};

exports.readVaultList = (vaultListFile, myCryptKey) => {
  return new Promise((resolve,reject) => {
    fs.readFile(vaultListFile, 'utf-8', (err, data) => {
      if(err){
        reject({status:"ERROR",statusMsg:"Could not read list file",type:"password-failed"});
      } else {
        // decrypt here
        try {
          const result = encryption.decrypt(myCryptKey, data);
          let x = JSON.parse(result);
          resolve(x);
        } catch (err) {
          reject({status:"ERROR",statusMsg:"Invalid Password",type:"password-failed"});
        }
      }
    });
  });
};

exports.readVault = (vaultFile, myCryptKey) => {
  return new Promise((resolve,reject) => {
    fs.readFile(vaultFile, 'utf-8', (err, data) => {
      if(err){
        reject({status:"ERROR",statusMsg:"Could not read file"});
      } else {
        try {
          const result = encryption.decrypt(myCryptKey, data);
          let x = JSON.parse(result);
          resolve(x);
        } catch (err) {
          reject({status:"ERROR",statusMsg:"Invalid Password"});
        }
      }
    });
  });
};

exports.makeDir = (vaultPath) => {
  return new Promise((resolve,reject) => {
    fs.stat(vaultPath, (err, stats) => {
      if (err && err.code !== 'ENOENT') {
        reject("Directory or Permission issue");
      } else if (err || !stats.isDirectory()) {
        fs.mkdir(vaultPath, logError);
        resolve("CREATE");
      } else {
        if (!fs.existsSync(path.join(vaultPath, 'vaultlist.json'))) {
          resolve("CREATE");
        }
        resolve("EXISTS");
      }
    });
  });
};

exports.initVaultList = (vaultPath, myCryptKey) => {
  return new Promise((resolve,reject) => {
    let vaultList = {
      vaults:[
        {name:"Initial Profile",
        path:"",
        created:"",
        id:0,
        file:"zvault-0.json",
        password:"",
        usePass:false,
        encryptkey:"",
        encrypted:false
        }
      ]
    };
    vaultList.vaults[0].created = Date();
    vaultList.vaults[0].path = vaultPath;
    // encrypt here
    const result = encryption.encrypt(myCryptKey, JSON.stringify(vaultList));
    // save file
    fs.writeFile(path.join(vaultPath, 'vaultlist.json'), result, (err, data) => {
        if(err){
          reject("Save profile list failed");
        } else {
          resolve("SUCCESS");
        }
    });
  });
};

exports.initVaultData = (vaultPath, vaultName, myCryptKey) => {
  return new Promise((resolve,reject) => {
    const today = Date();
    // console.log("init vault data");
    let initData = { file:vaultName,
      groups: [
        {name:"BreadWallet",created:today,
          records:[
            {name:"Bitcoin",created:today,symbol:"BTC"}
          ]},
        {name:"Electrum",created:today,
          records:[
            {name:"Bitcoin",created:today,symbol:"BTC"}
          ]},
        {name:"Exodus",created:today,
          records:[
            {name:"0x",created:today,symbol:"ZRX"},
            {name:"Aragon",created:today,symbol:"Ant"},
            {name:"Augur",created:today,symbol:"REP"},
            {name:"Bancor",created:today,symbol:"BNT"},
            {name:"Basic Attention Token",created:today,symbol:"BAT"},
            {name:"Bitcoin",created:today,symbol:"BTC"},
            {name:"Bitcoin Cash",created:today,symbol:"BCH"},
            {name:"Bitcoin Gold",created:today,symbol:"BTG"},
            {name:"Civic",created:today,symbol:"CVC"},
            {name:"Dash",created:today,symbol:"DASH"},
            {name:"Decred",created:today,symbol:"DCR"},
            {name:"District0x",created:today,symbol:"DNT"},
            {name:"Edgeless",created:today,symbol:"EDG"},
            {name:"EOS",created:today,symbol:"EOS"},
            {name:"Ethereum",created:today,symbol:"ETH"},
            {name:"FirstBlood",created:today,symbol:"1ST"},
            {name:"FunFair",created:today,symbol:"FUN"},
            {name:"Gnosis",created:today,symbol:"GNO"},
            {name:"Golem",created:today,symbol:"GNT"},
            {name:"iExec RLC",created:today,symbol:"RLC"},
            {name:"Litecoin",created:today,symbol:"LTC"},
            {name:"Matchpool",created:today,symbol:"GUP"},
            {name:"Numeraire",created:today,symbol:"NMR"},
            {name:"OmiseGO",created:today,symbol:"OMG"},
            {name:"SALT",created:today,symbol:"SALT"},
            {name:"Status",created:today,symbol:"TM-STATUS"},
            {name:"WeTrust",created:today,symbol:"TRST"},
            {name:"Wings",created:today,symbol:"WINGS"}
          ]},
        {name:"Jaxx",created:today,
            records:[
              {name:"Bitcoin",created:today,symbol:"BTC"},
              {name:"Ethereum",created:today,symbol:"ETH"},
              {name:"Litecoin",created:today,symbol:"LTC"},
              {name:"Dash",created:today,symbol:"DASH"}
            ]},
        {name:"Ledger Nano S",created:today,
          records:[
            {name:"Ark",created:today,symbol:"ARK"},
            {name:"Bitcoin",created:today,symbol:"BTC"},
            {name:"Bitcoin Cash",created:today,symbol:"BCH"},
            {name:"Dash",created:today,symbol:"DASH"},
            {name:"Dogecoin",created:today,symbol:"DOGE"},
            {name:"Ethereum",created:today,symbol:"ETH"},
            {name:"Ethereum Classic",created:today,symbol:"ETC"},
            {name:"Expanse",created:today,symbol:"EXP"},
            {name:"Komodo",created:today,symbol:"KMD"},
            {name:"Litecoin",created:today,symbol:"LTC"},
            {name:"PIVX",created:today,symbol:"PIVX"},
            {name:"PoSW",created:today,symbol:"POSW"},
            {name:"Ripple",created:today,symbol:"RPL"},
            {name:"Stratis",created:today,symbol:"STRAT"},
            {name:"Ubiq",created:today,symbol:"UBQ"},
            {name:"Viacoin",created:today,symbol:"VIA"},
            {name:"Vertcoin",created:today,symbol:"VTC"},
            {name:"Zcash",created:today,symbol:"ZEC"}
          ]},
        {name:"LoafWallet",created:today,
          records:[
            {name:"Litecoin",created:today,symbol:"LTC"}
          ]}
      ]
    };
  //  console.log("init vault data " + vaultName);
  // encrypt here
  const result = encryption.encrypt(myCryptKey, JSON.stringify(initData));
    // save file
    fs.writeFile(path.join(vaultPath, vaultName), result, (err, data) => {
      //console.log("Error " + err);
        if(err){
          reject("Init Failed");
        } else {
          resolve(initData);
        }
    });
  });
};

exports.nextVaultFileName = (vaultList) => {
  return getNextVaultFileName(vaultList);
};

const getNextVaultFileName = (vaultList) => {
  const vaults = vaultList.vaults;
  let ids = [];
  for (let vault of vaults) {
    ids.push(vault.id);
  }
  let highest = Math.max(...ids) + 1;
  return {id:highest,fileName:"zvault-"+highest+".json"};
};

exports.rotateCrypto = (vaultPath,oldCryptoKey,newCryptoKey,vaultList) => {
  return new Promise((resolve,reject) => {
    let errorStatus = false;
    let newFileNames = [];
    // rotate each vault
    let vaults = vaultList.vaults;
    let promises = [];
    const nextVaultName = getNextVaultFileName(vaultList);
    // save each vault with new crypto
    for (let vault of vaultList.vaults) {
        // console.log("file " + vault.file + " " + nextVaultName.fileName);
        promises.push(rotateVault(vaultPath,oldCryptoKey,newCryptoKey,vault.file,nextVaultName.fileName,nextVaultName.id));
        vault.file = nextVaultName.fileName;
        vault.id = nextVaultName.id;
        newFileNames.push(nextVaultName.fileName);
        // increment nextVaultFileName
        nextVaultName.id = nextVaultName.id + 1;
        nextVaultName.fileName = "zvault-"+nextVaultName.id+".json";

    }
    // wait for all saves to complete
    Promise.all(promises)
      .then((values) => {
        // save the vault list
        //console.log("save vault List " + JSON.stringify(vaultList));
        getSaveVault(path.join(vaultPath, 'vaultlist.json'), JSON.stringify(vaultList), newCryptoKey)
          .then((val) => {
            // vault list has saved successfully
            // scrub old files and delete them
            let scrubPromises = [];
            for (let o of values) {
              scrubPromises.push(scrubOldFile(path.join(vaultPath, o.oldVaultName),o.fileLength));
            }
            Promise.all(scrubPromises)
              .then((scrubValues) => {
                resolve({status:"SUCCESS",statusMsg:"Password change successful",vaultList,cryptoKey:newCryptoKey});
              })
              .catch((val) => {
                resolve({status:"SUCCESS",statusMsg:"Password change successful but old data files were not removed",vaultList,cryptoKey:newCryptoKey})
              });
          })
          .catch((val) => {
            reject({status:"ERROR",statusMsg:"Change password failed: " + val.statusMsg});
          });
      })
      .catch((val) => {
        // cleanup any new vaults that may have been created
        // console.log("Scrub vaults " + JSON.stringify(newFileNames));
        let scrubPromises = [];
        for (let o of newFileNames) {
          scrubPromises.push(scrubOldFile(path.join(vaultPath, o),100));
        }
        Promise.all(scrubPromises)
          .then((scrubValues) => {
            reject({status:"ERROR",statusMsg:"Change password failed: " + val.statusMsg});
          })
          .catch((val) => {
            reject({status:"ERROR",statusMsg:"Change password failed: " + val.statusMsg});
          });
      });
  });
};

const rotateVault = (vaultPath,oldCryptoKey,newCryptoKey,oldVaultName,nextVaultName,nextVaultId) => {
  return new Promise((resolve,reject) => {
    // console.log("rotate vault " + oldVaultName + " " + nextVaultName + " " + nextVaultId);
    fs.readFile(path.join(vaultPath, oldVaultName), 'utf-8', (err, data) => {
      if(err){
        // rollback;
        // console.log(err);
        reject({status:"ERROR",statusMsg:"Unable to read file"});
      } else {
        // console.log("read ");
        let oldData = null;
        try {
          oldData = encryption.decrypt(oldCryptoKey, data);
        } catch (err) {
          reject({status:"ERROR",statusMsg:"Invalid old password"});
        }
        // console.log("old Data " + oldData);
        // get data length for later
        if (oldData != null) {
          const fileLength = oldData.length;
          let oldDataObj = JSON.parse(oldData);
          oldDataObj.file = nextVaultName;
          // console.log("file length " + fileLength);
          let newData = null;
          try {
            newData = encryption.encrypt(newCryptoKey, JSON.stringify(oldDataObj));
          } catch (err) {
            reject({status:"ERROR",statusMsg:"Invalid new password"});
          }
          // console.log("new Data " + newData)
          if (newData != null) {
            fs.writeFile(path.join(vaultPath, nextVaultName), newData, (err, data) => {
                if(err){
                  // rollback
                  reject({status:"ERROR",statusMsg:"Unable to write file"});
                } else {
                  resolve({oldVaultName,fileLength});
                }
            });
          }
        }
      }
    });
  });
};

const scrubOldFile = (vaultFile,fileLength) => {
  return new Promise((resolve,reject) => {
    // scrub data first
    // console.log("scrub file " + vaultFile);
    let r = crypto.randomBytes(fileLength).toString('hex');
    fs.writeFile(vaultFile, r, (err, data) => {
        if(err){
          reject({status:"ERROR",statusMsg:"Unable to Clean file " + vaultFile});
        } else {
          // delete file
          if (fs.existsSync(vaultFile)) {
            fs.unlink(vaultFile, (err) => {
              if(err){
                reject({status:"ERROR",statusMsg:"Unable to Delete file " + vaultFile});
              } else {
                resolve({status:"SUCCESS"});
              }
            });
          }
        }
    });
  });
};

exports.cryptoTest = () => {
  const secret = 'abcdefg';
  const hash = crypto.createHmac('sha256', secret)
                   .update('I love cupcakes')
                   .digest('hex');
  // console.log(hash);
}
