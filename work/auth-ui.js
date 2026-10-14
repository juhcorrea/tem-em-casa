(function(){
'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mode='login',phase='loading',user=null,busy=false,initialized=false;
const button=(action,text,cls='secondary')=>`<button type="button" class="button ${cls}" data-auth="${action}">${text}</button>`;
const inputPassword=(label,name,autocomplete)=>`<label>${label}<span class="password-field"><input name="${name}" id="auth-${name}" type="password" autocomplete="${autocomplete}" ${mode==='signup'?'minlength="8"':''} maxlength="4096" required><button type="button" data-auth="show-password" data-target="auth-${name}" aria-label="Mostrar ${label.toLowerCase()}" aria-pressed="false">Mostrar</button></span></label>`;
function render(){
 const disabled=phase==='unconfigured'||busy;
 let body='';
 if(phase==='unverified')body=`<span class="eyebrow">FALTA SÓ UM PASSINHO</span><h2>Confirme seu e-mail</h2><p>Abra a mensagem de confirmação enviada para <strong>${esc(user?.email)}</strong>. Depois, volte aqui.</p><p class="auth-note">Confira também a caixa de spam. Sua casa será liberada após a confirmação.</p><div class="auth-form">${button('verified','Já confirmei meu e-mail','primary full')}${button('resend','Reenviar confirmação','secondary full')}${button('signout','Entrar com outra conta','ghost full')}</div>`;
 else if(phase==='error')body=`<span class="eyebrow">VAMOS TENTAR DE NOVO</span><h2>Não consegui abrir sua casa</h2><p id="auth-load-error"></p><div class="auth-form">${button('retry','Tentar novamente','primary full')}${button('signout','Voltar para o login','secondary full')}</div>`;
 else body=`<div class="auth-tabs" role="group" aria-label="Acessar sua conta"><button type="button" data-auth="login" class="${mode==='login'?'active':''}" aria-pressed="${mode==='login'}">Entrar</button><button type="button" data-auth="signup" class="${mode==='signup'?'active':''}" aria-pressed="${mode==='signup'}">Criar conta</button></div><h2>${mode==='signup'?'Seu cantinho começa aqui.':mode==='forgot'?'Vamos recuperar o acesso?':'Bom ter você em casa.'}</h2><p>${mode==='signup'?'Crie sua conta para guardar sua lista e sua despensa.':mode==='forgot'?'Informe seu e-mail para receber o link de redefinição.':'Entre para continuar cuidando da sua casa.'}</p>${phase==='unconfigured'?'<div class="notice">O acesso está sendo preparado. Por enquanto, você pode conhecer a casa de exemplo.</div>':''}<form id="auth-form" class="auth-form">${mode==='signup'?'<label>Como podemos chamar você?<input name="name" autocomplete="name" maxlength="80" required></label>':''}<label>E-mail<input name="email" type="email" inputmode="email" autocomplete="username" maxlength="254" placeholder="voce@exemplo.com" required autocapitalize="none" spellcheck="false"></label>${mode==='forgot'?'':inputPassword('Senha','password',mode==='signup'?'new-password':'current-password')}${mode==='signup'?inputPassword('Confirmar senha','confirm','new-password')+'<p class="auth-note">Use pelo menos 8 caracteres para criar sua senha.</p>':''}${mode==='forgot'?'':'<label class="check-label"><input type="checkbox" name="remember"> Continuar conectado neste aparelho</label>'}<button type="submit" class="button primary full" ${disabled?'disabled':''}>${mode==='signup'?'Criar minha conta':mode==='forgot'?'Enviar link de recuperação':'Entrar na minha casa'}</button></form><div class="auth-links">${mode==='login'?button('forgot','Esqueci minha senha','ghost'):mode==='forgot'?button('login','Voltar para entrar','ghost'):''}${button('demo','Conhecer uma casa de exemplo','ghost')}</div>${phase==='unconfigured'?'<details class="auth-config-details"><summary>Sou responsável pelo site</summary><p>Preencha o bloco FIREBASE_CONFIG no início do HTML, ative E-mail/senha, crie o Firestore e publique as regras fornecidas. O guia CONFIGURAR-FIREBASE-NETLIFY.txt acompanha o arquivo.</p></details>':''}`;
 $('#auth-card-body').innerHTML=body+'<p id="auth-error" class="auth-error" role="alert"></p><p id="auth-status" class="auth-status" role="status" aria-live="polite"></p>';
 if(phase==='unconfigured')$('#auth-form')?.querySelectorAll('input').forEach(el=>el.disabled=true);
 if(busy)$('#auth-card-body').querySelectorAll('button').forEach(el=>el.disabled=true);
}
function message(text,error=false){const el=$(error?'#auth-error':'#auth-status');if(el)el.textContent=text;}
function show(event){phase=event.phase;user=event.user||null;if(phase==='ready'){hide();return;}$('#auth-screen').hidden=phase==='loading';$('#app-loading').hidden=phase!=='loading';if(phase==='loading')$('#auth-card-body').innerHTML='';else{render();if(phase==='error')$('#auth-load-error').textContent=event.message||(typeof event.error==='string'?event.error:window.CasaCloud.errorMessage(event.error));}}
function hide(){$('#auth-screen').hidden=true;$('#app-loading').hidden=true;$('#auth-card-body').innerHTML='';}
async function run(fn,success=''){if(busy)return;busy=true;$('#auth-card-body').querySelectorAll('button').forEach(b=>b.disabled=true);message('');message('',true);try{await fn();if(success)message(success);}catch(e){message(window.CasaCloud.errorMessage(e),true);}finally{busy=false;$('#auth-card-body').querySelectorAll('[name=password]').forEach(i=>i.value='');$('#auth-card-body').querySelectorAll('[name=confirm]').forEach(i=>i.value='');$('#auth-card-body').querySelectorAll('button').forEach(b=>b.disabled=phase==='unconfigured'&&b.type==='submit');}}
function init(){if(initialized)return;initialized=true;$('#auth-mascot').src=window.CATATAU_IMAGE;let legacy=false;try{legacy=!!localStorage.getItem('ninho4j-home-v1');}catch{}$('#auth-legacy').hidden=!legacy;
 document.addEventListener('click',async event=>{const el=event.target.closest('[data-auth]');if(!el||busy)return;const action=el.dataset.auth;
 if(['login','signup','forgot'].includes(action)){mode=action;render();return;}
 if(action==='show-password'){const input=document.getElementById(el.dataset.target);input.type=input.type==='password'?'text':'password';el.textContent=input.type==='password'?'Mostrar':'Ocultar';el.setAttribute('aria-label',el.textContent+(input.name==='confirm'?' confirmação da senha':' senha'));el.setAttribute('aria-pressed',String(input.type==='text'));return;}
 if(action==='demo'){location.href=location.pathname+'?demo=1#inicio';return;}
 if(action==='legacy-export'){window.dispatchEvent(new Event('casa:export-legacy'));return;}
 if(action==='resend')await run(()=>window.CasaCloud.resendVerification(),'Confirmação reenviada. Confira seu e-mail.');
 if(action==='verified')await run(()=>window.CasaCloud.refreshUser());
 if(action==='signout')await run(()=>window.CasaCloud.signOut());
 if(action==='retry')await run(()=>window.CasaCloud.user?window.CasaCloud.refresh():window.CasaCloud.init(window.CasaOnAuthEvent));
 });
 document.addEventListener('submit',async event=>{if(event.target.id!=='auth-form')return;event.preventDefault();if(phase==='unconfigured'||busy)return;const f=new FormData(event.target),email=String(f.get('email')||'').trim(),password=String(f.get('password')||''),remember=f.has('remember');
 if(mode==='signup'&&password!==f.get('confirm')){message('As senhas precisam ser iguais.',true);return;}
 if(mode==='forgot'){await run(()=>window.CasaCloud.resetPassword(email),'Se houver uma conta para este e-mail, você receberá as instruções de recuperação.');return;}
 await run(()=>mode==='signup'?window.CasaCloud.signUp(String(f.get('name')||'').trim(),email,password,remember):window.CasaCloud.signIn(email,password,remember));
 });
}
window.CasaAuthUI={init,show,hide};
})();
