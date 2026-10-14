'use strict';
// Runtime checks with a small simulated DOM. This is not a browser or visual test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../outputs/index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!m[1].includes('src=')).map(m=>m[2]);
assert(scripts.length,'O HTML final deve conter scripts embutidos.');
const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
class Element {
  constructor(doc,tag,attrs={}){this.doc=doc;this.tagName=tag.toUpperCase();this.attrs={...attrs};this.children=[];this.parentElement=null;this.dataset={};this._text='';this._html='';this.hidden=false;this.open=false;this.value=attrs.value||'';this.checked=Object.hasOwn(attrs,'checked');this.files=[];this.selectionStart=0;this.listeners={};this.style={};this.className=attrs.class||'';this.classList={toggle:(name,force)=>{const all=new Set(this.className.split(/\s+/).filter(Boolean));const add=force===undefined?!all.has(name):force;if(add)all.add(name);else all.delete(name);this.className=[...all].join(' ');return add;}};for(const[k,v]of Object.entries(attrs)){if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;else if(['id','name','type','src','content'].includes(k))this[k]=v;}doc.nodes.add(this);}
  matches(sel){const m=sel.match(/^(?:([a-z][\w-]*))?(?:#([\w-]+)|\.([\w-]+))?(?:\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\])?$/i);if(!m)return false;return(!m[1]||this.tagName.toLowerCase()===m[1].toLowerCase())&&(!m[2]||this.id===m[2])&&(!m[3]||this.className.split(/\s+/).includes(m[3]))&&(!m[4]||(Object.hasOwn(this.attrs,m[4])&&(m[5]===undefined||this.attrs[m[4]]===m[5])));}
  closest(sel){for(let n=this;n;n=n.parentElement)if(n.matches(sel))return n;return null;}
  querySelectorAll(sel){const result=[];const visit=n=>{for(const c of n.children){if(c.matches(sel))result.push(c);visit(c);}};visit(this);return result;}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
  get isConnected(){return this.doc.nodes.has(this);}
  set innerHTML(value){for(const c of this.children)c.remove();this.children=[];this._html=String(value);this._text='';this.doc.parse(this,this._html);}
  get innerHTML(){return this._html;}
  set textContent(value){for(const c of this.children)c.remove();this.children=[];this._html='';this._text=String(value);}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  append(child){child.parentElement=this;this.children.push(child);this.doc.nodes.add(child);}
  remove(){for(const c of [...this.children])c.remove();this.doc.nodes.delete(this);if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='src')this.src=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);}
  focus(){this.doc.activeElement=this;}
  select(){this.selected=true;}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  click(){this.clicked=true;}
  getBoundingClientRect(){return{left:0,top:0,right:100,bottom:100};}
}
class Document {
  constructor(source){this.nodes=new Set();this.listeners={};this.root=new Element(this,'document');this.root.innerHTML=source;this.documentElement=this.querySelector('html');this.body=this.querySelector('body');this.activeElement=this.body;}
  parse(parent,source){const stack=[parent];for(const token of source.match(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g)||[]){if(token.startsWith('<!--'))continue;if(token.startsWith('</')){const tag=token.slice(2).match(/^\w+/)?.[0].toUpperCase();for(let i=stack.length-1;i>0;i--)if(stack[i].tagName===tag){stack.length=i;break;}continue;}if(token.startsWith('<')){const match=token.match(/^<([\w-]+)([\s\S]*?)\/?\s*>$/);if(!match)continue;const attrs={};for(const a of match[2].matchAll(/([^\s=/'"]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[a[1]]=decode(a[2]??a[3]??a[4]??'');const el=new Element(this,match[1],attrs);stack.at(-1).append(el);if(!voidTags.has(match[1].toLowerCase())&&!token.endsWith('/>'))stack.push(el);}else stack.at(-1)._text+=decode(token);}for(const select of parent.querySelectorAll('select')){const options=select.querySelectorAll('option'),chosen=options.find(o=>Object.hasOwn(o.attrs,'selected'))||options[0];select.value=chosen?(chosen.attrs.value??chosen.textContent):'';}for(const area of parent.querySelectorAll('textarea'))area.value=area.textContent;}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
  querySelectorAll(sel){return[...this.nodes].filter(n=>n.matches(sel));}
  createElement(tag){return new Element(this,tag);}
  addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);}
}
class FormDataMock {
  constructor(form){this.values=new Map();for(const field of form.querySelectorAll('[name]')){if(field.type==='checkbox'&&!field.checked)continue;this.values.set(field.name,field.type==='checkbox'?'on':field.value);}}
  get(name){return this.values.get(name)??null;}
  has(name){return this.values.has(name);}
}
function start(search='',storage=new Map()){
  const document=new Document(markup),events={};
  const location={search,hash:'',pathname:'/index.html',href:'/index.html'};
  const sandbox={document,location,console,URLSearchParams,Intl,Date,Math,JSON,Number,String,Set,Map,Array,Object,Error,RegExp,Promise,Blob,URL,FormData:FormDataMock,structuredClone,setTimeout:()=>1,clearTimeout:()=>{},navigator:{clipboard:{writeText:async()=>{}}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},scrollTo:()=>{},addEventListener:(name,fn)=>(events[name]||=[]).push(fn)};
  sandbox.window=sandbox;const context=vm.createContext(sandbox);
  scripts.forEach((source,i)=>new vm.Script(source,{filename:'final-html-script-'+i+'.js'}).runInContext(context));
  const $=sel=>document.querySelector(sel),all=sel=>document.querySelectorAll(sel);
  const dispatch=async(name,target)=>{const event={target,preventDefault(){this.defaultPrevented=true;}};for(const fn of document.listeners[name]||[])await fn(event);};
  const click=async(action,id)=>{const button=all('[data-action]').find(el=>el.dataset.action===action&&(id===undefined||el.dataset.id===id));assert(button,`Botão ${action} ${id||''} deve existir na interface atual`);await dispatch('click',button);};
  const nav=async(view)=>{const button=all('[data-nav]').find(el=>el.dataset.nav===view);assert(button,'Navegação '+view);await dispatch('click',button);};
  const state=()=>{const raw=storage.get(search?'ninho4j-demo-v1':'ninho4j-home-v1');return raw?JSON.parse(raw):context.NinhoEngine.initial(!!search);};
  const fields=(id,values)=>{const form=$('#'+id);assert(form,'Formulário '+id);for(const[name,value]of Object.entries(values)){const input=form.querySelector('[name="'+name+'"]');assert(input,'Campo '+name);if(input.type==='checkbox')input.checked=value;else input.value=String(value);}return form;};
  return{context,document,storage,$,all,click,nav,dispatch,state,fields};
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('✓ '+name);}
(async()=>{
  const app=start();
  await test('HTML final inicializa sem erro, com catálogo real e Catatau reutilizado',()=>{assert.equal(app.context.NinhoEngine.catalog.length,56);assert.match(app.$('#main').textContent,/Casa em dia/);assert(app.all('img[data-catatau]').every(i=>i.src===app.context.CATATAU_IMAGE));assert.equal(app.state().history.length,0);});
  await test('As quatro telas renderizam sem variáveis indefinidas',async()=>{for(const[view,title]of[['compras','Sua próxima compra'],['despensa','O que mora'],['historico','Os cuidados'],['inicio','Casa em dia']]){await app.nav(view);assert.match(app.$('#main').textContent,new RegExp(title));}});
  await test('Catálogo busca lenços e adiciona um item real à lista',async()=>{await app.click('catalog');const search=app.$('#catalog-search');search.value='lenços';await app.dispatch('input',search);assert.match(app.$('#catalog-results').textContent,/Lenços umedecidos/);await app.click('quick-add','lencos-umedecidos');assert.equal(app.state().list.length,1);await app.click('close-modal');});
  await test('Cancelar em formulário usa type=button e não altera os dados',async()=>{await app.nav('compras');const id=app.state().list[0].id;await app.click('edit-list',id);const form=app.$('#list-form'),cancel=form.querySelectorAll('[data-action]').find(b=>b.dataset.action==='close-modal');assert.equal(cancel.getAttribute('type'),'button');const before=JSON.stringify(app.state());await app.dispatch('click',cancel);assert.equal(app.$('#modal').open,false);assert.equal(JSON.stringify(app.state()),before);});
  await test('Quantidade, preço e observação do formulário são persistidos',async()=>{const id=app.state().list[0].id;await app.click('edit-list',id);await app.dispatch('submit',app.fields('list-form',{qty:2,price:12.9,note:'Sem perfume'}));assert.equal(app.state().list[0].qty,2);assert.equal(app.state().list[0].price,12.9);assert.equal(app.state().list[0].note,'Sem perfume');});
  await test('Troca de unidade é bloqueada quando o produto está na lista',async()=>{await app.nav('despensa');await app.click('edit-product','lencos-umedecidos');await app.dispatch('submit',app.fields('product-form',{unit:'caixa'}));assert.match(app.$('#form-error').textContent,/trocar a unidade/);assert.equal(app.state().products.find(p=>p.id==='lencos-umedecidos').unit,'pacote');await app.click('close-modal');});
  await test('Produto fracionário pode ter estoque, preço e validade cadastrados',async()=>{await app.click('edit-product','banana');await app.dispatch('submit',app.fields('product-form',{stock:0.5,min:0.3,target:1,price:6.99,expiry:'2026-12-31'}));assert.equal(app.state().products.find(p=>p.id==='banana').stock,0.5);await app.click('quick-add','banana');await app.nav('compras');const id=app.state().list.find(l=>l.productId==='banana').id;await app.click('edit-list',id);await app.dispatch('submit',app.fields('list-form',{qty:0.375,price:6.99}));assert.equal(app.state().list.find(l=>l.productId==='banana').qty,0.375);});
  await test('Checkout guarda apenas o marcado e registra centavos/estoque corretamente',async()=>{const id=app.state().list.find(l=>l.productId==='banana').id;await app.click('toggle',id);assert.equal(app.$('#toast').hidden,true);await app.click('checkout');assert.equal(app.$('#modal').open,true);await app.click('confirm-checkout');const s=app.state();assert.equal(s.history.length,1);assert.equal(s.history[0].total,2.62);assert.equal(s.products.find(p=>p.id==='banana').stock,0.875);assert.deepEqual(s.list.map(l=>l.productId),['lencos-umedecidos']);});
  await test('Troca de unidade também é bloqueada enquanto há estoque positivo',async()=>{await app.nav('despensa');await app.click('edit-product','banana');await app.dispatch('submit',app.fields('product-form',{unit:'un'}));assert.match(app.$('#form-error').textContent,/zere o estoque/);assert.equal(app.state().products.find(p=>p.id==='banana').unit,'kg');await app.click('close-modal');});
  await test('Histórico renderiza e repete as quantidades na mesma unidade',async()=>{await app.nav('historico');assert.match(app.$('#main').textContent,/Banana/);await app.click('repeat',app.state().history[0].id);assert.equal(app.state().list.find(l=>l.productId==='banana').qty,0.375);await app.click('remove-list',app.state().list.find(l=>l.productId==='banana').id);});
  await test('Histórico não converte quantidade após troca legítima de unidade',async()=>{await app.nav('despensa');await app.click('edit-product','banana');await app.dispatch('submit',app.fields('product-form',{stock:0}));await app.click('edit-product','banana');await app.dispatch('submit',app.fields('product-form',{unit:'un'}));assert.equal(app.state().products.find(p=>p.id==='banana').unit,'un');await app.nav('historico');await app.click('repeat',app.state().history[0].id);assert(!app.state().list.some(l=>l.productId==='banana'));assert.match(app.$('#toast').textContent,/1 item não foi adicionado/);});
  await test('Catatau abre sugestões e adiciona reposição sem erro de modal',async()=>{await app.click('catatau');assert.match(app.$('#modal').textContent,/Banana/);await app.click('suggest','banana');assert(app.state().list.some(l=>l.productId==='banana'));await app.click('close-modal');});
  await test('Tema e letras ampliadas persistem e são reaplicados ao abrir',async()=>{await app.click('settings');await app.click('theme');await app.click('large');assert.equal(app.document.documentElement.dataset.theme,'dark');assert.equal(app.document.documentElement.dataset.large,'true');const reopened=start('',app.storage);assert.equal(reopened.document.documentElement.dataset.theme,'dark');assert.equal(reopened.document.documentElement.dataset.large,'true');await app.click('close-modal');});
  await test('Restauração de backup aplica dados e aparência confirmados',async()=>{const backup=app.state();backup.settings={theme:'light',largeText:false,budget:123.45};backup.products.find(p=>p.id==='arroz').stock=7;const input=app.$('#import-file'),serialized=JSON.stringify(backup);input.files=[{size:Buffer.byteLength(serialized),text:async()=>serialized}];await app.dispatch('change',input);assert.match(app.$('#modal-title').textContent,/Restaurar/);await app.click('confirm-import');assert.equal(app.state().products.find(p=>p.id==='arroz').stock,7);assert.equal(app.document.documentElement.dataset.theme,'light');assert.equal(app.document.documentElement.dataset.large,'false');});
  await test('Demonstração usa dados e armazenamento separados da casa real',async()=>{const original=app.storage.get('ninho4j-home-v1'),demo=start('?demo=1',app.storage);assert.equal(demo.$('#demo-banner').hidden,false);await demo.click('catalog');await demo.click('quick-add','sabonete');assert(app.storage.has('ninho4j-demo-v1'));assert.equal(app.storage.get('ninho4j-home-v1'),original);assert.equal(demo.state().history.length,0);});
  await test('Storage corrompido é preservado e a interface oferece aviso',async()=>{const raw='{invalido',storage=new Map([['ninho4j-home-v1',raw]]),broken=start('',storage);assert.equal(broken.$('#save-warning').hidden,false);assert.match(broken.$('#save-warning').textContent,/não serão substituídos/);await broken.click('catalog');await broken.click('quick-add','arroz');assert.equal(storage.get('ninho4j-home-v1'),raw);});
  console.log('\n'+passed+' smoke tests passaram no DOM simulado (sem validação visual de navegador).');
})().catch(error=>{console.error(error);process.exitCode=1;});
