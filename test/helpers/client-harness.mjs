import fs from 'node:fs';
import vm from 'node:vm';

// Run the actual registered component and its callbacks with a small hook
// scheduler. This tests dataflow, not browser layout or native DSH integration.
export function clientHarness({effort='max',defaultEffort='high',sessionsApi,sourceFile}={}) {
  const hooks=[],effects=[],timers=new Map(),requests=[],selections=[];
  let cursor=0,renderNeeded=true,tree,registered,busy=false,nextTimer=1;
  let server={enabled:false,fast:false,topEffortId:null},failWrites=false,probeFails=false,pauseFast=false;
  const fastWaiters=[];
  const snapshot={groups:[{id:'provider-a',name:'Provider',models:[{id:'model-a',name:'Model',reasoning:{defaultEffort,efforts:['off','low','high','max'].map(id=>({id}))}}]}],current:{provider:'provider-a',model:'model-a',reasoningEffort:effort}};
  const props={directory:{subscribe(){return()=>{}},getSnapshot(){return snapshot}},available:true,locked:false,sessionId:'session-a',load(){},t:key=>key,async select(next){selections.push({...next});snapshot.current={...next};renderNeeded=true;return{ok:true}}};
  const React={
    createElement(type,props,...children){return{type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined)}},
    useState(initial){const i=cursor++;if(!hooks[i])hooks[i]={kind:'state',value:typeof initial==='function'?initial():initial};return[hooks[i].value,value=>{const next=typeof value==='function'?value(hooks[i].value):value;if(!Object.is(next,hooks[i].value)){hooks[i].value=next;renderNeeded=true}}]},
    useRef(initial){const i=cursor++;if(!hooks[i])hooks[i]={kind:'ref',current:initial};return hooks[i]},
    useEffect(fn,deps){const i=cursor++,old=hooks[i];const changed=!old||!deps||deps.some((d,n)=>!Object.is(d,old.deps?.[n]));if(changed){effects.push(()=>{old?.cleanup?.();const cleanup=fn();hooks[i].cleanup=typeof cleanup==='function'?cleanup:undefined});hooks[i]={kind:'effect',deps}}},
    useLayoutEffect(){cursor++},
    useSyncExternalStore(_subscribe,get){return get()},
  };
  const document={body:{},addEventListener(){},removeEventListener(){}};
  const sandbox={window:{__ModuleLoader__:{load(mod){registered=mod}}},document,navigator:{language:'en'},console,Node:class{},performance,
    setInterval(fn){const id=nextTimer++;timers.set(id,fn);return id},clearInterval(id){timers.delete(id)},setTimeout(){return nextTimer++},clearTimeout(){},requestAnimationFrame(){return 0},cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}},
    async fetch(url,options={}){requests.push({url,method:options.method||'GET',body:options.body?JSON.parse(options.body):undefined});if(options.method==='POST'){if(failWrites)throw Error('fixture write failure');const body=JSON.parse(options.body);if(pauseFast&&typeof body.fast==='boolean')await new Promise(resolve=>fastWaiters.push(resolve));if(typeof body.enabled==='boolean'){server.enabled=body.enabled;server.topEffortId=body.enabled?body.topEffortId:null}if(typeof body.fast==='boolean')server.fast=body.fast;}return{async json(){return{ok:true,...server,pluginEnabled:true}}}},
  };
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(sourceFile || new URL('../../client.js',import.meta.url),'utf8'),sandbox,{filename:'client.js'});
  const mod=registered.factory(name=>{if(name==='react')return React;if(name==='react-dom')return{createPortal:node=>node};throw Error('Unexpected dependency '+name)});
  let Component;
  mod.apply({sessions:sessionsApi || {turnOf(){if(probeFails)throw Error('fixture probe unavailable');return busy},subagentAddress(){}},modelDirectories:{directoryFor(){return{store:props.directory,load(){},select:props.select}}},locale:{register(){}},effect(fn){return fn()},slots:{inject(_name,fn){return fn()},register(_options,component){Component=component;return()=>{}}}});
  function render(){cursor=0;renderNeeded=false;tree=Component(props);while(effects.length)effects.shift()();}
  function nodes(node=tree,result=[]){if(node&&typeof node==='object'){result.push(node);for(const child of node.children||[])nodes(child,result)}return result;}
  async function settle(){for(let i=0;i<30;i++){if(renderNeeded)render();await Promise.resolve();await Promise.resolve();await Promise.resolve();}if(renderNeeded)throw Error('Hook scheduler did not settle');}
  return {requests,selections,props,snapshot,get server(){return{...server}},get timers(){return timers.size},setBusy(value){busy=value},setFailWrites(value){failWrites=value},setProbeFails(value){probeFails=value},pauseFastWrites(){pauseFast=true},async releaseFastWrite(){const resume=fastWaiters.shift();if(!resume)throw Error('No pending Fast write');resume();await settle()},async rerender(next={}){Object.assign(props,next);renderNeeded=true;await settle()},settle,
    async clickModel(id){await settle();const option=nodes().find(n=>n.type==='button'&&n.props.key===id&&n.props.className==='dsh-codex-reasoning-effort-slider-option');if(!option)throw Error('Missing model '+id);option.props.onClick();await settle()},
    async click(part){await settle();const button=nodes().find(n=>n.type==='button'&&n.props.className?.split(' ').includes('dsh-codex-reasoning-effort-slider-'+part));if(!button)throw Error('Missing button '+part);button.props.onClick();await settle()},
    async key(key){await settle();const rail=nodes().find(n=>n.props.role==='slider');if(!rail)throw Error('Missing slider');rail.props.onKeyDown({key,preventDefault(){},stopPropagation(){}});await settle()},
    async tick(){for(const fn of [...timers.values()])await fn();await settle()},
    fastPressed(){return nodes().find(n=>n.type==='button'&&n.props.className?.split(' ').includes('dsh-codex-reasoning-effort-slider-fast'))?.props['aria-pressed']},
    rail(){return nodes().find(n=>n.props.role==='slider')?.props},
    unmount(){for(const hook of hooks)hook?.cleanup?.()},
    alerts(){return nodes().filter(n=>n.props.role==='alert')},
  };
}
