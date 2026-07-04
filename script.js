const API_URL = "italify-api-production.up.railway.app";

const fileInput       = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const btnRemoveFile   = document.getElementById('btnRemoveFile');
const suggestionBox   = document.getElementById('suggestionBox');
const termList        = document.getElementById('termList');

// FABs & buttons
const btnRun      = document.getElementById('btnRun');
const iconRun     = document.getElementById('iconRun');
const btnDownload = document.getElementById('btnDownload');
const btnHelp     = document.getElementById('btnHelp');
const helpPopup   = document.getElementById('helpPopup');

// UI elements
const statusBadge = document.getElementById('statusBadge');
const dropZone    = document.getElementById('dropZone');
const toast       = document.getElementById('toast');
const toastDot    = document.getElementById('toastDot');
const toastMsg    = document.getElementById('toastMsg');

// Tabs & panes
const tabItalicize    = document.getElementById('tabItalicize');
const tabSuggestions  = document.getElementById('tabSuggestions');
const tabPreview      = document.getElementById('tabPreview');
const paneItalicize   = document.getElementById('paneItalicize');
const paneSuggestions = document.getElementById('paneSuggestions');
const panePreview     = document.getElementById('panePreview');
const sugBadge        = document.getElementById('sugBadge');

// Preview areas
const miniPreviewBody = document.getElementById('miniPreviewBody');
const previewBody     = document.getElementById('previewBody');

// Icon SVG paths
const pathPlay  = `<path d="M8 5v14l11-7z"/>`;
const pathCheck = `<path stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>`;

let currentSuggestedTerms = { english_terms: [], unknown_terms: [] };
let toastTimer;
let previewTimeout;


// ── TOAST ──
function showToast(msg, type = 'info') {
    const colors = {
        info:    '#5C5A6A',
        success: '#4ADE80',
        error:   '#EF4444',
        loading: 'var(--brand-pink)'
    };
    toastDot.style.background = colors[type] || colors.info;
    toastMsg.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    if (type !== 'loading') {
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
    }
}
function hideToast() {
    clearTimeout(toastTimer);
    toast.classList.remove('show');
}


// ── HELP POPUP ──
btnHelp.addEventListener('click', (e) => {
    e.stopPropagation();
    helpPopup.classList.toggle('show');
});
document.addEventListener('click', (e) => {
    if (!helpPopup.contains(e.target) && e.target !== btnHelp) {
        helpPopup.classList.remove('show');
    }
});


// ── TAB SWITCHER ──
function switchTab(tabName) {
    [tabItalicize, tabSuggestions, tabPreview].forEach(t => t.classList.remove('active'));
    [paneItalicize, paneSuggestions, panePreview].forEach(p => {
        p.classList.remove('active');
        setTimeout(() => p.style.display = 'none', 10);
    });

    setTimeout(() => {
        const map = {
            Italicize:   [tabItalicize,   paneItalicize],
            Suggestions: [tabSuggestions, paneSuggestions],
            Preview:     [tabPreview,     panePreview],
        };
        const [tab, pane] = map[tabName] || [];
        if (!tab) return;
        tab.classList.add('active');
        pane.style.display = 'flex';
        setTimeout(() => pane.classList.add('active'), 20);
    }, 15);
}

tabItalicize.addEventListener('click',   () => switchTab('Italicize'));
tabSuggestions.addEventListener('click', () => switchTab('Suggestions'));
tabPreview.addEventListener('click',     () => switchTab('Preview'));


// ── STATUS BADGE ──
function setStatus(text, state = 'ready') {
    statusBadge.textContent = text;
    statusBadge.dataset.state = state;

    const styles = {
        ready:    { bg: 'var(--bg-surface)',               color: 'var(--text-sub)',  border: 'var(--border-color)' },
        updating: { bg: 'var(--bg-surface)',               color: 'var(--text-muted)', border: 'var(--border-color)' },
        matches:  { bg: 'rgba(217,102,154,0.1)',           color: 'var(--brand-pink)', border: 'rgba(217,102,154,0.25)' },
        success:  { bg: 'rgba(74,222,128,0.1)',            color: '#4ADE80',           border: 'rgba(74,222,128,0.25)' },
        error:    { bg: 'rgba(239,68,68,0.1)',             color: '#EF4444',           border: 'rgba(239,68,68,0.25)' },
    };

    const s = styles[state] || styles.ready;
    statusBadge.style.background   = s.bg;
    statusBadge.style.color        = s.color;
    statusBadge.style.borderColor  = s.border;
}


