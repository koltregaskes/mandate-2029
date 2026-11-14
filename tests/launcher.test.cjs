const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('npm start uses the dependency-free existing Node launcher',()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
 assert.equal(pkg.scripts.start,'node scripts/review-server.js');
 assert.equal(Object.keys(pkg.dependencies||{}).length,0);
});
test('launcher serves the fresh checkout without binding a socket',async()=>{
 let handler,listening; const server={listen:(...args)=>{listening=args;},close:()=>{}};
 const code=fs.readFileSync(path.join(root,'scripts/review-server.js'),'utf8');
 const sandbox={require:id=>id==='http'?{createServer:fn=>{handler=fn;return server;}}:require(id),process:{argv:['node','scripts/review-server.js'],cwd:()=>root,on:()=>{}},console,URL};
 vm.runInNewContext(code,sandbox,{filename:'review-server.js'});
 assert.equal(listening[0],8011);assert.equal(listening[1],'127.0.0.1');
 for(const [url,type,fragment] of [['/','text/html','Mandate 2029'],['/app.js','application/javascript','UKDemocracySimulator'],['/style.css','text/css','.app-container']]){
  const res=await new Promise(resolve=>{const r={headers:{},setHeader:(k,v)=>{r.headers[k]=v;},end:body=>resolve({...r,body:String(body)})};handler({url,headers:{host:'127.0.0.1:8011'}},r);});
  assert.equal(res.statusCode,200,url);assert.ok(res.headers['Content-Type'].startsWith(type));assert.ok(res.body.includes(fragment));
 }
});
