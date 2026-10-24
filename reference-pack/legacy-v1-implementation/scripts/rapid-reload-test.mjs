import {preview} from 'vite';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const server=await preview({preview:{host:'127.0.0.1',port:0},logLevel:'silent'});
const base='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{for(let i=0;i<20;i++){const context=await browser.newContext();const page=await context.newPage();await page.goto(base+'/listing/cloud-poplin/compare?webgl=off',{waitUntil:'networkidle'});await page.getByLabel('What matters most?').selectOption('Surface');await page.reload({waitUntil:'networkidle'});const observed=await page.getByLabel('What matters most?').inputValue();results.push({trial:i+1,expected:'Surface',observed,passed:observed==='Surface'});await context.close()}}
finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
await fs.mkdir('qa/evidence',{recursive:true});await fs.writeFile('qa/evidence/rapid-comparison-reload.json',JSON.stringify({browser:'Chromium',production:true,trials:results},null,2));
console.log(JSON.stringify({passed:results.filter(x=>x.passed).length,total:results.length}));if(results.length!==20||results.some(x=>!x.passed))process.exitCode=1;
