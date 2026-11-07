const $ = id => document.getElementById(id);
async function api(url, options = {}) {
  const res = await fetch(url, options); const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`); return data;
}
function message(id, text, kind = '') { const el = $(id); el.textContent = text; el.className = `message ${kind}`.trim(); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatSize(chars) { return `${Number(chars).toLocaleString()} chars`; }
async function refreshStatus() {
  try { const s = await api('/api/health'); $('status').textContent = s.llmConfigured ? `LLM ready · ${s.model}` : 'LLM not configured'; $('status').className = `status ${s.llmConfigured ? 'ready' : 'warning'}`; document.querySelector('.live-dot').style.background = s.llmConfigured ? '#35c6a2' : '#e5a55d'; }
  catch { $('status').textContent = 'Server unavailable'; $('status').className = 'status warning'; document.querySelector('.live-dot').style.background = '#df6375'; }
}
async function refreshDocs() {
  const corpus = $('corpus-select')?.value || 'custom'; const docs = await api(`/api/documents?corpus=${encodeURIComponent(corpus)}`); $('doc-count').textContent = docs.length; $('source-label').textContent = `${docs.length} ${docs.length === 1 ? 'file' : 'files'}`;
  if (!docs.length) {
    $('documents').innerHTML = '<div class="empty-state"><span>▤</span><p>Your library is waiting.</p><small>Add a document to get started.</small></div>';
    $('document-selection').innerHTML = '<span class="muted">Upload documents to choose your sources.</span>'; return;
  }
  const oldSelected = new Set([...document.querySelectorAll('input[name="selected-document"]:checked')].map(el => el.value));
  $('document-selection').innerHTML = docs.map(d => `<label class="document-choice"><input type="checkbox" name="selected-document" value="${esc(d.id)}" ${(!oldSelected.size || oldSelected.has(d.id)) ? 'checked' : ''}> <span>${esc(d.name)}</span></label>`).join('');
  $('documents').innerHTML = docs.map(d => `<article class="doc-item"><div class="file-icon">${esc(d.type.toUpperCase())}</div><div class="doc-meta"><strong>${esc(d.name)}</strong><span>${formatSize(d.chars)}${d.builtin ? ' · provided corpus' : ''}</span></div>${d.builtin ? '<span class="builtin-tag">KB</span>' : `<button class="delete-button" title="Remove ${esc(d.name)}" data-delete="${esc(d.id)}" aria-label="Delete document">×</button>`}</article>`).join('');
  $('documents').querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Remove this document from the knowledge base?')) return; try { await api(`/api/documents/${encodeURIComponent(btn.dataset.delete)}`, { method: 'DELETE' }); await refreshDocs(); message('upload-message', 'Document removed from your knowledge base.', 'success'); } catch(e) { message('upload-message', e.message, 'error'); } }));
}
async function uploadFile(file) {
  if (!file) return;
  if (!/\.(txt|md)$/i.test(file.name)) return message('upload-message', 'Please choose a .txt or .md file.', 'error');
  const fd = new FormData(); fd.append('file', file); const button = document.querySelector('#upload-form button'); button.disabled = true; button.innerHTML = '<span>↻</span> Adding document…'; message('upload-message', 'Adding your file to the knowledge base…');
  try { const r = await api('/api/documents', { method: 'POST', body: fd }); await refreshDocs(); $('file-input').value = ''; message('upload-message', `Added ${r.document.name} · ${r.chunksCreated} chunks indexed.`, 'success'); }
  catch(err) { message('upload-message', err.message, 'error'); }
  finally { button.disabled = false; button.innerHTML = '<span>＋</span> Add to knowledge base'; }
}
$('upload-form').addEventListener('submit', async e => { e.preventDefault(); const file = $('file-input').files[0]; if (!file) return message('upload-message', 'Choose a file first.', 'error'); await uploadFile(file); });
const dropzone = $('dropzone');
['dragenter','dragover'].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave','drop'].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
dropzone.addEventListener('drop', async e => { const file = e.dataTransfer?.files?.[0]; if (file) await uploadFile(file); });
$('file-input').addEventListener('change', () => { const f = $('file-input').files[0]; if (f) { dropzone.querySelector('strong').textContent = f.name; dropzone.querySelector('small').textContent = 'Ready to add to your knowledge base'; } });
$('question').addEventListener('input', () => $('question-count').textContent = `${$('question').value.length} / 1000`);
document.querySelectorAll('[data-prompt]').forEach(btn => btn.addEventListener('click', () => { $('question').value = btn.dataset.prompt; $('question').focus(); $('question-count').textContent = `${$('question').value.length} / 1000`; }));
$('select-all').addEventListener('click', () => document.querySelectorAll('input[name="selected-document"]').forEach(el => el.checked = true));
$('select-none').addEventListener('click', () => document.querySelectorAll('input[name="selected-document"]').forEach(el => el.checked = false));
$('overlap').addEventListener('change', () => { const size = Number($('chunk-size').value) || 180; if (Number($('overlap').value) >= size) $('overlap').value = Math.max(0, size - 1); });
$('chunk-size').addEventListener('change', () => { const size = Math.min(500, Math.max(40, Number($('chunk-size').value) || 180)); $('chunk-size').value = size; if (Number($('overlap').value) >= size) $('overlap').value = size - 1; });
function openSourceModal(name, chunk, text) { $('modal-title').textContent = 'Source passage'; $('modal-meta').textContent = `${name} · Chunk ${chunk}`; $('modal-text').textContent = text; $('chunk-modal').hidden = false; $('close-modal').focus(); }
function closeSourceModal() { $('chunk-modal').hidden = true; }
$('close-modal').addEventListener('click', closeSourceModal); $('modal-done').addEventListener('click', closeSourceModal);
$('chunk-modal').addEventListener('click', e => { if (e.target === $('chunk-modal')) closeSourceModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSourceModal(); });
$('ask-form').addEventListener('submit', async e => {
  e.preventDefault(); const question = $('question').value.trim(); if (!question) return;
  const selected = [...document.querySelectorAll('input[name="selected-document"]:checked')].map(el => el.value);
  if (document.querySelectorAll('input[name="selected-document"]').length && !selected.length) return message('ask-message', 'Choose at least one source to search.', 'error');
  const button = $('ask-button'); button.disabled = true; button.innerHTML = '<span>Searching your sources…</span><span class="button-arrow">↻</span>'; message('ask-message', 'Finding relevant passages and preparing your answer…', ''); $('welcome').hidden = true; $('answer-section').hidden = true;
  try {
    const r = await api('/api/ask', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ question, corpus: $('corpus-select').value, topK: Number($('top-k').value), chunkSize: Number($('chunk-size').value), overlap: Number($('overlap').value), documentIds: selected }) });
    $('answer').textContent = r.answer; $('model-label').textContent = r.model || 'LLM'; $('source-count').textContent = r.sources.length;
    $('sources').innerHTML = r.sources.map((s, i) => `<article class="source-card"><button type="button" class="source-open" data-source-index="${i}"><div class="source-top"><span class="source-tag">${esc(s.label)}</span><strong>${esc(s.name)}</strong><span class="chunk-label">Chunk ${s.chunk}</span></div><p>${esc(s.excerpt)}${s.excerpt.length >= 700 ? '…' : ''}</p><div class="score">Relevance score: ${s.score} · Click to inspect full passage ↗</div></button></article>`).join('');
    $('sources').querySelectorAll('[data-source-index]').forEach(btn => btn.addEventListener('click', async () => { const s = r.sources[Number(btn.dataset.sourceIndex)]; try { const chunks = await api(`/api/documents/${encodeURIComponent(s.documentId)}/chunks?chunkSize=${encodeURIComponent($('chunk-size').value)}&overlap=${encodeURIComponent($('overlap').value)}`); const chunk = chunks.chunks.find(c => c.index === Number(s.chunk)); openSourceModal(chunks.document.name, s.chunk, chunk ? chunk.text : s.text || s.excerpt); } catch { openSourceModal(s.name, s.chunk, s.text || s.excerpt); } }));
    const u = r.usage; $('usage').textContent = u ? `Token usage · input ${u.prompt_tokens ?? '—'} · output ${u.completion_tokens ?? '—'} · total ${u.total_tokens ?? '—'}` : 'Token usage was not provided by the model provider.';
    $('answer-section').hidden = false; message('ask-message', 'Answer ready · Review the evidence below to verify the response.', 'success'); $('answer-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(err) { $('welcome').hidden = false; message('ask-message', err.message, 'error'); }
  finally { button.disabled = false; button.innerHTML = '<span>Ask Atlas</span><span class="button-arrow">↗</span>'; }
});
refreshStatus(); refreshDocs().catch(e => message('upload-message', e.message, 'error'));

// V2 workspace views
function showView(id) { document.querySelectorAll('.workspace-tab').forEach(b => b.classList.toggle('active', b.dataset.view === id)); ['ask-view','words-view','evaluation-view'].forEach(v => { const el=$(v); if(el) el.hidden=v!==id; }); if(id==='words-view') loadWords(); }
document.querySelectorAll('.workspace-tab').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$('corpus-select').addEventListener('change', async()=>{ await refreshDocs(); if(!$('words-view').hidden) loadWords(); });
async function loadWords(word='') { try { const data=await api(`/api/words?corpus=${encodeURIComponent($('corpus-select').value)}${word?`&word=${encodeURIComponent(word)}`:''}`); $('words-stats').innerHTML=`<div class="stats-strip"><span><b>${data.documentCount}</b><small>documents</small></span><span><b>${data.chunkCount}</b><small>chunks</small></span><span><b>${data.vocabularySize}</b><small>vocabulary</small></span></div>`; const list=word?data.chunks:data.words.slice(0,80); $('word-results').innerHTML=word?`<h4>${data.selectedWord?esc(word)+' · '+data.selectedWord.count+' occurrences':'No matching word found'}</h4>`+list.map(c=>`<button class="word-location" type="button" data-word-source="${esc(c.documentId)}" data-word-chunk="${c.chunk}"><b>${esc(c.source)} · Chunk ${c.chunk}</b><span>${esc(c.text.slice(0,180))}…</span></button>`).join(''):`<div class="vocab-list">${list.map(w=>`<button type="button" class="vocab-row" data-vocab-word="${esc(w.word)}"><span>${esc(w.word)}</span><small>${w.count} occurrences · ${w.chunks} chunks</small></button>`).join('')}</div>`; $('word-results').querySelectorAll('[data-vocab-word]').forEach(b=>b.addEventListener('click',()=>{$('word-search').value=b.dataset.vocabWord;loadWords(b.dataset.vocabWord)})); $('word-results').querySelectorAll('[data-word-source]').forEach(b=>b.addEventListener('click',async()=>{try{const d=await api(`/api/documents/${encodeURIComponent(b.dataset.wordSource)}/chunks`);const c=d.chunks.find(x=>x.index===Number(b.dataset.wordChunk));openSourceModal(d.document.name,b.dataset.wordChunk,c?.text||'Chunk unavailable');}catch(e){message('evaluation-message',e.message,'error')}})); } catch(e){$('words-stats').textContent=e.message;} }
let wordSearchTimer; $('word-search').addEventListener('input',()=>{clearTimeout(wordSearchTimer);wordSearchTimer=setTimeout(()=>loadWords($('word-search').value.trim()),180)});
$('analyze-question').addEventListener('click',async()=>{const question=$('word-question').value.trim();if(!question)return;try{const r=await api('/api/words/question',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({corpus:$('corpus-select').value,question})});$('question-word-results').innerHTML=`<div class="question-word-summary">${r.words.filter(w=>w.found).length} of ${r.words.length} words found in the corpus</div>`+r.words.map(w=>`<div class="question-word ${w.found?'found':'missing'}"><b>${esc(w.word)}</b><span>${w.found?`${w.locations.length} matching chunks`:'Not found'}</span>${w.found?`<small>${esc([...new Set(w.locations.map(l=>l.source))].join(', '))}</small>`:''}</div>`).join('');}catch(e){$('question-word-results').textContent=e.message;}});
$('run-evaluation').addEventListener('click',async()=>{const btn=$('run-evaluation');btn.disabled=true;$('evaluation-message').textContent='Running retrieval evaluation…';try{const base=Number($('eval-chunk-size').value)||180, overlap=Number($('eval-overlap').value)||35;const r=await api('/api/evaluation/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({corpora:['kestrel','custom'],configs:[{name:'baseline',chunkSize:base,overlap},{name:'smaller-chunks',chunkSize:Math.max(40,Math.floor(base/2)),overlap:Math.min(Math.max(0,Math.floor(overlap/2)),Math.max(0,Math.floor(base/2)-1))}]})});$('evaluation-message').textContent=`Saved results to ${r.savedTo}. Custom corpus results are omitted until you replace the question template with your own questions.`;$('evaluation-results').innerHTML=r.runs.map(run=>`<article class="eval-run"><h3>${esc(run.corpus)} · ${esc(run.config.name)}</h3><p>${run.answerable} answerable questions · ${run.total} total</p><div class="metric-grid">${Object.entries(run.summary).map(([k,v])=>`<div><small>${k.replace('recallAt','Recall@')}</small><b>${v===null?'—':(v*100).toFixed(1)+'%'}</b></div>`).join('')}</div><details><summary>Results by question type</summary><pre>${esc(JSON.stringify(run.byType,null,2))}</pre></details></article>`).join('');}catch(e){$('evaluation-message').textContent=e.message;}finally{btn.disabled=false;}});

// V3 retriever controls
const v3Message = (text) => { $('v3-message').textContent = text; };
$('v3-build-graph')?.addEventListener('click', async () => {
  const button = $('v3-build-graph'); button.disabled = true;
  v3Message('Building the Kestrel graph. This may take several minutes and use LLM credits…');
  try {
    const result = await api('/api/v3/graph/build', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({chunkSize:180,overlap:35}) });
    v3Message(`Graph built: ${result.stats.triples} triples, ${result.stats.entities} entities, ${result.stats.errors} extraction errors. Saved to ${result.output}.`);
  } catch (e) { v3Message(`Graph build failed: ${e.message}`); }
  finally { button.disabled = false; }
});
$('v3-retrieve')?.addEventListener('click', async () => {
  const question = $('v3-question').value.trim();
  if (question.length < 3) return v3Message('Enter a question of at least 3 characters.');
  const retrievers = { dense:$('v3-dense').checked, bm25:$('v3-bm25').checked, graph:$('v3-graph').checked };
  if (!Object.values(retrievers).some(Boolean)) return v3Message('Enable at least one retriever.');
  const button = $('v3-retrieve'); button.disabled = true; v3Message('Retrieving and fusing passages…');
  try {
    const result = await api('/api/v3/retrieve', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,corpus:$('corpus-select').value,topK:10,chunkSize:180,overlap:35,retrievers})});
    $('v3-results').innerHTML = result.results.map((r,i) => `<article class="eval-run"><h4>#${i+1} · ${esc(r.source)} · Chunk ${r.index+1}</h4><p>${esc(r.text)}</p><small>Found by: ${esc((r.foundBy||[]).map(x=>`${x.retriever} (rank ${x.rank})`).join(', ') || r.retriever || 'unknown')} · RRF ${Number(r.rrfScore||r.score||0).toFixed(4)}</small>${r.matchedTriples?.length?`<details><summary>Graph triples behind this result</summary><pre>${esc(JSON.stringify(r.matchedTriples,null,2))}</pre></details>`:''}</article>`).join('') || '<p>No matching passages returned.</p>';
    v3Message(`Completed. ${result.results.length} fused passages from ${result.retrievers.map(x=>`${x.name}: ${x.count}`).join(', ')}.`);
  } catch(e) { v3Message(`Retrieval failed: ${e.message}`); }
  finally { button.disabled = false; }
});
