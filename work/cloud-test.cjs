'use strict';
const assert = require('node:assert/strict');
const create = require('./cloud.js');
const E = require('./engine.js');
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
const copy=value=>JSON.parse(JSON.stringify(value));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const configuration={apiKey:'test-public-config',authDomain:'test.firebaseapp.com',projectId:'test',appId:'test-app'};
const user=(uid='alice',verified=true)=>({uid,email:uid+'@example.test',displayName:uid,emailVerified:verified});
const data=(uid,revision=1,state=E.initial(false))=>({ownerUid:uid,schemaVersion:1,revision,payload:JSON.stringify(state),updatedAt:{seconds:1}});
const snapshot=value=>({exists:()=>value!==undefined,data:()=>copy(value)});

function harness(initialUser=null) {
  const h={auth:{currentUser:initialUser},docs:new Map(),events:[],reads:[],writes:[],transactions:0,persistences:[],verifications:0,tokenRefreshes:[],readHook:null,beforeGet:null,beforeCommit:null,transactionError:null,signInHook:null,persistenceHook:null,resetError:null};
  h.notify=value=>{h.auth.currentUser=value;if(h.observer)h.observer(value);};
  h.sdk={
    getApps:()=>[], initializeApp:(options,name)=>({options,name}),getAuth:()=>h.auth,
    memoryLocalCache:()=>({kind:'memory'}), initializeFirestore:(app,settings)=>{assert.deepEqual(settings,{localCache:{kind:'memory'}});return {app};},
    onAuthStateChanged:(auth,next,error)=>{h.observer=next;h.observerError=error;queueMicrotask(()=>next(h.auth.currentUser));return()=>{};},
    doc:(db,...parts)=>({path:parts.join('/')}),
    getDocFromServer:async ref=>{h.reads.push(ref.path);const value=h.docs.get(ref.path);if(h.readHook)await h.readHook(ref);return snapshot(value);},
    serverTimestamp:()=>({serverTimestamp:true}),
    runTransaction:async (db,fn)=>{
      h.transactions++;
      if(h.transactionError)throw h.transactionError;
      for(let attempt=0;attempt<3;attempt++){
        let pending=null,readVersion;
        await fn({get:async ref=>{if(h.beforeGet)await h.beforeGet(ref);const value=h.docs.get(ref.path);readVersion=value&&value.revision;return snapshot(value);},set:(ref,value)=>{pending={ref,value};}});
        if(h.beforeCommit)await h.beforeCommit(pending,attempt);
        if(!pending)throw new Error('Missing write');
        const current=h.docs.get(pending.ref.path);
        if((current&&current.revision)!==readVersion)continue;
        h.docs.set(pending.ref.path,copy(pending.value));h.writes.push(pending);return;
      }
      throw Object.assign(new Error('Retry exhausted'),{code:'aborted'});
    },
    browserLocalPersistence:'LOCAL',browserSessionPersistence:'SESSION',
    setPersistence:async(auth,value)=>{h.persistences.push(value);if(h.persistenceHook)await h.persistenceHook();},
    signInWithEmailAndPassword:async(auth,email,password)=>{if(h.signInHook)await h.signInHook();const next=user(email.split('@')[0]);h.notify(next);return {user:next};},
    createUserWithEmailAndPassword:async(auth,email,password)=>{const next=user(email.split('@')[0],false);h.notify(next);return {user:next};},
    updateProfile:async(person,profile)=>Object.assign(person,profile),
    sendEmailVerification:async()=>{h.verifications++;},
    sendPasswordResetEmail:async()=>{if(h.resetError)throw h.resetError;},
    reload:async(person)=>{person.emailVerified=true;},
    getIdToken:async(person,force)=>{h.tokenRefreshes.push(force);return'test-token';},
    signOut:async()=>h.notify(null)
  };
  h.cloud=create({engine:E,config:configuration,sdk:h.sdk});
  h.init=async()=>{await h.cloud.init(event=>h.events.push(event));await flush();};
  return h;
}

