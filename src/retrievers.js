const { tokenize } = require('../src-rag-v2');

// BM25 lexical retrieval
function bm25Search(question, chunks, topK = 10, options = {}) {
  const k1 = options.k1 ?? 1.5, b = options.b ?? 0.75;
  const qTerms = [...new Set(tokenize(question))];
  if (!qTerms.length || !chunks.length) return [];
  const docs = chunks.map(c => ({ ...c, terms: tokenize(c.text) }));
  const N = docs.length, avgdl = docs.reduce((s,d)=>s+d.terms.length,0)/N || 1;
  const df = new Map();
  for (const d of docs) for (const t of new Set(d.terms)) df.set(t,(df.get(t)||0)+1);
  return docs.map(d => {
    const tf = new Map(); for (const t of d.terms) tf.set(t,(tf.get(t)||0)+1);
    let score=0;
    for (const term of qTerms) {
      const f=tf.get(term)||0; if(!f) continue;
      const n=df.get(term)||0, idf=Math.log(1+(N-n+0.5)/(n+0.5));
      score += idf*(f*(k1+1))/(f+k1*(1-b+b*d.terms.length/avgdl));
    }
    return {...d,score,retriever:'bm25'};
  }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score).slice(0,topK)
    .map(({terms,...x})=>x);
}

// Reciprocal Rank Fusion; retain per-retriever provenance
function rrfFuse(resultLists, topK = 10, c = 60) {
  const fused = new Map();
  for (const {name,results} of resultLists) (results||[]).forEach((item,i)=>{
    const key=item.id||`${item.source||item.name}:${item.index??item.chunk??i}`;
    const current=fused.get(key)||{...item,rrfScore:0,foundBy:[]};
    current.rrfScore += 1/(c+i+1);
    current.foundBy.push({retriever:name,rank:i+1});
    if (item.matchedTriples) current.matchedTriples=item.matchedTriples;
    fused.set(key,current);
  });
  return [...fused.values()].sort((a,b)=>b.rrfScore-a.rrfScore).slice(0,topK)
    .map((x,i)=>({...x,rank:i+1}));
}
function batches(items,size=20){const out=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out;}

async function geminiEmbedTexts(texts, taskType='RETRIEVAL_DOCUMENT') {
  const key=process.env.EMBEDDING_API_KEY||process.env.LLM_API_KEY;
  const base=(process.env.EMBEDDING_BASE_URL||'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/,'');
  const model=(process.env.EMBEDDING_MODEL||'gemini-embedding-001').replace(/^models\//,'');
  if(!key) throw new Error('Gemini embeddings require EMBEDDING_API_KEY.');
  const output=[];
  for(const batch of batches(texts,20)) {
    const requests=batch.map(text=>({model:`models/${model}`,content:{parts:[{text:String(text)}]},taskType}));
    let response,data;
    for(let attempt=0;attempt<5;attempt++){
      response=await fetch(`${base}/models/${model}:batchEmbedContents`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({requests})});
      data=await response.json().catch(()=>({}));
      if(response.ok) break;
      if(response.status!==429||attempt===4) throw new Error(data?.error?.message||`Gemini embedding API returned HTTP ${response.status}`);
      const retryInfo=data?.error?.details?.find(x=>x['@type']?.includes('RetryInfo'));
      const seconds=Number(String(retryInfo?.retryDelay||'').replace('s',''));
      const wait=Number.isFinite(seconds)&&seconds>0?seconds*1000+1000:20000*(attempt+1);
      await new Promise(resolve=>setTimeout(resolve,wait));
    }
    if(!response.ok) throw new Error('Gemini embedding request failed after retries.');
    if(!Array.isArray(data.embeddings)||data.embeddings.length!==batch.length) throw new Error('Gemini returned an unexpected embedding response.');
    for(const item of data.embeddings){if(!Array.isArray(item.values)||!item.values.length)throw new Error('Gemini returned an invalid embedding vector.');output.push(item.values);}
  }
  return output;
}
async function openAIEmbedTexts(texts) {
  const key=process.env.EMBEDDING_API_KEY||process.env.LLM_API_KEY;
  const base=(process.env.EMBEDDING_BASE_URL||process.env.LLM_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');
  const model=process.env.EMBEDDING_MODEL;
  if(!key||!model)throw new Error('Embedding API key and model are required.');
  const response=await fetch(`${base}/embeddings`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,input:texts})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`Embedding endpoint returned HTTP ${response.status}`);
  return (data.data||[]).sort((a,b)=>a.index-b.index).map(x=>x.embedding);
}
async function embedTexts(texts,taskType='RETRIEVAL_DOCUMENT') {
  const model=(process.env.EMBEDDING_MODEL||'').toLowerCase();
  return model.startsWith('gemini')?geminiEmbedTexts(texts,taskType):openAIEmbedTexts(texts);
}
function cosine(a,b){if(!a?.length||a.length!==b.length)throw new Error('Embedding dimensions do not match.');let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return dot/(Math.sqrt(aa)*Math.sqrt(bb)||1);}

// Cache corpus vectors for the lifetime of the process to avoid re-embedding
// the same documents for every evaluation question.
const documentCache=new Map();
async function denseSearch(question,chunks,topK=10) {
  if(!chunks.length)return [];
  const model=process.env.EMBEDDING_MODEL||'default';
  const key=`${model}:${chunks.map(c=>`${c.id||''}:${c.text}`).join('\n')}`;
  let vectors=documentCache.get(key);
  if(!vectors){vectors=await embedTexts(chunks.map(c=>c.text),'RETRIEVAL_DOCUMENT');documentCache.set(key,vectors);}
  const [q]=await embedTexts([question],'RETRIEVAL_QUERY');
  return chunks.map((c,i)=>({...c,score:cosine(q,vectors[i]),retriever:'dense'}))
    .sort((a,b)=>b.score-a.score).slice(0,topK);
}
module.exports={bm25Search,rrfFuse,denseSearch,embedTexts};
