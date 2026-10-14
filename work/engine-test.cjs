'use strict';
const assert = require('node:assert/strict');
const E = require('./engine.js');
let count=0;
function test(name,fn){fn();count++;console.log('✓ '+name);}
const base=E.initial();
test('56 produtos, todos com estoque desconhecido; estado inicial sem compras fictícias',()=>{
  assert.equal(base.products.length,56);assert(base.products.every(p=>p.stock===null));assert.equal(base.list.length,0);assert.equal(base.history.length,0);assert.equal(E.suggestions(base).length,0);
  assert(base.products.some(p=>p.id==='sabonete'));assert(base.products.some(p=>p.id==='lencos-umedecidos'));assert.deepEqual(E.validate(base),base);
});
test('Adicionar o mesmo produto acumula quantidade sem duplicar ou mutar original',()=>{
  const frozen=JSON.stringify(base);let s=E.addToList(base,'arroz',1);const original=JSON.stringify(s);let next=E.addToList(s,'arroz',2);
  assert.equal(next.list.length,1);assert.equal(next.list[0].qty,3);assert.equal(JSON.stringify(s),original);assert.equal(JSON.stringify(base),frozen);
});
test('Quantidade fracionária mantém precisão e arredonda cada subtotal em centavos',()=>{
  let s=E.updateProduct(base,{id:'banana',price:6.99});s=E.addToList(s,'banana',0.125);s=E.addToList(s,'banana',0.25);assert.equal(s.list[0].qty,0.375);assert.equal(E.total(s),2.62);
  s=E.setListQty(s,'banana',0.5);assert.equal(E.total(s),3.5);assert.equal(E.lineTotal(0.5,6.99),3.5);
});
test('Finalizar só marcados aumenta estoque e registra data, preço e total; repetir é idempotente',()=>{
  let s=E.updateProduct(base,{id:'arroz',stock:2,price:24.9});s=E.addToList(s,'arroz',2);s=E.addToList(s,'leite',4);s=E.toggleChecked(s,'arroz');const original=JSON.stringify(s);
  const result=E.checkout(s,'2026-10-13');assert.equal(result.products.find(p=>p.id==='arroz').stock,4);assert.equal(result.products.find(p=>p.id==='arroz').lastBought,'2026-10-13');assert.equal(result.list.length,1);assert.equal(result.list[0].productId,'leite');assert.equal(result.history.length,1);assert.equal(result.history[0].total,49.8);assert.deepEqual(E.checkout(result,'2026-10-13'),result);assert.equal(JSON.stringify(s),original);assert.deepEqual(E.validate(result),result);
});
test('Compra de estoque desconhecido começa em zero; total de 0,10 + 0,20 é 0,30',()=>{
  let s=E.updateProduct(base,{id:'arroz',price:0.1});s=E.updateProduct(s,{id:'leite',price:0.2});s=E.addToList(s,'arroz');s=E.addToList(s,'leite');s=E.toggleChecked(s,'arroz');s=E.toggleChecked(s,'leite');assert.equal(E.total(s,true),0.3);s=E.checkout(s,'2026-10-13');assert.equal(s.history[0].total,0.3);assert.equal(s.products.find(p=>p.id==='arroz').stock,1);
});
test('Sugestões: baixo/zero, rotina, sem duplicar lista e sem inferir falta em estoque desconhecido',()=>{
  let s=E.updateProduct(base,{id:'arroz',stock:0});s=E.updateProduct(s,{id:'cafe',stock:1});s=E.updateProduct(s,{id:'sabonete',lastBought:'2026-10-01',interval:12});
  let suggestions=E.suggestions(s,'2026-10-13');assert.equal(suggestions.length,3);assert.equal(suggestions.find(x=>x.productId==='arroz').reason,'empty');assert.equal(suggestions.find(x=>x.productId==='cafe').reason,'low');assert.equal(suggestions.find(x=>x.productId==='sabonete').reason,'routine');
  s=E.addToList(s,'arroz');assert(!E.suggestions(s,'2026-10-13').some(x=>x.productId==='arroz'));assert(!suggestions.some(x=>x.productId==='feijao'));
});
test('Consumir nunca fica negativo e não altera estado original; desconhecido exige inventário',()=>{
  const s=E.updateProduct(base,{id:'leite',stock:1});const next=E.consume(s,'leite',2);assert.equal(next.products.find(p=>p.id==='leite').stock,0);assert.equal(s.products.find(p=>p.id==='leite').stock,1);assert.throws(()=>E.consume(base,'leite'));assert.throws(()=>E.consume(s,'leite',-1));
});
test('Datas sem deriva de fuso e limites de ano bissexto',()=>{
  assert.equal(E.localDate('2026-10-13'),'2026-10-13');assert.equal(E.daysBetween('2026-10-01','2026-10-13'),12);assert.equal(E.daysBetween('2024-02-28','2024-03-01'),2);assert.throws(()=>E.localDate('2026-02-29'));
});
test('Backup inválido, IDs duplicados, referência ausente e preço negativo são rejeitados',()=>{
  assert.throws(()=>E.validate({}));assert.throws(()=>E.validate({...base,version:2}));
  assert.throws(()=>E.validate({...base,products:[base.products[0],base.products[0]]}));
  assert.throws(()=>E.validate({...base,list:[{id:'x',productId:'ausente',qty:1,price:1}]}));
  const s=E.addToList(base,'arroz');assert.throws(()=>E.validate({...s,list:[s.list[0],{...s.list[0],id:'outro'}]}));
  assert.throws(()=>E.validate({...base,products:[{...base.products[0],price:-1}]}));
  assert.throws(()=>E.validate({...base,products:[{...base.products[0],target:0,min:1}]}));
  assert.throws(()=>E.validate({...base,products:[{...base.products[0],category:'estranho'}]}));
});
test('Importação copia somente campos permitidos e preserva histórico mesmo sem produto no catálogo',()=>{
  let s=E.addToList(base,'arroz');s=E.toggleChecked(s,'arroz');s=E.checkout(s,'2026-10-13');s.products=s.products.filter(p=>p.id!=='arroz');s.untrusted='<script>';s.settings.untrusted=true;
  const imported=E.validate(s);assert.equal(imported.untrusted,undefined);assert.equal(imported.settings.untrusted,undefined);assert.equal(imported.history.length,1);s.history[0].total=123;assert.throws(()=>E.validate(s));
});
test('Demo válido, isolado do catálogo e do estado em branco',()=>{
  const demo=E.initial(true);assert.deepEqual(E.validate(demo),demo);assert(demo.list.length>0);assert(E.initial().products.every(p=>p.stock===null));assert(E.catalog.every(p=>p.stock===null));
});
test('Fluxo do formulário: preço editado, compra fracionária e preferências sobrevivem ao backup',()=>{
  let s=E.updateProduct(base,{id:'banana',stock:0.125,price:5});s=E.addToList(s,'banana');s=E.setListQty(s,'banana',0.375);
  s.list=s.list.map(l=>({...l,price:6.99,note:'Madura para hoje'}));s.settings={theme:'dark',largeText:true,budget:199.99};
  s=E.validate(JSON.parse(JSON.stringify(s)));assert.deepEqual(s.settings,{theme:'dark',largeText:true,budget:199.99});assert.equal(s.list[0].note,'Madura para hoje');assert.equal(E.total(s),2.62);
  s=E.toggleChecked(s,'banana');s=E.checkout(s,'2026-10-13');assert.equal(s.products.find(p=>p.id==='banana').stock,0.5);assert.equal(s.products.find(p=>p.id==='banana').price,6.99);assert.equal(s.history[0].items[0].qty,0.375);assert.equal(s.history[0].total,2.62);assert.deepEqual(E.validate(JSON.parse(JSON.stringify(s))),s);
});
test('Validade usa dias futuros positivos e vencidos negativos, inclusive na virada do ano',()=>{
  assert.equal(E.daysBetween('2026-10-13','2026-10-20'),7);assert.equal(E.daysBetween('2026-10-13','2026-10-12'),-1);assert.equal(E.daysBetween('2026-12-30','2027-01-03'),4);assert.equal(E.localDate(new Date(2026,9,13,0,30)),'2026-10-13');
});
console.log('\n'+count+' testes passaram.');