test('placeholder configuration never initializes Firebase',async()=>{
  let called=false;const events=[];
  const cloud=create({engine:E,config:{...configuration,apiKey:'COLE_SUA_API_KEY'},sdk:{getApps(){called=true;}}});
  assert.equal(cloud.isConfigured(),false);assert.equal(await cloud.init(e=>events.push(e)),false);
  assert.equal(called,false);assert.equal(events.at(-1).phase,'unconfigured');
});
test('signed-out and unverified accounts cannot access household state',async()=>{
  const h=harness();await h.init();assert.equal(h.events.at(-1).phase,'signed-out');
  await assert.rejects(h.cloud.save(E.initial(false)),{code:'casa/session-changed'});
  h.notify(user('alice',false));await flush();assert.equal(h.events.at(-1).phase,'unverified');
  await assert.rejects(h.cloud.save(E.initial(false)),{code:'casa/unverified'});
  assert.equal(h.reads.length,0);assert.equal(h.writes.length,0);
});
test('absent document loads clean initial state without creating a document',async()=>{
  const h=harness(user());await h.init();assert.equal(h.cloud.ready,true);assert.equal(h.cloud.revision,0);
  assert.equal(h.events.at(-1).state.list.length,0);assert.equal(h.writes.length,0);
  assert.deepEqual(h.reads,['temEmCasaUsers/alice/state/main']);
});
test('first save writes revision 1 and normalized owner data without a ready event',async()=>{
  const h=harness(user());await h.init();const count=h.events.length;
  const next=E.addToList(E.initial(false),'arroz',2);const result=await h.cloud.save(next);
  assert.equal(h.cloud.revision,1);assert.deepEqual(result,E.validate(next));assert.equal(h.events.length,count);
  const saved=h.docs.get('temEmCasaUsers/alice/state/main');assert.equal(saved.ownerUid,'alice');assert.equal(saved.schemaVersion,1);
  assert.equal(saved.revision,1);assert.equal(JSON.parse(saved.payload).list[0].qty,2);assert.equal(h.cloud.busy,false);
});
test('existing revision increments only after successful server commit',async()=>{
  const h=harness(user());h.docs.set('temEmCasaUsers/alice/state/main',data('alice',5));await h.init();
  assert.equal(h.cloud.revision,5);await h.cloud.save(E.initial(false));assert.equal(h.cloud.revision,6);
});
test('unavailable write keeps revision unchanged and does not claim a save',async()=>{
  const h=harness(user());h.docs.set('temEmCasaUsers/alice/state/main',data('alice',5));await h.init();
  h.transactionError=Object.assign(new Error('network failed'),{code:'unavailable'});
  await assert.rejects(h.cloud.save(E.initial(false)),{code:'unavailable'});
  assert.equal(h.cloud.revision,5);assert.equal(h.writes.length,0);assert.equal(h.cloud.busy,false);
});
test('revision conflict refuses to overwrite another device and refresh reloads it',async()=>{
  const h=harness(user());h.docs.set('temEmCasaUsers/alice/state/main',data('alice',1));await h.init();
  const latest=E.addToList(E.initial(false),'leite',4);h.docs.set('temEmCasaUsers/alice/state/main',data('alice',2,latest));
  await assert.rejects(h.cloud.save(E.initial(false)),{code:'casa/conflict'});
  assert.equal(h.cloud.revision,1);assert.equal(h.writes.length,0);
  await h.cloud.refresh();assert.equal(h.cloud.revision,2);assert.equal(h.events.at(-1).state.list[0].productId,'leite');
});
test('automatic transaction retry still checks the original base revision',async()=>{
  const h=harness(user());h.docs.set('temEmCasaUsers/alice/state/main',data('alice',1));await h.init();
  h.beforeCommit=async(pending,attempt)=>{if(attempt===0)h.docs.set(pending.ref.path,data('alice',2));};
  await assert.rejects(h.cloud.save(E.initial(false)),{code:'casa/conflict'});
  assert.equal(h.cloud.revision,1);assert.equal(h.writes.length,0);assert.equal(h.docs.get('temEmCasaUsers/alice/state/main').revision,2);
});
test('busy guard serializes save and refresh',async()=>{
  const h=harness(user());await h.init();const pause=deferred();h.beforeGet=()=>pause.promise;
  const saving=h.cloud.save(E.initial(false));assert.equal(h.cloud.busy,true);
  await assert.rejects(h.cloud.save(E.initial(false)),{code:'casa/busy'});await assert.rejects(h.cloud.refresh(),{code:'casa/busy'});
  pause.resolve();await saving;assert.equal(h.cloud.busy,false);
});
test('logout before transaction read prevents the pending write and clears context immediately',async()=>{
  const h=harness(user());await h.init();const pause=deferred();h.beforeGet=()=>pause.promise;
  const saving=h.cloud.save(E.initial(false));await h.cloud.signOut();
  assert.equal(h.cloud.user,null);assert.equal(h.cloud.ready,false);assert.equal(h.cloud.revision,0);
  pause.resolve();await assert.rejects(saving,{code:'casa/session-changed'});assert.equal(h.writes.length,0);
});
test('logout after a commit starts never repopulates signed-out UI with its result',async()=>{
  const h=harness(user());await h.init();h.beforeCommit=async()=>h.cloud.signOut();
  await assert.rejects(h.cloud.save(E.initial(false)),{code:'casa/session-changed'});
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].ref.path,'temEmCasaUsers/alice/state/main');
  assert.equal(h.cloud.ready,false);assert.equal(h.cloud.revision,0);assert.equal(h.events.at(-1).phase,'signed-out');
});
test('account change during a write cannot write into the new account',async()=>{
  const h=harness(user());await h.init();const pause=deferred();h.beforeGet=()=>pause.promise;
  const saving=h.cloud.save(E.initial(false));h.notify(user('bob'));await flush();
  pause.resolve();await assert.rejects(saving,{code:'casa/session-changed'});
  assert.equal(h.writes.length,0);assert.equal(h.cloud.user.uid,'bob');assert.equal(h.cloud.revision,0);
});
test('slow previous-account read is ignored after the new account loads',async()=>{
  const h=harness();await h.init();const pause=deferred();
  h.docs.set('temEmCasaUsers/alice/state/main',data('alice',3));h.docs.set('temEmCasaUsers/bob/state/main',data('bob',8));
  h.readHook=ref=>ref.path.includes('/alice/')?pause.promise:Promise.resolve();
  h.notify(user('alice'));await flush();h.notify(user('bob'));await flush();
  assert.equal(h.cloud.revision,8);pause.resolve();await flush();
  assert.equal(h.cloud.user.uid,'bob');assert.equal(h.cloud.revision,8);
  assert.equal(h.events.filter(e=>e.phase==='ready'&&e.user.uid==='alice').length,0);
});
test('slow read cannot restore data after logout',async()=>{
  const h=harness();await h.init();const pause=deferred();h.readHook=()=>pause.promise;
  h.notify(user());await flush();await h.cloud.signOut();pause.resolve();await flush();
  assert.equal(h.cloud.ready,false);assert.equal(h.cloud.user,null);assert.equal(h.events.at(-1).phase,'signed-out');
});
test('payload limit counts UTF-8 bytes before any transaction',async()=>{
  const h=harness(user());await h.init();const next=E.initial(false);const base=next.products[0];
  next.products=Array.from({length:2000},(_,i)=>({...base,id:'product-'+i,name:'é'.repeat(100)}));
  assert.ok(new TextEncoder().encode(JSON.stringify(E.validate(next))).length>750000);
  await assert.rejects(h.cloud.save(next),{code:'casa/too-large'});assert.equal(h.transactions,0);assert.equal(h.cloud.revision,0);
});
test('invalid server ownership or payload blocks state access',async()=>{
  for(const invalid of [{...data('alice'),ownerUid:'bob'},{...data('alice'),payload:'not-json'}, {...data('alice'),revision:-1}]){
    const h=harness(user());h.docs.set('temEmCasaUsers/alice/state/main',invalid);await h.init();
    assert.equal(h.cloud.ready,false);assert.equal(h.events.at(-1).phase,'error');assert.equal(h.cloud.revision,0);
  }
});
test('server read failure blocks edits and permits explicit retry',async()=>{
  const h=harness(user());h.readHook=async()=>{throw Object.assign(new Error('forbidden'),{code:'permission-denied'});};await h.init();
  assert.equal(h.events.at(-1).phase,'error');await assert.rejects(h.cloud.save(E.initial(false)),{code:'casa/not-ready'});
  h.readHook=null;await h.cloud.refresh();assert.equal(h.cloud.ready,true);
});
test('sign in defaults to session persistence and only remembers when checked',async()=>{
  const h=harness();await h.init();await h.cloud.signIn(' alice@example.test ','secret-password');await flush();
  assert.equal(h.persistences.at(-1),'SESSION');assert.equal(h.cloud.user.uid,'alice');
  await h.cloud.signOut();await h.cloud.signIn('bob@example.test','secret-password',true);await flush();
  assert.equal(h.persistences.at(-1),'LOCAL');assert.equal(h.cloud.user.uid,'bob');
});
test('sign up sends verification without reading state until verification refresh',async()=>{
  const h=harness();await h.init();await h.cloud.signUp('  Ana  ','ana@example.test','secret-password');await flush();
  assert.equal(h.verifications,1);assert.equal(h.cloud.user.displayName,'Ana');assert.equal(h.cloud.ready,false);assert.equal(h.reads.length,0);
  await h.cloud.resendVerification();assert.equal(h.verifications,2);
  await h.cloud.refreshUser();assert.equal(h.cloud.user.emailVerified,true);assert.equal(h.cloud.ready,true);assert.deepEqual(h.tokenRefreshes,[true]);
});
test('pending login cannot reopen an explicitly signed-out account',async()=>{
  const h=harness();await h.init();const pause=deferred();h.signInHook=()=>pause.promise;
  const signing=h.cloud.signIn('alice@example.test','secret-password');await flush();await h.cloud.signOut();
  pause.resolve();await assert.rejects(signing,{code:'casa/session-changed'});await flush();
  assert.equal(h.cloud.user,null);assert.equal(h.cloud.ready,false);assert.equal(h.auth.currentUser,null);assert.equal(h.reads.length,0);
});
test('logout while persistence changes prevents authentication from beginning',async()=>{
  const h=harness();await h.init();const pause=deferred();h.persistenceHook=()=>pause.promise;
  const signing=h.cloud.signIn('alice@example.test','secret-password');await flush();await h.cloud.signOut();pause.resolve();
  await assert.rejects(signing,{code:'casa/session-changed'});assert.equal(h.auth.currentUser,null);assert.equal(h.reads.length,0);
});
test('logout during first SDK initialization cancels the queued login',async()=>{
  const h=harness();let called=false;h.signInHook=async()=>{called=true;};
  const signing=h.cloud.signIn('alice@example.test','secret-password');
  await h.cloud.signOut();await assert.rejects(signing,{code:'casa/session-changed'});await flush();
  assert.equal(called,false);assert.equal(h.cloud.user,null);assert.equal(h.cloud.ready,false);
});
test('login cannot start until a slow signout has finished',async()=>{
  const h=harness(user());await h.init();const pause=deferred();h.sdk.signOut=async()=>{await pause.promise;h.notify(null);};
  const signingOut=h.cloud.signOut();assert.equal(h.cloud.user,null);assert.equal(h.cloud.busy,true);
  await assert.rejects(h.cloud.signIn('bob@example.test','secret-password'),{code:'casa/busy'});
  pause.resolve();await signingOut;assert.equal(h.cloud.busy,false);
  await h.cloud.signIn('bob@example.test','secret-password');await flush();assert.equal(h.cloud.user.uid,'bob');
});
test('reset password message does not reveal whether an account exists',async()=>{
  const h=harness();await h.init();const existing=await h.cloud.resetPassword('alice@example.test');
  h.resetError={code:'auth/user-not-found'};const missing=await h.cloud.resetPassword('missing@example.test');assert.equal(existing,missing);
  h.resetError={code:'auth/user-disabled'};assert.equal(await h.cloud.resetPassword('disabled@example.test'),existing);
  h.resetError={code:'auth/network-request-failed'};await assert.rejects(h.cloud.resetPassword('alice@example.test'),{code:'auth/network-request-failed'});
});
test('safe user projection excludes credentials and error text is mapped',async()=>{
  const person={...user(),accessToken:'private',refreshToken:'private'};const h=harness(person);await h.init();
  assert.deepEqual(Object.keys(h.cloud.user).sort(),['displayName','email','emailVerified','uid']);
  assert.equal(h.cloud.errorMessage({code:'auth/wrong-password'}),h.cloud.errorMessage({code:'auth/user-not-found'}));
  assert.ok(!h.cloud.errorMessage({message:'SECRET raw debug'}).includes('SECRET'));
});

(async()=>{
  let passed=0;
  for(const {name,fn} of tests){
    try{await fn();passed++;console.log('PASS '+name);}
    catch(error){console.error('FAIL '+name);console.error(error);process.exitCode=1;}
  }
  console.log(`${passed}/${tests.length} Firebase adapter tests passed (mock SDK; no backend or rules emulator contacted).`);
})();
