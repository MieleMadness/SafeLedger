/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const electron = require('electron');
const {ipcRenderer : ipc } = electron;
const statusMgr = require('./status');
const utils = require('./utils');
const securityUi = require('./security-ui');

exports.listRecords = (params) => renderRecords(params);

const renderRecords = (params) => {
  const recordSearch=document.getElementById('recordSearch');
  const recordArea=document.getElementById('recordArea');
  recordArea.innerHTML='';
  const ul=document.createElement('UL'); ul.className='nav';
  if(params.vaultData&&params.vaultData.groupSelected!=null){
    const wallet=params.vaultData.groups[params.vaultData.groupSelected];
    const records=wallet&&Array.isArray(wallet.records)?wallet.records:[];
    const sortedRecords=records
      .map((record,originalIndex)=>({record,originalIndex}))
      .sort((a,b)=>String(a.record.name||'').localeCompare(String(b.record.name||''),undefined,{sensitivity:'base'}));
    const query=recordSearch&&recordSearch.value?recordSearch.value.toLowerCase():'';
    for(const entry of sortedRecords){
      const coin=entry.record;
      const i=entry.originalIndex;
      const searchable=[coin.name,coin.symbol,coin.publicAddress,coin.notes,coin.tags,coin.manualBalance]
        .map(v=>String(v||'').toLowerCase()).join(' ');
      if(query&&!searchable.includes(query))continue;
      const li=document.createElement('LI'); const href=document.createElement('A');
      href.addEventListener('click',(e)=>{e.preventDefault(); if(params.saving.state)return alert('Please wait for processing to complete'); params.vaultData.recordSelected=i; renderRecordDetail({cryptoKey:params.cryptoKey,vaultData:params.vaultData,record:coin,saving:params.saving}); renderRecords(params);});
      if(params.vaultData.recordSelected==i)href.className='item-selected';
      const symbol=coin.symbol?`(${coin.symbol})`:''; href.innerHTML=`<i class='fa fa-cubes'></i> ${coin.name||'Unnamed'} ${symbol}`; li.appendChild(href); ul.appendChild(li);
    }
    recordArea.appendChild(ul);
    if(records.length===0)recordArea.innerHTML='No items';
  }else recordArea.innerHTML='No items';
};

exports.createRecord = (params) => createEditRecord(params);

const createEditRecord = (params) => {
  const area=document.getElementById('detailArea'); area.innerHTML='';
  const header=document.createElement('h1'); header.textContent=params.record?'Modify Coin':'Add Coin'; area.appendChild(header); area.appendChild(document.createElement('hr'));
  const form=document.createElement('form'); area.appendChild(form); const group=document.createElement('div'); group.className='form-group'; form.appendChild(group);

  const textInput=(id,labelText,value,max=500)=>{const label=document.createElement('label');label.for=id;label.textContent=labelText;group.appendChild(label);const input=document.createElement('input');input.type='text';input.className='form-control';input.id=id;input.maxLength=max;input.value=value||'';group.appendChild(input);return input;};
  const inputName=textInput('inputName','Coin',params.record&&params.record.name,25);
  const inputSymbol=textInput('inputSymbol','Symbol',params.record&&params.record.symbol,30);
  const inputPublicAddress=textInput('inputPublicAddress','Public address',params.record&&params.record.publicAddress);
  const inputTags=textInput('inputTags','Tags (comma separated)',params.record&&params.record.tags,250);
  const inputBalance=textInput('inputManualBalance','Last known balance (manual)',params.record&&params.record.manualBalance,100);

  const privateLabel=document.createElement('label'); privateLabel.for='inputPrivateAddress'; privateLabel.textContent='Private key'; group.appendChild(privateLabel);
  const inputPrivateAddress=document.createElement('input'); inputPrivateAddress.type='password'; inputPrivateAddress.className='form-control'; inputPrivateAddress.id='inputPrivateAddress'; inputPrivateAddress.maxLength=500; inputPrivateAddress.value=(params.record&&params.record.privateAddress)||''; group.appendChild(inputPrivateAddress); securityUi.addSensitiveInputControls(inputPrivateAddress,group,'private key');

  const notesLabel=document.createElement('label'); notesLabel.for='inputNotes'; notesLabel.textContent='Notes'; group.appendChild(notesLabel);
  const inputNotes=document.createElement('textarea'); inputNotes.rows=5; inputNotes.className='form-control'; inputNotes.id='inputNotes'; inputNotes.maxLength=500; inputNotes.value=(params.record&&params.record.notes)||''; group.appendChild(inputNotes);

  const saveBtn=document.createElement('button'); saveBtn.type='submit'; saveBtn.className='btn btn-default bottom-space pull-right'; saveBtn.innerHTML="<span class='glyphicon glyphicon-save'></span> Save";
  saveBtn.addEventListener('click',(e)=>{e.preventDefault();if(params.saving.state)return alert('Please wait for processing to complete');if(!inputName.value)return;params.saving.state=true;statusMgr.loadStatus();
    const rec=params.record||{created:Date()}; rec.name=inputName.value;rec.symbol=inputSymbol.value;rec.publicAddress=inputPublicAddress.value;rec.privateAddress=inputPrivateAddress.value;rec.tags=inputTags.value;rec.manualBalance=inputBalance.value;rec.balanceUpdated=inputBalance.value?new Date().toISOString():(rec.balanceUpdated||'');rec.notes=inputNotes.value;if(params.record)rec.modified=Date();
    const records=params.vaultData.groups[params.vaultData.groupSelected].records||(params.vaultData.groups[params.vaultData.groupSelected].records=[]);if(params.record)records[params.vaultData.recordSelected]=rec;else records.push(rec);records.sort(utils.compareIgnoreCase);params.vaultData.recordSelected=records.indexOf(rec);ipc.send('process-record',{cryptoKey:params.cryptoKey,action:params.record?'modify':'create',vaultData:params.vaultData});
  }); form.appendChild(saveBtn);
};

