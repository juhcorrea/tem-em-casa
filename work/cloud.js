(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.CasaCloud = factory({ engine:root.NinhoEngine, config:function () { return root.FIREBASE_CONFIG || {}; } });
})(typeof window !== 'undefined' ? window : this, function createCasaCloud(options) {
  'use strict';
  options = options || {};
  var E = options.engine, sdk = options.sdk || null, auth = null, db = null;
  var initialized = null, callback = function () {}, epoch = 0, currentUser = null;
  var ready = false, revision = 0, stateRef = null, operation = null, authAction = null, logoutTask = null, authGeneration = 0;
  var signedOutIntent = false, MAX_BYTES = 750000, MAX_REVISION = 2147483647;

  function config() { return typeof options.config === 'function' ? options.config() : (options.config || {}); }
  function isConfigured() {
    var value = config();
    return !!value && ['apiKey','authDomain','projectId','appId'].every(function (key) {
      return typeof value[key] === 'string' && value[key].trim().length > 0 &&
        !/(?:COLE_|SEU_|SUA_|YOUR_|INSIRA_|CHANGE_ME|[<>])/i.test(value[key]);
    });
  }
  function failure(code, message) { var error = new Error(message); error.code = code; return error; }
  function errorMessage(error) {
    var code = error && error.code || '';
    var messages = {
      'casa/config':'Configure o Firebase deste app para entrar na sua conta.',
      'casa/session-changed':'Sua sessão mudou. Entre novamente para continuar.',
      'casa/not-ready':'Aguarde seus dados carregarem antes de alterar a lista.',
      'casa/unverified':'Confirme seu e-mail antes de abrir sua lista e despensa.',
      'casa/busy':'Aguarde a operação atual terminar e tente novamente.',
      'casa/conflict':'Sua lista foi alterada em outro aparelho ou aba. Atualize os dados e repita esta alteração.',
      'casa/data-invalid':'Não foi possível abrir os dados desta conta. Guarde seu backup e tente novamente.',
      'casa/too-large':'Seus dados atingiram o limite de espaço. Exporte um backup antes de reduzir o histórico e tentar novamente.',
      'casa/revision-limit':'O histórico de alterações atingiu o limite. Exporte um backup e solicite ajuda.',
      'auth/invalid-email':'Digite um e-mail válido.',
      'auth/missing-email':'Informe seu e-mail.',
      'auth/invalid-credential':'E-mail ou senha incorretos. Confira os dados ou recupere sua senha.',
      'auth/user-not-found':'E-mail ou senha incorretos. Confira os dados ou recupere sua senha.',
      'auth/wrong-password':'E-mail ou senha incorretos. Confira os dados ou recupere sua senha.',
      'auth/missing-password':'Informe sua senha.',
      'auth/weak-password':'Escolha uma senha mais forte, com pelo menos 8 caracteres.',
      'auth/password-does-not-meet-requirements':'A senha não atende aos requisitos desta conta. Use letras maiúsculas e minúsculas, números e símbolos.',
      'auth/email-already-in-use':'Não foi possível criar a conta com esses dados. Tente entrar ou recuperar sua senha.',
      'auth/too-many-requests':'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
      'auth/user-disabled':'Esta conta está desativada. Entre em contato com o responsável pelo app.',
      'auth/network-request-failed':'Não foi possível conectar. Confira sua internet e tente novamente.',
      'auth/operation-not-allowed':'O acesso por e-mail e senha precisa ser ativado no Firebase Authentication.',
      'auth/unauthorized-domain':'Este endereço precisa ser autorizado no Firebase Authentication.',
      'auth/invalid-api-key':'A configuração do Firebase precisa ser revisada.',
      'auth/app-not-authorized':'Este site não está autorizado na configuração do Firebase.',
      'auth/requires-recent-login':'Entre novamente para continuar esta operação.',
      'permission-denied':'O Firebase recusou o acesso. Confira a confirmação do e-mail e as regras do Firestore.',
      'unavailable':'Não foi possível acessar a nuvem agora. Confira sua internet e tente novamente.',
      'deadline-exceeded':'A conexão demorou demais. Confira sua internet e tente novamente.',
      'resource-exhausted':'O Firebase atingiu um limite de uso. Tente mais tarde ou confira a cota do projeto.',
      'failed-precondition':'O Firestore precisa ser configurado no projeto deste app.',
      'aborted':'Outra alteração ocorreu ao mesmo tempo. Atualize seus dados e tente novamente.'
    };
    return messages[code] || messages[code.replace(/^firestore\//,'')] || 'Não foi possível concluir. Confira a conexão e a configuração do Firebase e tente novamente.';
  }
  function userValue(user) {
    return user ? { uid:user.uid, email:user.email || '', displayName:user.displayName || '', emailVerified:user.emailVerified === true } : null;
  }
  function emit(phase, extra) {
    var event = Object.assign({phase:phase,user:userValue(currentUser)},extra || {});
    // A rendering error must not turn a successfully committed write into a failed write.
    try { callback(event); } catch (_) { /* The UI owns its rendering errors. */ }
  }
  function resetContext() { ready=false; revision=0; stateRef=null; }
  function capture() { return {epoch:epoch,uid:currentUser && currentUser.uid}; }
  function validSession(context) {
    return !signedOutIntent && context.epoch===epoch && currentUser && currentUser.uid===context.uid &&
      auth && auth.currentUser && auth.currentUser.uid===context.uid;
  }
  function assertSession(context) {
    if (!validSession(context)) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
    if (currentUser.emailVerified !== true || auth.currentUser.emailVerified !== true) throw failure('casa/unverified',errorMessage({code:'casa/unverified'}));
  }
  function startOperation() {
    if (operation || authAction || logoutTask) throw failure('casa/busy',errorMessage({code:'casa/busy'}));
    var token = {}; operation=token; return token;
  }
  function endOperation(token) { if (operation===token) operation=null; }
  function encodedState(value) {
    var normalized = E.validate(value), payload = JSON.stringify(normalized);
    if (new TextEncoder().encode(payload).length > MAX_BYTES) throw failure('casa/too-large',errorMessage({code:'casa/too-large'}));
    return {state:normalized,payload:payload};
  }
  function documentValue(snapshot, uid) {
    if (!snapshot.exists()) return {state:E.validate(E.initial(false)),revision:0};
    var data = snapshot.data();
    if (!data || data.ownerUid!==uid || data.schemaVersion!==1 || !Number.isInteger(data.revision) || data.revision<1 ||
      data.revision>MAX_REVISION || typeof data.payload!=='string' || new TextEncoder().encode(data.payload).length>MAX_BYTES)
      throw failure('casa/data-invalid',errorMessage({code:'casa/data-invalid'}));
    try { return {state:E.validate(JSON.parse(data.payload)),revision:data.revision}; }
    catch (_) { throw failure('casa/data-invalid',errorMessage({code:'casa/data-invalid'})); }
  }
  async function readCurrent(context, reason) {
    assertSession(context);
    var reference = sdk.doc(db,'temEmCasaUsers',context.uid,'state','main');
    var snapshot = await sdk.getDocFromServer(reference);
    assertSession(context);
    var loaded = documentValue(snapshot,context.uid);
    stateRef=reference; revision=loaded.revision; ready=true;
    emit('ready',{state:loaded.state,reason:reason || 'auth'});
    return loaded.state;
  }
  async function acceptUser(user, reason) {
    if (signedOutIntent && user) {
      // A login that completed after logout must not reopen the account.
      try { await signOut(); } catch (_) { /* Local access stays blocked. */ }
      return;
    }
    epoch++; resetContext(); currentUser=user || null;
    if (!user) { emit('signed-out'); return; }
    if (user.emailVerified !== true) { emit('unverified'); return; }
    var context=capture();
    emit('loading',{reason:reason || 'auth'});
    try { return await readCurrent(context,reason); }
    catch (error) {
      if (validSession(context)) { resetContext(); emit('error',{error:errorMessage(error)}); }
    }
  }
  async function loadSDK() {
    if (sdk) return sdk;
    var modules = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')
    ]);
    sdk=Object.assign({},modules[0],modules[1],modules[2]);
    return sdk;
  }
  async function init(onEvent) {
    if (typeof onEvent === 'function') callback=onEvent;
    if (!isConfigured()) { emit('unconfigured'); return false; }
    if (initialized) return initialized;
    initialized=(async function () {
      emit('loading',{reason:'init'});
      await loadSDK();
      var settings=config(), name='tem-em-casa', app=sdk.getApps().find(function(a){return a.name===name;});
      if (app && ['projectId','apiKey','authDomain','appId'].some(function(key){return app.options[key]!==settings[key];}))
        throw failure('casa/config',errorMessage({code:'casa/config'}));
      app=app || sdk.initializeApp(settings,name);
      auth=sdk.getAuth(app); auth.languageCode='pt';
      // Never enable persistentLocalCache or IndexedDB persistence for household data.
      db=sdk.initializeFirestore(app,{localCache:sdk.memoryLocalCache()});
      sdk.onAuthStateChanged(auth,function(user){void acceptUser(user);},function(error){
        epoch++; currentUser=null; resetContext(); emit('error',{error:errorMessage(error)});
      });
      return true;
    })().catch(function(error){initialized=null;emit('error',{error:errorMessage(error)});throw error;});
    return initialized;
  }
  async function authOperation(action) {
    if (operation || authAction || logoutTask) throw failure('casa/busy',errorMessage({code:'casa/busy'}));
    if (!isConfigured()) throw failure('casa/config',errorMessage({code:'casa/config'}));
    var token={generation:authGeneration}; authAction=token;
    try {
      await init();
      if (token.generation!==authGeneration) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      return await action(token);
    }
    finally { if (authAction===token) authAction=null; }
  }
  function cleanedEmail(email) { return typeof email==='string' ? email.trim() : ''; }
  function signIn(email,password,remember) {
    return authOperation(async function () {
      signedOutIntent=false;
      await sdk.setPersistence(auth,remember===true ? sdk.browserLocalPersistence : sdk.browserSessionPersistence);
      if (signedOutIntent) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      var result=await sdk.signInWithEmailAndPassword(auth,cleanedEmail(email),password);
      if (signedOutIntent) { await sdk.signOut(auth); throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'})); }
      return userValue(result.user);
    });
  }
  function signUp(name,email,password,remember) {
    return authOperation(async function () {
      signedOutIntent=false;
      await sdk.setPersistence(auth,remember===true ? sdk.browserLocalPersistence : sdk.browserSessionPersistence);
      if (signedOutIntent) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      var result=await sdk.createUserWithEmailAndPassword(auth,cleanedEmail(email),password);
      if (signedOutIntent) { await sdk.signOut(auth); throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'})); }
      await sdk.updateProfile(result.user,{displayName:String(name || '').trim().slice(0,80)});
      if (signedOutIntent || !auth.currentUser || auth.currentUser.uid!==result.user.uid) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      await sdk.sendEmailVerification(result.user);
      if (signedOutIntent || !auth.currentUser || auth.currentUser.uid!==result.user.uid) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      await acceptUser(result.user,'signup');
      return userValue(result.user);
    });
  }
  function resetPassword(email) {
    return authOperation(async function () {
      try { await sdk.sendPasswordResetEmail(auth,cleanedEmail(email)); }
      catch (error) {
        if (!error || ['auth/user-not-found','auth/user-disabled','auth/invalid-credential'].indexOf(error.code)===-1) throw error;
      }
      return 'Se houver uma conta com esse e-mail, você receberá as instruções para redefinir a senha.';
    });
  }
  function resendVerification() {
    return authOperation(async function () {
      var context=capture();
      if (!validSession(context)) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      if (currentUser.emailVerified) return;
      await sdk.sendEmailVerification(auth.currentUser);
      if (!validSession(context)) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
    });
  }
  function refreshUser() {
    return authOperation(async function () {
      var context=capture();
      if (!validSession(context)) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      var user=auth.currentUser;
      await sdk.reload(user);
      if (!validSession(context)) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      await sdk.getIdToken(user,true);
      if (!validSession(context)) throw failure('casa/session-changed',errorMessage({code:'casa/session-changed'}));
      await acceptUser(user,'verification');
      return userValue(currentUser);
    });
  }
  async function signOut() {
    signedOutIntent=true; authGeneration++; epoch++; currentUser=null; resetContext(); emit('signed-out');
    if (logoutTask) return logoutTask;
    var task=Promise.resolve().then(function(){if(auth && sdk)return sdk.signOut(auth);});
    logoutTask=task;
    try { await task; }
    finally { if(logoutTask===task)logoutTask=null; }
  }
  async function refresh() {
    var token=startOperation(), context=capture();
    try {
      assertSession(context); ready=false;
      emit('loading',{reason:'refresh'});
      return await readCurrent(context,'refresh');
    } catch(error) {
      if (validSession(context)) { resetContext();emit('error',{error:errorMessage(error)}); }
      throw error;
    } finally { endOperation(token); }
  }
  async function save(next) {
    var token=startOperation(), context=capture(), baseRevision=revision, reference=stateRef;
    try {
      assertSession(context);
      if (!ready || !reference) throw failure('casa/not-ready',errorMessage({code:'casa/not-ready'}));
      var encoded=encodedState(next);
      if (baseRevision>=MAX_REVISION) throw failure('casa/revision-limit',errorMessage({code:'casa/revision-limit'}));
      await sdk.runTransaction(db,async function(transaction){
        assertSession(context);
        var snapshot=await transaction.get(reference);
        assertSession(context);
        var live=documentValue(snapshot,context.uid);
        if (live.revision!==baseRevision) throw failure('casa/conflict',errorMessage({code:'casa/conflict'}));
        transaction.set(reference,{ownerUid:context.uid,schemaVersion:1,revision:baseRevision+1,payload:encoded.payload,updatedAt:sdk.serverTimestamp()});
      });
      assertSession(context);
      revision=baseRevision+1;
      return encoded.state;
    } finally { endOperation(token); }
  }
  return {
    isConfigured:isConfigured,init:init,errorMessage:errorMessage,signIn:signIn,signUp:signUp,resetPassword:resetPassword,
    resendVerification:resendVerification,refreshUser:refreshUser,signOut:signOut,refresh:refresh,save:save,
    get user(){return userValue(currentUser);},get ready(){return ready;},get revision(){return revision;},
    get busy(){return !!(operation || authAction || logoutTask);}
  };
});
