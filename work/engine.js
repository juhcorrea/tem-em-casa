(function (root, factory) {
  'use strict';
  var engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.NinhoEngine = engine;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var units = ['un', 'pacote', 'kg', 'L', 'caixa', 'rolo'];
  var categories = [
    { id: 'alimentos', name: 'Mercearia', icon: '🥫' },
    { id: 'hortifruti', name: 'Hortifruti', icon: '🥬' },
    { id: 'geladeira', name: 'Geladeira', icon: '🥛' },
    { id: 'limpeza', name: 'Limpeza', icon: '🧽' },
    { id: 'higiene', name: 'Higiene', icon: '🫧' },
    { id: 'cuidados', name: 'Cuidados', icon: '💛' },
    { id: 'casa', name: 'Casa', icon: '🏡' },
    { id: 'pets', name: 'Pets', icon: '🐾' }
  ];
  var categoryIds = categories.map(function (c) { return c.id; });
  var rows = [
    ['arroz','Arroz','alimentos','🍚','pacote',1,2,true],
    ['feijao','Feijão','alimentos','🫘','pacote',1,2,true],
    ['macarrao','Macarrão','alimentos','🍝','pacote',1,3,true],
    ['cafe','Café','alimentos','☕','pacote',1,2,true],
    ['acucar','Açúcar','alimentos','🍬','pacote',1,2,true],
    ['sal','Sal','alimentos','🧂','pacote',0,1,false],
    ['oleo','Óleo','alimentos','🫗','un',1,2,true],
    ['azeite','Azeite','alimentos','🫒','un',0,1,false],
    ['farinha','Farinha de trigo','alimentos','🌾','pacote',0,1,false],
    ['aveia','Aveia','alimentos','🥣','pacote',0,1,true],
    ['molho-tomate','Molho de tomate','alimentos','🥫','un',1,3,true],
    ['biscoito','Biscoito','alimentos','🍪','pacote',1,2,true],
    ['pao','Pão','alimentos','🍞','pacote',0,1,true],
    ['banana','Banana','hortifruti','🍌','kg',0.5,1.5,true],
    ['maca','Maçã','hortifruti','🍎','kg',0.5,1,true],
    ['laranja','Laranja','hortifruti','🍊','kg',0.5,1,true],
    ['tomate','Tomate','hortifruti','🍅','kg',0.3,1,true],
    ['cebola','Cebola','hortifruti','🧅','kg',0.3,1,true],
    ['batata','Batata','hortifruti','🥔','kg',0.5,1.5,true],
    ['cenoura','Cenoura','hortifruti','🥕','kg',0.3,1,true],
    ['alface','Alface','hortifruti','🥬','un',0,1,true],
    ['alho','Alho','hortifruti','🧄','un',1,3,true],
    ['leite','Leite','geladeira','🥛','L',2,6,true],
    ['ovos','Ovos','geladeira','🥚','un',6,12,true],
    ['manteiga','Manteiga','geladeira','🧈','un',0,1,true],
    ['queijo','Queijo','geladeira','🧀','kg',0.1,0.5,true],
    ['iogurte','Iogurte','geladeira','🥣','un',2,6,true],
    ['frango','Frango','geladeira','🍗','kg',0.5,2,true],
    ['carne','Carne','geladeira','🥩','kg',0.5,2,true],
    ['detergente','Detergente','limpeza','🧴','un',1,3,true],
    ['esponja','Esponja de louça','limpeza','🧽','un',1,3,true],
    ['sabao-roupas','Sabão para roupas','limpeza','🧺','un',1,2,true],
    ['amaciante','Amaciante','limpeza','🌸','un',0,1,true],
    ['desinfetante','Desinfetante','limpeza','🪣','L',1,2,true],
    ['agua-sanitaria','Água sanitária','limpeza','🧴','L',1,2,true],
    ['multiuso','Limpador multiuso','limpeza','✨','un',0,1,true],
    ['saco-lixo','Saco de lixo','limpeza','🗑️','pacote',1,2,true],
    ['pano-limpeza','Pano de limpeza','limpeza','🧹','un',1,3,false],
    ['sabonete','Sabonete','higiene','🧼','un',2,6,true],
    ['papel-higienico','Papel higiênico','higiene','🧻','rolo',4,12,true],
    ['creme-dental','Creme dental','higiene','🪥','un',1,2,true],
    ['escova-dental','Escova de dentes','higiene','🪥','un',0,2,false],
    ['shampoo','Shampoo','higiene','🧴','un',0,1,true],
    ['condicionador','Condicionador','higiene','🧴','un',0,1,true],
    ['desodorante','Desodorante','higiene','🫧','un',0,1,true],
    ['absorvente','Absorvente','higiene','🌷','pacote',1,2,true],
    ['lencos-umedecidos','Lenços umedecidos','cuidados','💧','pacote',1,3,true],
    ['fraldas','Fraldas','cuidados','👶','pacote',1,2,true],
    ['algodao','Algodão','cuidados','☁️','pacote',0,1,false],
    ['hastes-flexiveis','Hastes flexíveis','cuidados','🌼','caixa',0,1,false],
    ['papel-toalha','Papel toalha','casa','🧻','rolo',1,2,true],
    ['guardanapos','Guardanapos','casa','🍽️','pacote',0,1,true],
    ['papel-aluminio','Papel alumínio','casa','🍴','rolo',0,1,false],
    ['pilhas','Pilhas','casa','🔋','pacote',0,1,false],
    ['racao','Ração','pets','🐾','kg',1,3,true],
    ['areia-gatos','Areia para gatos','pets','🐈','pacote',1,2,true]
  ];
  var catalog = rows.map(function (r) {
    return { id:r[0], name:r[1], category:r[2], icon:r[3], unit:r[4], min:r[5], target:r[6], frequent:r[7], stock:null, price:0, expiry:'', interval:0, lastBought:'' };
  });
  var MAX_VALUE = 1000000;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function makeId(prefix) { return (prefix || 'item') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9); }
  function fail(message) { throw new Error(message || 'Arquivo de backup inválido.'); }
  function object(value, label) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail((label || 'Registro') + ' inválido.'); return value; }
  function numeric(value, fallback, max, precision) {
    if (value === undefined) value = fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > (max || MAX_VALUE)) fail('Quantidade ou valor inválido.');
    var factor = Math.pow(10, precision === undefined ? 3 : precision);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
  function textValue(value, fallback, max, required) {
    if (value === undefined) value = fallback;
    if (typeof value !== 'string') fail('Texto inválido no backup.');
    value = value.trim();
    if (value.length > max || (required && !value)) fail('Texto vazio ou longo demais no backup.');
    return value;
  }
  function idValue(value) {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) fail('Identificador inválido.');
    return value;
  }
  function booleanValue(value, fallback) { if (value === undefined) return fallback; if (typeof value !== 'boolean') fail('Opção inválida no backup.'); return value; }
  function dateValue(value) {
    if (value === undefined || value === '') return '';
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Data inválida. Use AAAA-MM-DD.');
    var p = value.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    if (p[0] < 1900 || p[0] > 2200 || d.getUTCFullYear() !== p[0] || d.getUTCMonth() !== p[1]-1 || d.getUTCDate() !== p[2]) fail('Data inválida.');
    return value;
  }
  function localDate(now) {
    if (typeof now === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(now)) return dateValue(now);
    var d = now === undefined ? new Date() : new Date(now);
    if (!Number.isFinite(d.getTime())) fail('Data inválida.');
    return dateValue(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
  }
  function dayNumber(value) { var p = dateValue(value).split('-').map(Number); return Date.UTC(p[0],p[1]-1,p[2]) / 86400000; }
  function daysBetween(earlier, later) { if (!earlier || !later) return null; return dayNumber(localDate(later)) - dayNumber(dateValue(earlier)); }
  function lineCents(qty, price) {
    var thousandths=Math.round(qty*1000), cents=Math.round(price*100);
    // Split whole and fractional quantities to avoid oversized intermediate products.
    return Math.floor(thousandths/1000)*cents + Math.round((thousandths%1000)*cents/1000);
  }
  function lineTotal(itemOrQty, price) { return typeof itemOrQty === 'object' ? lineCents(itemOrQty.qty,itemOrQty.price)/100 : lineCents(itemOrQty,price)/100; }
  function money(value) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value || 0); }
  function productValue(raw) {
    object(raw,'Produto');
    var category = textValue(raw.category,'casa',30,true), unit = textValue(raw.unit,'un',20,true);
    if (categoryIds.indexOf(category) === -1 || units.indexOf(unit) === -1) fail('Categoria ou unidade inválida.');
    var min = numeric(raw.min,0,100000), target = numeric(raw.target,Math.max(1,min),100000);
    if (target < min) fail('O estoque ideal deve ser maior ou igual ao mínimo.');
    return { id:idValue(raw.id), name:textValue(raw.name,'',100,true), category:category, icon:textValue(raw.icon,'📦',24,true), unit:unit, min:min, target:target, frequent:booleanValue(raw.frequent,false), stock:raw.stock === null || raw.stock === undefined ? null : numeric(raw.stock,0,100000), price:numeric(raw.price,0,MAX_VALUE,2), expiry:dateValue(raw.expiry), interval:numeric(raw.interval,0,3650,0), lastBought:dateValue(raw.lastBought) };
  }
  function initial(demo) {
    var state = { version:1, products:clone(catalog), list:[], history:[], settings:{theme:'light',largeText:false,budget:0} };
    if (demo) {
      var demoStocks = { arroz:1,feijao:0,cafe:1,leite:2,ovos:6,banana:0.4,detergente:1,'papel-higienico':3,sabonete:2,'lencos-umedecidos':1,'sabao-roupas':1 };
      var demoPrices = { arroz:24.9,feijao:8.49,cafe:22.9,leite:5.49,ovos:0.9,banana:6.99,detergente:2.89,'papel-higienico':1.79,sabonete:2.49,'lencos-umedecidos':12.9,'sabao-roupas':18.9 };
      state.products.forEach(function(p) { if (Object.prototype.hasOwnProperty.call(demoStocks,p.id)) { p.stock=demoStocks[p.id]; p.price=demoPrices[p.id]; } });
      ['feijao','leite','lencos-umedecidos','detergente'].forEach(function(id) { state = addToList(state,id,id === 'leite' ? 4 : id === 'detergente' ? 2 : 1); });
      state.settings.budget=200;
    }
    return state;
  }
  function findProduct(state,id) { var p = state.products.find(function(p){return p.id===id;}); if (!p) fail('Produto não encontrado.'); return p; }
  function findEntry(state,id) { return state.list.find(function(x){return x.id===id || x.productId===id;}); }
  function positiveQty(qty) { qty=numeric(qty,1,100000); if (qty<=0) fail('Informe uma quantidade maior que zero.'); return qty; }
  function addToList(state, productId, qty) {
    var product=findProduct(state,productId), amount=positiveQty(qty), next=clone(state), entry=next.list.find(function(x){return x.productId===productId;});
    if (entry) entry.qty=positiveQty(entry.qty+amount);
    else next.list.push({id:makeId('lista'),productId:productId,qty:amount,price:product.price,checked:false,note:''});
    return next;
  }
  function setListQty(state,id,qty) {
    var amount=positiveQty(qty), next=clone(state), entry=findEntry(next,id);
    if (!entry) fail('Item não encontrado na lista.');
    entry.qty=amount;
    return next;
  }
  function toggleChecked(state,id) { var next=clone(state), entry=findEntry(next,id); if (!entry) fail('Item não encontrado na lista.'); entry.checked=!entry.checked; return next; }
  function removeFromList(state,id) { var next=clone(state); next.list=next.list.filter(function(x){return x.id!==id && x.productId!==id;}); return next; }
  function updateProduct(state,product) {
    var next=clone(state), index=next.products.findIndex(function(p){return p.id===product.id;});
    var value=productValue(index===-1 ? product : Object.assign({},next.products[index],product));
    if (index===-1) next.products.push(value); else next.products[index]=value;
    return next;
  }
  function consume(state,id,qty) {
    var amount=positiveQty(qty), next=clone(state), product=findProduct(next,id);
    if (product.stock===null) fail('Informe o estoque atual antes de registrar o uso.');
    product.stock=numeric(Math.max(0,product.stock-amount),0,100000);
    return next;
  }
  function total(state,checkedOnly) { return state.list.reduce(function(sum,item){return sum+(!checkedOnly || item.checked ? lineCents(item.qty,item.price) : 0);},0)/100; }
  function checkout(state,now) {
    var next=clone(state), checked=next.list.filter(function(x){return x.checked;});
    if (!checked.length) return next;
    var date=localDate(now), items=checked.map(function(item){
      var product=findProduct(next,item.productId);
      product.stock=numeric((product.stock===null ? 0 : product.stock)+item.qty,0,100000);
      product.lastBought=date;
      product.price=numeric(item.price,0,MAX_VALUE,2);
      return {productId:product.id,name:product.name,icon:product.icon,qty:item.qty,unit:product.unit,price:item.price};
    });
    next.history.unshift({id:makeId('compra'),date:date,items:items,total:items.reduce(function(sum,x){return sum+lineCents(x.qty,x.price);},0)/100});
    next.list=next.list.filter(function(x){return !x.checked;});
    return next;
  }
  function suggestions(state,now) {
    var today=localDate(now), listed=new Set(state.list.map(function(x){return x.productId;}));
    return state.products.filter(function(p){return !listed.has(p.id);}).map(function(p){
      if (p.stock!==null && p.stock<=p.min) return {productId:p.id,reason:p.stock===0?'empty':'low',qty:numeric(Math.max(p.unit==='kg' || p.unit==='L' ? 0.1 : 1,p.target-p.stock),1,100000),message:p.stock===0?'Acabou na despensa.':'Está no mínimo ou abaixo dele.'};
      if (p.frequent && p.interval>0 && p.lastBought && daysBetween(p.lastBought,today)>=p.interval) return {productId:p.id,reason:'routine',qty:1,message:'Já faz '+daysBetween(p.lastBought,today)+' dias da última compra. Confira se precisa repor.'};
      return null;
    }).filter(Boolean).sort(function(a,b){var rank={empty:0,low:1,routine:2};return rank[a.reason]-rank[b.reason];});
  }
  function validate(raw) {
    object(raw,'Backup');
    if (raw.version!==1 || !Array.isArray(raw.products) || !Array.isArray(raw.list) || !Array.isArray(raw.history)) fail('Formato de backup incompatível.');
    if (raw.products.length>2000 || raw.list.length>2000 || raw.history.length>5000) fail('O backup excede o limite de registros.');
    var products=raw.products.map(productValue), ids=new Set();
    products.forEach(function(p){if(ids.has(p.id))fail('Há produtos duplicados no backup.');ids.add(p.id);});
    var listIds=new Set(), listedProducts=new Set();
    var list=raw.list.map(function(rawItem){
      object(rawItem,'Item da lista');
      var id=idValue(rawItem.id), productId=idValue(rawItem.productId);
      if(!ids.has(productId) || listIds.has(id) || listedProducts.has(productId))fail('A lista tem um produto desconhecido ou duplicado.');
      listIds.add(id);listedProducts.add(productId);
      return {id:id,productId:productId,qty:positiveQty(rawItem.qty),price:numeric(rawItem.price,0,MAX_VALUE,2),checked:booleanValue(rawItem.checked,false),note:textValue(rawItem.note,'',300,false)};
    });
    var historyIds=new Set();
    var history=raw.history.map(function(record){
      object(record,'Compra');
      var id=idValue(record.id), date=dateValue(record.date);
      if(!date || historyIds.has(id) || !Array.isArray(record.items) || !record.items.length || record.items.length>2000) fail('Compra inválida no histórico.');
      historyIds.add(id);
      var itemIds=new Set();
      var items=record.items.map(function(item){
        object(item,'Produto do histórico');
        var productId=idValue(item.productId), unit=textValue(item.unit,'un',20,true);
        if(units.indexOf(unit)===-1 || itemIds.has(productId))fail('Unidade ou produto duplicado inválido no histórico.');
        itemIds.add(productId);
        return {productId:productId,name:textValue(item.name,'',100,true),icon:textValue(item.icon,'📦',24,true),qty:positiveQty(item.qty),unit:unit,price:numeric(item.price,0,MAX_VALUE,2)};
      });
      var sum=items.reduce(function(n,x){return n+lineCents(x.qty,x.price);},0)/100;
      if(typeof record.total!=='number' || !Number.isFinite(record.total) || Math.abs(record.total-sum)>0.009)fail('O total de uma compra não confere.');
      return {id:id,date:date,items:items,total:sum};
    });
    var settings=object(raw.settings,'Configurações'), theme=settings.theme===undefined?'light':settings.theme;
    if(theme!=='light' && theme!=='dark')fail('Tema inválido.');
    return {version:1,products:products,list:list,history:history,settings:{theme:theme,largeText:booleanValue(settings.largeText,false),budget:numeric(settings.budget,0,MAX_VALUE,2)}};
  }

  return {catalog:catalog,categories:categories,units:units,initial:initial,addToList:addToList,setListQty:setListQty,toggleChecked:toggleChecked,removeFromList:removeFromList,updateProduct:updateProduct,consume:consume,checkout:checkout,suggestions:suggestions,validate:validate,total:total,money:money,makeId:makeId,localDate:localDate,daysBetween:daysBetween,lineTotal:lineTotal};
});