// ── SKELETON LOADER ──
function showSkeleton() {
    const html = `
        <div style="padding: 0.25rem 0;">
            <div class="skeleton wide"  style="animation-delay:0ms"></div>
            <div class="skeleton med"   style="animation-delay:70ms"></div>
            <div class="skeleton wide"  style="animation-delay:130ms"></div>
            <div class="skeleton short" style="animation-delay:190ms"></div>
            <div style="margin-top:1.4rem;"></div>
            <div class="skeleton med"   style="animation-delay:250ms"></div>
            <div class="skeleton wide"  style="animation-delay:310ms"></div>
        </div>`;
    miniPreviewBody.innerHTML = html;
    previewBody.innerHTML = html;
}


// ── DRAG & DROP ──
dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.docx')) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
    } else {
        showToast('Only .docx files are supported.', 'error');
    }
});

// Open file picker — skip if clicking the remove button
dropZone.addEventListener('click', (e) => {
    if (!e.target.closest('#btnRemoveFile')) fileInput.click();
});

// Remove / reset file
btnRemoveFile.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    fileNameDisplay.innerHTML = 'Click to upload or drag &amp; drop a .docx file';
    fileNameDisplay.style.color = '';
    btnRemoveFile.style.display = 'none';
    dropZone.classList.remove('has-file');

    currentSuggestedTerms = { english_terms: [], unknown_terms: [] };
    renderSuggestions();

    miniPreviewBody.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36" style="color: var(--text-muted); opacity:0.4;"><path d="M28 4H12a4 4 0 0 0-4 4v32a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V20L28 4z"/><polyline points="28 4 28 20 44 20"/><line x1="16" y1="28" x2="32" y2="28"/><line x1="16" y1="33" x2="28" y2="33"/></svg>
            <p>Upload a document to see a preview.</p>
        </div>`;
    previewBody.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" width="36" height="36" style="color: var(--text-muted); opacity:0.4;"><rect x="6" y="6" width="36" height="36" rx="4"/><path d="M14 18h20M14 24h14M14 30h10"/></svg>
            <p>Upload a document and run the engine to see the formatted output.</p>
        </div>`;

    setStatus('Ready', 'ready');
    showToast('File removed.', 'info');
});


// ── FILE SELECTION & SCAN ──
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileNameDisplay.innerHTML = `<span style="color: var(--text-main);">${file.name}</span>`;
    btnRemoveFile.style.display = 'flex';
    dropZone.classList.add('has-file');

    btnRun.classList.remove('success', 'loading');
    iconRun.innerHTML = pathPlay;
    btnDownload.style.display = 'none';
    sugBadge.style.display = 'none';

    suggestionBox.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:0.85rem; min-height:120px;">
            <div class="loader" style="display:block; width:22px; height:22px;"></div>
            <span style="color:var(--text-muted); font-size:0.78rem;">Scanning document for foreign-language terms…</span>
        </div>`;

    showToast('Scanning document…', 'loading');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_URL}/api/scan`, { method: 'POST', body: formData });
        const data = await response.json();

        currentSuggestedTerms = data || { english_terms: [], unknown_terms: [] };
        renderSuggestions();

        hideToast();
        const total = (currentSuggestedTerms.english_terms?.length || 0) +
                      (currentSuggestedTerms.unknown_terms?.length || 0);

        if (total > 0) {
            showToast(`${total} term${total !== 1 ? 's' : ''} detected.`, 'success');
        } else {
            showToast('No foreign terms found.', 'info');
        }

        updatePreview();

    } catch {
        suggestionBox.innerHTML = '<span style="color:var(--error); font-size:0.78rem;">Unable to connect to the server.</span>';
        showToast('Connection failed.', 'error');
    }
});


