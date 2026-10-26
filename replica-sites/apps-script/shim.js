/* Shim: fa girare il Gestionale (scritto per l'ambiente Claude) dentro Google Apps Script.
   Riproduce claude.use("db") e claude.use("sample") appoggiandosi a Code.gs. */
(function(){
  var run=window.google&&google.script&&google.script.run;
  function call(fn){var a=[].slice.call(arguments,1);return new Promise(function(ok,ko){
    if(!run){ko(new Error("Apps Script non disponibile: apri la pagina dall'indirizzo della web app"));return}
    run.withSuccessHandler(ok).withFailureHandler(function(e){ko(new Error((e&&e.message)||String(e)))})[fn].apply(run,a)})}
  /* ---------- db ---------- */
  var cache={}, subs={}, ver=null, polling=false;
  function snap(col){var m=cache[col]||{};return {docs:Object.keys(m).map(function(id){return {id:id,data:function(){return JSON.parse(JSON.stringify(m[id]))}}})}}
  function notify(col){(subs[col]||[]).forEach(function(s){try{s.ok(snap(col))}catch(e){console.error(e)}})}
  function load(col){return call("api","list",col).then(function(r){cache[col]=r||{};notify(col)})}
  function poll(){ if(polling)return; polling=true; setInterval(function(){ if(document.hidden)return;
    call("api","ver").then(function(v){ if(v!==ver){ver=v; Object.keys(subs).forEach(load)} }).catch(function(){}) },15000)}
  function setPath(o,path,val){var p=path.split("."),c=o;for(var i=0;i<p.length-1;i++){if(typeof c[p[i]]!=="object"||c[p[i]]===null)c[p[i]]={};c=c[p[i]]}
    if(val&&val.__delete__)delete c[p[p.length-1]];else c[p[p.length-1]]=val}
  function split(path){var i=path.indexOf("/");return [path.slice(0,i),path.slice(i+1)]}
  function write(op,path,data){var s=split(path),col=s[0],id=s[1]; cache[col]=cache[col]||{};
    if(op==="delete")delete cache[col][id];
    else if(op==="set")cache[col][id]=JSON.parse(JSON.stringify(data));
    else{var cur=cache[col][id]||{};Object.keys(data).forEach(function(k){setPath(cur,k,data[k])});cache[col][id]=cur}
    notify(col);
    return call("api","write",op,col,id,data===undefined?null:data).then(function(v){ver=v}).catch(function(e){load(col);throw e})}
  var db={
    collection:function(col){return {onSnapshot:function(ok,ko){subs[col]=subs[col]||[];subs[col].push({ok:ok,ko:ko});poll();
      if(cache[col])setTimeout(function(){ok(snap(col))},0);else load(col).catch(function(e){if(ko)ko(e)})}}},
    doc:function(path){return {
      get:function(){var s=split(path);return Promise.resolve({exists:!!(cache[s[0]]&&cache[s[0]][s[1]]),data:function(){return cache[s[0]]&&cache[s[0]][s[1]]}})},
      set:function(d){return write("set",path,d)},update:function(d){return write("update",path,d)},delete:function(){return write("delete",path)}}}};
  /* ---------- sample (LLM con strumenti, eseguiti nel browser) ---------- */
  function toData(b){return new Promise(function(ok,ko){var r=new FileReader();r.onload=function(){ok(r.result)};r.onerror=ko;r.readAsDataURL(b)})}
  async function sample(input,opts){
    opts=opts||{};
    var turns=typeof input==="string"?[{role:"user",content:input}]:input.map(function(t){return {role:t.role,content:t.content}});
    var msgs=turns.map(function(t){return {role:t.role,content:t.content}});
    if(opts.images){var L=opts.images.length!==undefined?Array.prototype.slice.call(opts.images):[opts.images];
      var urls=await Promise.all(L.map(toData)); var last=msgs[msgs.length-1];
      last.content=[{type:"text",text:last.content}].concat(urls.map(function(u){return {type:"image_url",image_url:{url:u}}}))}
    var tools=opts.tools||[], tdef=tools.map(function(t){return {type:"function",function:{name:t.name,description:t.description||"",parameters:t.inputSchema||{type:"object",properties:{}}}}});
    var text="";
    for(var round=0;round<6;round++){
      if(opts.signal&&opts.signal.aborted){var e0=new Error("cancelled");e0.code="cancelled";e0.text=text;throw e0}
      var m;
      try{m=await call("api","llm",{messages:msgs,tools:tdef,tier:opts.modelTier||"quick"})}
      catch(err){var e=new Error(err.message);e.code=/429|rate/i.test(err.message)?"rate_limited":"error";e.text=text;throw e}
      if(m.content){text=m.content; if(opts.onText)opts.onText({text:text,delta:m.content})}
      if(!m.tool_calls||!m.tool_calls.length)break;
      msgs.push({role:"assistant",content:m.content||null,tool_calls:m.tool_calls});
      for(var i=0;i<m.tool_calls.length;i++){var tc=m.tool_calls[i], t=tools.filter(function(x){return x.name===tc.function.name})[0], out;
        try{var args={};try{args=JSON.parse(tc.function.arguments||"{}")}catch(x){} out=t?await t.execute(args):"strumento sconosciuto"}catch(er){out="Errore: "+((er&&er.message)||er)}
        msgs.push({role:"tool",tool_call_id:tc.id,content:typeof out==="string"?out:JSON.stringify(out)})}
    }
    return {text:text,truncated:false}}
  sample.limits=async function(){return {maxPromptBytes:200000,tools:{maxCount:12},images:{maxCount:1,mediaTypes:["image/jpeg","image/png","image/webp"]}}};
  window.claude={use:async function(n){if(n==="db")return db; if(n==="sample")return sample; return null}};
})();
