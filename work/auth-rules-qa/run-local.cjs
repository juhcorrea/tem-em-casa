'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const source='C:/Users/juliana.correa/Documents/Codex/2026-10-06/boa/work/privacy';
const javaRoot=path.join(source,'java21');
const javaDir=fs.readdirSync(javaRoot,{withFileTypes:true}).find(x=>x.isDirectory());
if(!javaDir)throw new Error('Existing Java 21 directory not found');
const java=path.join(javaRoot,javaDir.name,'bin','java.exe');
const jarDir=path.join(source,'emulators');
const jar=path.join(jarDir,fs.readdirSync(jarDir).find(x=>/^cloud-firestore-emulator-.*\.jar$/.test(x))||'missing');
if(!fs.existsSync(java)||!fs.existsSync(jar))throw new Error('Existing Java or emulator missing');
const log=fs.createWriteStream(path.join(__dirname,'emulator.log'));
const emulator=spawn(java,['-jar',jar,'--host','127.0.0.1','--port','8196','--project_id','demo-tem-em-casa'],{cwd:__dirname,windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='',exited=false;
emulator.stdout.on('data',x=>{output+=x;log.write(x);});
emulator.stderr.on('data',x=>{output+=x;log.write(x);});
emulator.on('exit',()=>{exited=true;});
emulator.on('error',error=>{console.error(error);exited=true;});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  try{
    let ready=false;
    for(let i=0;i<100;i++){
      if(exited)throw new Error('Emulator exited: '+output.slice(-6000));
      try{await fetch('http://127.0.0.1:8196/',{signal:AbortSignal.timeout(500)});ready=true;break;}catch{}
      await delay(300);
    }
    if(!ready)throw new Error('Local emulator did not start: '+output.slice(-6000));
    console.log('Isolated Firestore emulator ready at 127.0.0.1:8196 (demo-tem-em-casa).');
    const code=await new Promise((resolve,reject)=>{
      const test=spawn(process.execPath,[path.join(__dirname,'rules.test.cjs')],{cwd:__dirname,windowsHide:true,stdio:'inherit',env:{...process.env,GCLOUD_PROJECT:'demo-tem-em-casa',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8196'}});
      test.on('error',reject);test.on('exit',resolve);
    });
    process.exitCode=code||0;
  }catch(error){console.error(error);process.exitCode=1;}
  finally{if(!exited)emulator.kill();log.end();}
})();