// ── LIVE PREVIEW UPDATE ──
async function updatePreview() {
    const file = fileInput.files[0];
    if (!file) return;

    setStatus('Updating…', 'updating');
    showSkeleton();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('terms', termList.value);

    try {
        const response = await fetch(`${API_URL}/api/preview`, { method: 'POST', body: formData });
        const data     = await response.json();

        miniPreviewBody.innerHTML = data.html;
        previewBody.innerHTML    = data.html;

        if (data.match_count > 0) {
            setStatus(`${data.match_count} match${data.match_count !== 1 ? 'es' : ''}`, 'matches');
        } else {
            setStatus('0 matches', 'ready');
        }
    } catch {
        setStatus('Preview error', 'error');
    }
}

termList.addEventListener('input', () => {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(updatePreview, 500);
});


// ── RENDER SUGGESTIONS ──
function renderSuggestions() {
    const engTerms  = currentSuggestedTerms.english_terms || [];
    const unkTerms  = currentSuggestedTerms.unknown_terms || [];
    const totalTerms = engTerms.length + unkTerms.length;

    if (totalTerms === 0) {
        suggestionBox.innerHTML = `
            <div class="empty-state" style="margin-top: 0; width:100%;">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="32" height="32" style="color: #4ADE80; opacity:0.5;"><path d="M10 24l10 10 18-20"/></svg>
                <p>All terms accounted for. No unrecognised words remain.</p>
            </div>`;
        sugBadge.style.display = 'none';
        return;
    }

    suggestionBox.innerHTML = '';

    sugBadge.innerText = totalTerms;
    sugBadge.style.display = 'inline-flex';
    sugBadge.style.animation = 'none';
    void sugBadge.offsetWidth;
    sugBadge.style.animation = 'popIn 0.3s var(--ease-spring) both';

    // English terms section
    if (engTerms.length > 0) {
        const engTitle = document.createElement('div');
        engTitle.className = 'sug-section-title';
        engTitle.innerHTML = `English Terms <span style="font-weight:400; text-transform:none; opacity:0.65;">(${engTerms.length} detected)</span>`;
        suggestionBox.appendChild(engTitle);

        const btnAddAll = document.createElement('button');
        btnAddAll.className = 'sug-btn sug-btn-all';
        btnAddAll.innerText = `Add all ${engTerms.length} to Term List`;
        btnAddAll.style.marginBottom = '4px';
        btnAddAll.onclick = () => {
            const current  = termList.value.trim();
            const newTerms = currentSuggestedTerms.english_terms.join('\n');
            termList.value = current ? current + '\n' + newTerms : newTerms;

            currentSuggestedTerms.english_terms = [];
            renderSuggestions();

            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(updatePreview, 500);
            showToast('English terms added to list.', 'success');
        };
        suggestionBox.appendChild(btnAddAll);

        engTerms.forEach((term, i) => {
            const btn = document.createElement('button');
            btn.className = 'sug-btn';
            btn.innerText = term;
            btn.style.animationDelay = `${(i + 1) * 18}ms`;

            btn.onclick = () => {
                const current = termList.value.trim();
                termList.value = current ? current + '\n' + term : term;

                currentSuggestedTerms.english_terms =
                    currentSuggestedTerms.english_terms.filter(t => t !== term);

                btn.style.transition = 'opacity 130ms ease, transform 130ms ease';
                btn.style.opacity    = '0';
                btn.style.transform  = 'scale(0.8)';

                setTimeout(() => {
                    btn.remove();
                    const newTotal = (currentSuggestedTerms.english_terms?.length || 0) +
                                     (currentSuggestedTerms.unknown_terms?.length || 0);
                    sugBadge.innerText = newTotal;
                    if (newTotal === 0) renderSuggestions();
                    clearTimeout(previewTimeout);
                    previewTimeout = setTimeout(updatePreview, 500);
                }, 140);
            };

            suggestionBox.appendChild(btn);
        });
    }

    // Unknown / unrecognised terms section
    if (unkTerms.length > 0) {
        const unkTitle = document.createElement('div');
        unkTitle.className = 'sug-section-title';
        unkTitle.style.marginTop = '1.4rem';
        unkTitle.style.color = 'var(--warning)';
        unkTitle.innerHTML = `Unrecognised <span style="font-weight:400; text-transform:none; opacity:0.65;">(not found in either dictionary)</span>`;
        suggestionBox.appendChild(unkTitle);

        unkTerms.forEach((term, i) => {
            const btn = document.createElement('button');
            btn.className = 'sug-btn sug-btn-orange';
            btn.innerText = term;
            btn.style.animationDelay = `${(i + 1) * 18}ms`;

            btn.onclick = () => {
                const current = termList.value.trim();
                termList.value = current ? current + '\n' + term : term;

                currentSuggestedTerms.unknown_terms =
                    currentSuggestedTerms.unknown_terms.filter(t => t !== term);

                btn.style.transition = 'opacity 130ms ease, transform 130ms ease';
                btn.style.opacity    = '0';
                btn.style.transform  = 'scale(0.8)';

                setTimeout(() => {
                    btn.remove();
                    const newTotal = (currentSuggestedTerms.english_terms?.length || 0) +
                                     (currentSuggestedTerms.unknown_terms?.length || 0);
                    sugBadge.innerText = newTotal;
                    if (newTotal === 0) renderSuggestions();
                    clearTimeout(previewTimeout);
                    previewTimeout = setTimeout(updatePreview, 500);
                }, 140);
            };

            suggestionBox.appendChild(btn);
        });
    }
}


