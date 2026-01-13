// 简易博客框架交互和渲染逻辑

(function(){

  let posts = [];

  let viewMode = 'full'; // 'full' 或 'simple'（仅显示标题）

  let techStackMap = {}; // 技术栈分类



  // 技术栈名映射

  const techNames = {

    'frontend': '前端',

    'backend': '后端',

    'devops': 'DevOps',

    'python': 'Python',

    'web': 'Web',

    'default': '其他'

  };



  function getTechLabel(path){

    // 从路径中提取技术栈名称

    const parts = path.split('/').filter(Boolean);

    if(parts.length > 1){

      const folderName = parts[parts.length - 2];

      return techNames[folderName] || folderName;

    }

    return techNames['default'];

  }

  // 1. Try posts/index.json (array of filenames)

  // 2. Fallback: fetch directory listing /posts/ and parse links to .md

  // 将相对路径转换为完整 URL（相对于 posts/ 目录）

  function resolvePostUrl(filePath){

    // 如果已经是完整 URL，直接返回

    if(filePath.startsWith('http://') || filePath.startsWith('https://')){

      return filePath;

    }

    

    // 清理路径：移除开头的 ./ 或 /

    const cleanPath = filePath.replace(/^\.\//, '').replace(/^\//, '');

    

    // 使用 new URL 构建相对于当前页面的完整 URL

    // 假设 posts/ 目录与 index.html 在同一目录或父目录

    try{

      // 先尝试 ./posts/（最常见情况）

      const baseUrl = new URL('./posts/', window.location.href).href;

      return new URL(cleanPath, baseUrl).href;

    }catch(e){

      // 降级方案：手动拼接

      const currentUrl = window.location.href;

      const baseDir = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);

      return baseDir + 'posts/' + cleanPath;

    }

  }



  async function loadPostsFromDir(){

    posts = [];

    let list = null;

    

    // 1. 优先尝试读取 index.json

    try{

      const indexUrl = resolvePostUrl('index.json');

      const res = await fetch(indexUrl);

      if(res.ok){

        list = await res.json();

        console.log('Loaded posts list from index.json:', list.length, 'files');

      }

    }catch(e){

      console.warn('Failed to load index.json:', e);

    }

    

    let mdFiles = [];

    if(Array.isArray(list) && list.length){

      mdFiles = list.map(p=> p.trim()).filter(Boolean);

    } else {

      // 2. 降级方案：尝试获取目录列表（某些服务器可能不支持）

      console.warn('index.json not found, trying directory listing...');

      try{

        const dirUrl = resolvePostUrl('./');

        const dirRes = await fetch(dirUrl);

        if(dirRes.ok){

          const html = await dirRes.text();

          const doc = new DOMParser().parseFromString(html,'text/html');

          const anchors = Array.from(doc.querySelectorAll('a'));

          mdFiles = anchors.map(a=>a.getAttribute('href'))

            .filter(h=>h && h.toLowerCase().endsWith('.md'))

            .map(h=>h.replace(/^\.\//, ''));

        }

      }catch(e){

        console.error('Failed to load directory listing:', e);

      }

    }

    

    if(mdFiles.length === 0){

      console.error('No markdown files found! Please ensure posts/index.json exists.');

      renderPostList([]);

      return;

    }

    

    // 3. 加载每个 md 文件

    console.log('Loading', mdFiles.length, 'markdown files...');

    const loadPromises = mdFiles.map(async (filePath) => {

      try{

        const url = resolvePostUrl(filePath);

        const r = await fetch(url);

        if(!r.ok){

          console.warn(`Failed to fetch ${filePath}: ${r.status} ${r.statusText}`);

          return null;

        }

        const md = await r.text();

        const parsed = parseFrontMatter(md);

        

        // 生成唯一 ID：使用文件路径（去除扩展名和目录分隔符）

        const id = filePath.replace(/\.md$/i, '').replace(/\//g, '-').replace(/\\/g, '-');

        const filename = filePath.split('/').pop().split('\\').pop().replace(/\.md$/i, '');

        const titleFromContent = extractTitle(parsed.content) || filename;

        

        return {

          id,

          title: parsed.meta.title || titleFromContent,

          date: parsed.meta.date || '',

          tags: parsed.meta.tags || [],

          content: parsed.content,

          url,

          filePath

        };

      }catch(e){

        console.warn(`Error loading ${filePath}:`, e);

        return null;

      }

    });

    

    const loadedPosts = await Promise.all(loadPromises);

    posts = loadedPosts.filter(p => p !== null);

    

    // 4. 排序

    posts.sort((a,b)=>{

      if(a.date && b.date) return new Date(b.date) - new Date(a.date);

      return a.id < b.id ? 1 : -1;

    });

    

    console.log(`Successfully loaded ${posts.length} posts`);

    renderPostList(posts);

    

    // 5. 检查 URL hash，如果有则打开对应文章

    const initialHash = location.hash.replace('#','');

    if(initialHash) openPost(initialHash);

  }



  function parseFrontMatter(md){

    const meta = {};

    let content = md;

    if(md.startsWith('---')){

      const idx = md.indexOf('\n---',3);

      if(idx>0){

        const fm = md.slice(3, idx+1).trim();

        content = md.slice(idx+4).trim();

        fm.split(/\r?\n/).forEach(line=>{

          const m = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);

          if(m){

            const key = m[1].trim();

            let val = m[2].trim();

            // try array syntax

            if(val.startsWith('[') && val.endsWith(']')){

              try{ val = JSON.parse(val.replace(/'/g,'"')); }catch(e){}

            }

            meta[key] = val;

          }

        });

      }

    }

    return { meta, content };

  }



  function extractTitle(md){

    const m = md.match(/^#\s+(.+)$/m);

    return m? m[1].trim() : null;

  }





  const postListEl = document.getElementById('postList');

  const postContentEl = document.getElementById('postContent');

  const searchInput = document.getElementById('searchInput');

  const sidebar = document.querySelector('.sidebar');

  const sidebarToggle = document.getElementById('sidebarToggle');

  const sidebarOverlay = document.getElementById('sidebarOverlay');

  const pageBody = document.body;

  const viewToggle = document.getElementById('viewToggle');

  const techList = document.getElementById('techList');

  const techStack = document.getElementById('techStack');



  function getPreview(md){

    // strip code blocks

    let s = md.replace(/```[\s\S]*?```/g,'');

    // remove all headers (including front matter line breaks)

    s = s.replace(/^#+\s+.*/gm,'');

    // remove list markers

    s = s.replace(/^\s*[-*+]\s+/gm,'');

    // remove inline code marks

    s = s.replace(/`([^`]+)`/g,'$1');

    // remove HTML tags if any

    s = s.replace(/<[^>]+>/g,'');

    // collapse blank lines and trim

    const lines = s.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);

    const first = lines.length? lines[0] : '';

    return first.length>220? first.slice(0,220)+'…' : first;

  }



  function renderPostList(items){

    postListEl.innerHTML = '';

    items.forEach(p => {

      const li = document.createElement('li');

      li.className = 'post-item';

      li.dataset.id = p.id;

      const preview = escapeHtml(getPreview(p.content));

      

      if(viewMode === 'simple'){

        // 简洁模式：只显示标题

        li.innerHTML = `<h3 style="margin:0">${p.title}</h3>`;

      } else {

        // 完整模式：显示标题、日期、预览

        li.innerHTML = `

          <div class="item-head">

            <div class="item-meta">

              <h3>${p.title}</h3>

              <p class="meta">${p.date} • ${p.tags.join(', ')}</p>

            </div>

            <div class="item-actions">

              <button class="open-btn" data-id="${p.id}">阅读</button>

            </div>

          </div>

          <div class="post-preview">${preview}</div>

        `;

      }



      // Click on entire post item to open

      li.addEventListener('click', (e)=>{ 

        openPost(p.id); 

        closeSidebarIfMobile();

      });



      postListEl.appendChild(li);

    });

  }



  function escapeHtml(s){return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[c])}



  // Use marked.js for full Markdown rendering and highlight.js for code highlighting

  function renderMarkdown(md){

    if(window.marked){

      // configure marked for common options

      marked.setOptions({

        gfm: true,

        breaks: false,

        headerIds: false,

        mangle: false

      });

      try{

        return marked.parse(md || '');

      }catch(e){

        return '<pre><code>'+escapeHtml(md)+'</code></pre>';

      }

    }

    // fallback to simple escaping

    return '<pre><code>'+escapeHtml(md)+'</code></pre>';

  }



  function openPost(id){

    const p = posts.find(x=>x.id===id);

    if(!p) return;

    document.title = p.title + ' - 我的博客';

    window.location.hash = '#'+id;

    let rendered = renderMarkdown(p.content);

    // Remove the first h1 or h2 heading from rendered markdown (since we display title separately)

    rendered = rendered.replace(/<h[12]>[^<]*<\/h[12]>/, '');

    postContentEl.innerHTML = `<h1>${p.title}</h1><p style="color:var(--muted)">${p.date} • ${p.tags.join(', ')}</p>` + rendered;

    // highlight code blocks

    if(window.hljs){

      // run highlight after DOM insertion

      setTimeout(()=>{ try{ hljs.highlightAll(); }catch(e){} }, 0);

    }



    // enhance code blocks: add language label and copy button

    setTimeout(()=>{ enhanceCodeBlocks(); }, 60);

    window.scrollTo({top:0,behavior:'smooth'});

  }



  function enhanceCodeBlocks(){

    const pres = Array.from(postContentEl.querySelectorAll('pre'));

    pres.forEach(pre=>{

      if(pre.dataset.enhanced) return;

      const code = pre.querySelector('code');

      if(!code) return;

      // detect language from class like language-js

      const langClass = Array.from(code.classList).find(c=>c.startsWith('language-')) || '';

      const lang = langClass.replace('language-','') || '';

      if(lang) pre.setAttribute('data-language', lang.toUpperCase());



      // add toolbar

      const toolbar = document.createElement('div'); toolbar.className = 'code-toolbar';

      const copyBtn = document.createElement('button'); copyBtn.className = 'copy-btn'; copyBtn.type='button'; copyBtn.textContent='复制';

      copyBtn.addEventListener('click', async ()=>{

        try{

          await navigator.clipboard.writeText(code.innerText);

          copyBtn.classList.add('copied'); copyBtn.textContent='已复制';

          setTimeout(()=>{ copyBtn.classList.remove('copied'); copyBtn.textContent='复制'; },1500);

        }catch(e){ copyBtn.textContent='复制失败'; setTimeout(()=>{ copyBtn.textContent='复制'; },1500); }

      });

      toolbar.appendChild(copyBtn);

      pre.appendChild(toolbar);

      pre.dataset.enhanced = '1';

    });

  }



  function doSearch(q){

    q = (q||'').toLowerCase();

    const filtered = posts.filter(p=> (p.title + ' ' + p.tags.join(' ') + ' ' + p.content).toLowerCase().includes(q));

    renderPostList(filtered);

  }



  // Init

  // load posts from posts/ directory

  loadPostsFromDir();



  searchInput.addEventListener('input', e=> doSearch(e.target.value));



  // Sidebar open/close helpers for mobile

  function openSidebar(){

    if(!sidebar) return;

    sidebar.classList.add('open');

    sidebarOverlay.classList.add('show');

    pageBody.classList.add('no-scroll');

  }

  function closeSidebar(){

    if(!sidebar) return;

    sidebar.classList.remove('open');

    sidebarOverlay.classList.remove('show');

    pageBody.classList.remove('no-scroll');

  }

  function closeSidebarIfMobile(){ if(window.innerWidth <= 800) closeSidebar(); }



  if(sidebarToggle){ sidebarToggle.addEventListener('click', ()=>{ openSidebar(); }); }

  if(sidebarOverlay){ sidebarOverlay.addEventListener('click', ()=>{ closeSidebar(); }); }

  // close sidebar on resize to desktop

  window.addEventListener('resize', ()=>{ if(window.innerWidth > 800) closeSidebar(); });



  // View mode toggle

  if(viewToggle){

    viewToggle.addEventListener('click', ()=>{

      viewMode = viewMode === 'full' ? 'simple' : 'full';

      viewToggle.textContent = viewMode === 'full' ? '列表' : '简洁';

      viewToggle.classList.toggle('active', viewMode === 'simple');

      renderPostList(posts);

    });

  }



  // Theme controls (floating)

  const floatingToggle = document.getElementById('floatingToggle');

  const floatingPanel = document.getElementById('floatingPanel');

  const themeBtns = document.querySelectorAll('.theme-btn');

  const themeImageFile = document.getElementById('themeImageFile');



  function applyTheme(name, imageUrl){

    document.documentElement.classList.remove('theme-dark','theme-image');

    document.body.style.backgroundImage = '';

    if(name === 'dark'){

      document.documentElement.classList.add('theme-dark');

      localStorage.setItem('site-theme','dark');

      localStorage.removeItem('site-theme-image');

    } else if(name === 'image' && imageUrl){

      document.documentElement.classList.add('theme-image');

      // apply to body for full-bleed

      document.body.style.backgroundImage = `url('${imageUrl}')`;

      document.body.style.backgroundAttachment = 'fixed';

      localStorage.setItem('site-theme','image');

      localStorage.setItem('site-theme-image', imageUrl);

    } else {

      // day

      localStorage.setItem('site-theme','day');

      localStorage.removeItem('site-theme-image');

    }

  }

  // toggle floating panel OR directly switch theme on click

  if(floatingToggle && floatingPanel){

    floatingToggle.addEventListener('click', (e)=>{

      // Get current theme

      const currentTheme = localStorage.getItem('site-theme') || 'day';

      // Toggle between day and dark

      const nextTheme = currentTheme === 'day' ? 'dark' : 'day';

      applyTheme(nextTheme);

      // Show feedback: briefly show theme was changed (optional: animate the button)

      floatingToggle.style.transform = 'scale(1.1)';

      setTimeout(()=>{ floatingToggle.style.transform = ''; }, 150);

    });

  }



  themeBtns.forEach(b=> b.addEventListener('click', e=>{

    const t = e.currentTarget.dataset.theme;

    applyTheme(t);

    if(floatingPanel) floatingPanel.setAttribute('aria-hidden','true');

  }));



  // handle local image upload

  if(themeImageFile){

    themeImageFile.addEventListener('change', (e)=>{

      const f = e.target.files && e.target.files[0];

      if(!f) return;

      const reader = new FileReader();

      reader.onload = function(ev){

        const dataUrl = ev.target.result;

        try{

          // try to persist and apply

          applyTheme('image', dataUrl);

        }catch(err){

          alert('无法应用图片（可能过大）');

          console.error(err);

        }

      };

      reader.onerror = function(){

        alert('读取文件失败，请重试');

        console.error('FileReader error:', reader.error);

      };

      reader.readAsDataURL(f);

      // hide panel after selection

      if(floatingPanel) floatingPanel.setAttribute('aria-hidden','true');

    });

  }



  // top-right upload button triggers same file input

  const topUploadBtn = document.getElementById('topUploadBtn');

  if(topUploadBtn && themeImageFile){

    topUploadBtn.addEventListener('click', (e)=>{

      e.stopPropagation();

      themeImageFile.click();

    });

  }



  // click outside to close floating panel

  document.addEventListener('click', (e)=>{

    if(!floatingPanel) return;

    const isHidden = floatingPanel.getAttribute('aria-hidden') === 'true';

    if(!isHidden){

      if(!e.target.closest('#floatingTheme')){

        floatingPanel.setAttribute('aria-hidden','true');

        if(floatingToggle) floatingToggle.setAttribute('aria-pressed','false');

      }

    }

  });



  // load stored theme

  (function loadTheme(){

    const saved = localStorage.getItem('site-theme') || 'day';

    const img = localStorage.getItem('site-theme-image');

    if(saved === 'dark') applyTheme('dark');

    else if(saved === 'image' && img) applyTheme('image', img);

    else applyTheme('day');

  })();



  // Custom cursor

  const cursor = document.getElementById('customCursor');

  let mx=0,my=0;

  function updateCursor(){

    // only translate (no scale transition) for immediate follow

    cursor.style.transform = `translate(${mx}px, ${my}px)`;

  }



  // Use mousemove for immediate updates (no rAF delay) to reduce perceived lag

  document.addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; updateCursor(); });



  // Hide custom cursor when hovering interactive elements (except text inputs)

  const interactiveSelector = 'a,button,.post-item';

  document.addEventListener('pointerenter', e=>{

    const target = e.target.closest && e.target.closest(interactiveSelector);

    if(target){ cursor.classList.add('hidden'); }

  }, true);

  document.addEventListener('pointerleave', e=>{

    const target = e.target.closest && e.target.closest(interactiveSelector);

    if(target){ cursor.classList.remove('hidden'); }

  }, true);

})();

