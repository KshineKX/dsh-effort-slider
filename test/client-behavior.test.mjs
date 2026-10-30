import test from 'node:test';
import assert from 'node:assert/strict';
import {clientHarness} from './helpers/client-harness.mjs';
function fixture(options={}) {
 let running=false;const probed=[];
 const h=clientHarness({...options,sessionsApi:{subagentAddress(){},binding(id){probed.push(id);return{session:{getSnapshot(){return{running}}}}}}});
 return {h,probed,setRunning(value){running=value}};
}
test('idle change works with the installed ClientSessions binding contract',async()=>{const {h}=fixture();await h.key('ArrowLeft');assert.equal(h.selections.length,1);assert.equal(h.selections[0].reasoningEffort,'high')});
test('reset clears Host Fast and the button',async()=>{const {h}=fixture();await h.click('fast');await h.click('reset');assert.equal(h.server.fast,false);assert.equal(h.fastPressed(),false)});
test('reset clears Fast even when effort is already default',async()=>{const {h}=fixture({effort:'high'});await h.click('fast');await h.click('reset');assert.equal(h.server.fast,false);assert.equal(h.selections.length,0)});
test('failed reset must not silently show Fast disabled while Host is still enabled',async()=>{const {h}=fixture({effort:'high'});await h.click('fast');h.setFailWrites(true);await h.click('reset');assert.equal(h.server.fast,true);assert.equal(h.fastPressed(),true);assert.equal(h.alerts().length,1)});
test('running turn defers a stop and submits it after completion',async()=>{const {h,setRunning}=fixture();setRunning(true);await h.key('Home');assert.equal(h.selections.length,0);setRunning(false);await h.tick();assert.equal(h.selections.length,1);assert.equal(h.selections[0].reasoningEffort,'off')});
test('queued preview matches the requested stop before the turn ends',async()=>{const {h,setRunning}=fixture();setRunning(true);await h.key('Home');assert.equal(h.rail()['aria-valuetext'],'Off')});
test('the newest queued stop wins',async()=>{const {h,setRunning}=fixture();setRunning(true);await h.key('ArrowLeft');await h.key('ArrowLeft');setRunning(false);await h.tick();assert.equal(h.selections.length,1);assert.equal(h.selections[0].reasoningEffort,'low')});
test('unmount clears the deferral timer',async()=>{const {h,setRunning}=fixture();setRunning(true);await h.key('Home');assert.ok(h.timers>0);h.unmount();assert.equal(h.timers,0)});
test('a mid-turn model switch must retain the target model when queued',async()=>{const {h,setRunning}=fixture();h.snapshot.groups[0].models.push({id:'model-b',name:'Other',reasoning:{defaultEffort:'low',efforts:['off','low','high','max'].map(id=>({id}))}});await h.settle();setRunning(true);await h.click('model-link');await h.clickModel('model-b');assert.equal(h.selections.length,0);setRunning(false);await h.tick();assert.equal(h.selections.length,1);assert.equal(h.selections[0].model,'model-b');assert.equal(h.selections[0].provider,'provider-a');assert.equal(h.selections[0].reasoningEffort,'low')});