// ── RUN — PROCESS DOCUMENT ──
btnRun.addEventListener('click', async () => {
    const file = fileInput.files[0];

    if (!file) {
        showToast('Upload a .docx file first.', 'error');
        return;
    }
    if (!termList.value.trim()) {
        showToast('Term List is empty — add at least one term.', 'error');
        termList.focus();
        return;
    }

    btnRun.classList.remove('success');
    btnRun.classList.add('loading');
    btnRun.disabled = true;
    btnDownload.style.display = 'none';

    showToast('Applying formatting…', 'loading');
    setStatus('Processing…', 'updating');

    const loaderHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:70%; gap:1rem;">
            <div class="loader" style="display:block; width:32px; height:32px; border-width:3px;"></div>
            <p style="color:var(--text-muted); font-size:0.8rem; text-align:center; line-height:1.6;">
                Processing document…<br>
                <span style="font-size:0.72rem; opacity:0.55;">Injecting italics into matched terms</span>
            </p>
        </div>`;

    miniPreviewBody.innerHTML = loaderHTML;
    previewBody.innerHTML     = loaderHTML;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('terms', termList.value);

    try {
        const response = await fetch(`${API_URL}/api/process`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Failed to process document.');

        const blob        = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        btnDownload.href  = downloadUrl;
        btnDownload.download = `Italify_${file.name}`;

        btnDownload.style.display = 'flex';
        btnRun.classList.remove('loading');
        btnRun.classList.add('success');
        iconRun.innerHTML = pathCheck;

        const previewRes  = await fetch(`${API_URL}/api/preview`, { method: 'POST', body: formData });
        const previewData = await previewRes.json();

        setStatus(`${previewData.match_count} applied`, 'success');
        hideToast();
        showToast(`${previewData.match_count} term${previewData.match_count !== 1 ? 's' : ''} italicised successfully.`, 'success');

        const successBanner = `
            <div style="background:rgba(74,222,128,0.07); border:1px solid rgba(74,222,128,0.2); border-radius:10px; padding:1rem 1.2rem; margin-bottom:1.4rem; display:flex; align-items:center; gap:0.9rem;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div>
                    <p style="color:#4ADE80; font-size:0.82rem; font-weight:600; margin-bottom:0.15rem;">Document processed successfully</p>
                    <p style="color:var(--text-muted); font-size:0.73rem; line-height:1.5;">
                        <span style="color:var(--brand-pink); font-weight:600;">${previewData.match_count} term${previewData.match_count !== 1 ? 's' : ''}</span> italicised.
                        Download the result using the button in the bottom right.
                    </p>
                </div>
            </div>`;

        miniPreviewBody.innerHTML = successBanner + previewData.html;
        previewBody.innerHTML     = successBanner + previewData.html;

    } catch (error) {
        btnRun.classList.remove('loading');
        iconRun.innerHTML = pathPlay;

        const errHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" width="32" height="32"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style="color:#EF4444;">${error.message}</p>
            </div>`;
        miniPreviewBody.innerHTML = errHTML;
        previewBody.innerHTML     = errHTML;

        setStatus('Error', 'error');
        hideToast();
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        btnRun.disabled = false;
    }
});
