const test=require('node:test');const assert=require('node:assert/strict');
const {bm25Search,rrfFuse}=require('../src/retrievers');
const {validateTriple}=require('../src/concept-graph');
test('BM25 ranks a chunk containing distinctive query terms',()=>{const chunks=[{id:'a',text:'KST-2044 allowlist connection refused'},{id:'b',text:'Annual billing discount policy'}];const got=bm25Search('KST-2044 allowlist',chunks,2);assert.equal(got[0].id,'a');});
test('RRF combines ranks and retains retriever provenance',()=>{const got=rrfFuse([{name:'dense',results:[{id:'a',text:'A'},{id:'b',text:'B'}]},{name:'bm25',results:[{id:'b',text:'B'},{id:'a',text:'A'}]}],2);assert.equal(got.length,2);assert.equal(got[0].foundBy.length,2);});
test('graph triple schema accepts only supported relations with provenance',()=>{assert.equal(validateTriple({subject:'KST-2044',relation:'RESOLVED_BY',object:'allowlist update',chunkId:'c1',source:'runbook.md'}),true);assert.equal(validateTriple({subject:'x',relation:'INVENTS',object:'y',chunkId:'c1',source:'x.md'}),false);});