exports.showRecordDetail = (params) => renderRecordDetail(params);

const renderRecordDetail = (params) => {
  const area=document.getElementById('detailArea');area.innerHTML='';const header=document.createElement('h1');header.textContent=params.record.name||'Coin';area.appendChild(header);area.appendChild(document.createElement('hr'));
  const addLine=(label,value)=>{if(value==null||value==='')return;const p=document.createElement('p');const b=document.createElement('b');b.textContent=`${label}: `;p.appendChild(b);const span=document.createElement('span');span.textContent=value;p.appendChild(span);area.appendChild(p);};
  addLine('Symbol',params.record.symbol); addLine('Tags',params.record.tags); addLine('Last known balance',params.record.manualBalance); addLine('Balance updated',params.record.balanceUpdated);
  const publicAddress=document.createElement('div');const b=document.createElement('b');b.textContent='Public Address:';publicAddress.appendChild(b);const out=document.createElement('div');out.className='outData';out.textContent=params.record.publicAddress||'';publicAddress.appendChild(out);area.appendChild(publicAddress);
  securityUi.appendPublicAddressTools(area,params.record.publicAddress||'',params.record.symbol||''); securityUi.appendSensitiveField(area,'Private key',params.record.privateAddress||'');
  addLine('Notes',params.record.notes); addLine('Created',params.record.created); addLine('Modified',params.record.modified);

  const printBtn=document.createElement('button');printBtn.type='button';printBtn.className='btn btn-default bottom-space';printBtn.innerHTML="<i class='fa fa-print'></i> Print coin sheet";printBtn.addEventListener('click',()=>securityUi.printRecoverySheet(`${params.record.name||'Coin'} Recovery Sheet`,[
    {label:'Coin',value:params.record.name},{label:'Symbol',value:params.record.symbol},{label:'Tags',value:params.record.tags},{label:'Public address',value:params.record.publicAddress},{label:'Private key',value:params.record.privateAddress},{label:'Last known balance',value:params.record.manualBalance},{label:'Balance updated',value:params.record.balanceUpdated},{label:'Notes',value:params.record.notes}
  ],!!params.record.privateAddress));area.appendChild(printBtn);

  const deleteBtn=document.createElement('button');deleteBtn.type='button';deleteBtn.className='btn btn-default bottom-space pull-right';deleteBtn.innerHTML="<span class='glyphicon glyphicon-trash'></span> Delete";deleteBtn.onclick=()=>confirmDelete(params);area.appendChild(deleteBtn);
  const editBtn=document.createElement('button');editBtn.type='button';editBtn.className='btn btn-default bottom-space pull-right';editBtn.innerHTML="<span class='glyphicon glyphicon-edit'></span> Edit";editBtn.onclick=()=>createEditRecord(params);area.appendChild(editBtn);
};

const confirmDelete = (params) => {
  const area=document.getElementById('detailArea');area.innerHTML='';const header=document.createElement('h1');header.textContent=`Confirm Delete of coin: ${params.record.name}`;area.appendChild(header);area.appendChild(document.createElement('hr'));const btn=document.createElement('button');btn.type='button';btn.className='btn btn-default bottom-space pull-right';btn.textContent='Confirm';btn.onclick=()=>{params.vaultData.groups[params.vaultData.groupSelected].records.splice(params.vaultData.recordSelected,1);params.vaultData.recordSelected=null;params.saving.state=true;statusMgr.loadStatus();ipc.send('process-record',{cryptoKey:params.cryptoKey,action:'delete',vaultData:params.vaultData});area.innerHTML='';};area.appendChild(btn);
};
