'use strict';
// Synthetic data only. Dependencies are reused read-only from an existing local installation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const deps = createRequire('C:/Users/juliana.correa/Documents/Codex/2026-10-06/boa/work/privacy/package.json');
const {initializeTestEnvironment, assertSucceeds, assertFails} = deps('@firebase/rules-unit-testing');
const {doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, setLogLevel} = deps('firebase/firestore');
setLogLevel('silent');
const projectId = 'demo-tem-em-casa';
const rulesFile = path.resolve(__dirname, '../firestore.rules');
const rules = fs.readFileSync(rulesFile, 'utf8');
const port = 8196;
const report = {projectId, host:'127.0.0.1', port, rulesFile, rulesSha256:crypto.createHash('sha256').update(rules).digest('hex'), cases:[]};
let env;
const data = (extra={}) => ({ownerUid:'alice',schemaVersion:1,revision:1,payload:'{"items":[]}',updatedAt:serverTimestamp(),...extra});
const target = db => doc(db, 'temEmCasaUsers/alice/state/main');
async function check(name, fn) {
  await env.clearFirestore();
  try { await fn(); report.cases.push({name,passed:true}); console.log('PASS '+name); }
  catch (error) { report.cases.push({name,passed:false,error:String(error.stack || error)}); console.error('FAIL '+name+': '+error); }
}
async function seed() { await env.withSecurityRulesDisabled(c=>setDoc(target(c.firestore()),data({updatedAt:Timestamp.fromMillis(1000)}))); }
const verified = (uid='alice') => env.authenticatedContext(uid,{email:`${uid}@example.test`,email_verified:true}).firestore();
const unverified = () => env.authenticatedContext('alice',{email:'alice@example.test',email_verified:false}).firestore();

(async()=>{
  if(projectId !== 'demo-tem-em-casa') throw new Error('Only the isolated demo project is allowed.');
  env = await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port,rules}});
  try {
    await check('verified owner can read missing own document',()=>assertSucceeds(getDoc(target(verified()))));
    await check('verified owner can create own state',()=>assertSucceeds(setDoc(target(verified()),data())));
    await check('verified owner can read existing state',async()=>{await seed(); await assertSucceeds(getDoc(target(verified())));});
    await check('unauthenticated get denied',async()=>{await seed(); await assertFails(getDoc(target(env.unauthenticatedContext().firestore())));});
    await check('unauthenticated create denied',()=>assertFails(setDoc(target(env.unauthenticatedContext().firestore()),data())));
    await check('unverified owner get denied',async()=>{await seed(); await assertFails(getDoc(target(unverified())));});
    await check('unverified owner create denied',()=>assertFails(setDoc(target(unverified()),data())));
    await check('missing email_verified claim denied',()=>assertFails(setDoc(target(env.authenticatedContext('alice').firestore()),data())));
    await check('other UID get denied',async()=>{await seed(); await assertFails(getDoc(target(verified('bob'))));});
    await check('other UID create denied',()=>assertFails(setDoc(target(verified('bob')),data())));
    await check('other UID update denied',async()=>{await seed();await assertFails(updateDoc(target(verified('bob')),data({revision:2})));});
    await check('owner state collection list denied',async()=>{await seed();await assertFails(getDocs(collection(verified(),'temEmCasaUsers/alice/state')));});
    await check('users collection list denied',()=>assertFails(getDocs(collection(verified(),'temEmCasaUsers'))));
    await check('owner revision increment accepted',async()=>{await seed();await assertSucceeds(setDoc(target(verified()),data({revision:2})));});
    await check('stale revision rejected',async()=>{await seed();await assertFails(setDoc(target(verified()),data({revision:1})));});
    await check('skipped revision rejected',async()=>{await seed();await assertFails(setDoc(target(verified()),data({revision:3})));});
    await check('owner identity immutable',async()=>{await seed();await assertFails(setDoc(target(verified()),data({revision:2,ownerUid:'bob'})));});
    await check('owner delete denied',async()=>{await seed();await assertFails(deleteDoc(target(verified())));});
    const invalidCreates = [
      ['unexpected field',{extra:true}],['wrong owner',{ownerUid:'bob'}],['non-string owner',{ownerUid:12}],
      ['wrong schema version',{schemaVersion:2}],['non-integer schema version',{schemaVersion:1.1}],
      ['initial revision must be one',{revision:2}],['zero revision',{revision:0}],['negative revision',{revision:-1}],
      ['fractional revision',{revision:1.5}],['string revision',{revision:'1'}],['revision out of range',{revision:2147483648}],
      ['empty payload',{payload:''}],['map payload',{payload:{items:[]}}],['oversized payload',{payload:'x'.repeat(750001)}],
      ['string timestamp',{updatedAt:'2026-10-13'}],['old client timestamp',{updatedAt:Timestamp.fromMillis(1000)}]
    ];
    for(const [label, patch] of invalidCreates) await check('create rejects '+label,()=>assertFails(setDoc(target(verified()),data(patch))));
    for(const field of ['ownerUid','schemaVersion','revision','payload','updatedAt']) await check('create rejects missing '+field,()=>{const d=data();delete d[field];return assertFails(setDoc(target(verified()),d));});
    await check('payload at limit accepted',()=>assertSucceeds(setDoc(target(verified()),data({payload:'x'.repeat(750000)}))));
    await check('update rejects extra fields',async()=>{await seed();await assertFails(updateDoc(target(verified()),data({revision:2,extra:true})));});
    await check('update rejects old timestamp',async()=>{await seed();await assertFails(updateDoc(target(verified()),data({revision:2,updatedAt:Timestamp.fromMillis(1000)})));});
    await check('unexpected document name denied',()=>assertFails(setDoc(doc(verified(),'temEmCasaUsers/alice/state/other'),data())));
    await check('unexpected subcollection denied',()=>assertFails(setDoc(doc(verified(),'temEmCasaUsers/alice/private/main'),data())));
    await check('unrelated collection denied',()=>assertFails(setDoc(doc(verified(),'unrelated/alice'),data())));
  } finally { await env.cleanup(); }
  report.passed=report.cases.filter(x=>x.passed).length;
  report.failed=report.cases.length-report.passed;
  fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`RESULT ${report.passed} passed; ${report.failed} failed`);
  if(report.failed) process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
