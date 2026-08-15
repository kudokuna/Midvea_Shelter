import os
import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

funcs = '''
    function loadFavorites() {
        const grid = document.getElementById('favorites-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="gallery-grid-placeholder">Загрузка...</div>';
        
        chrome.storage.local.get(['favWallpapers'], (res) => {
            const favs = res.favWallpapers || [];
            if (favs.length === 0) {
                grid.innerHTML = '<div class="gallery-grid-placeholder">Нет избранных обоев</div>';
                return;
            }
            grid.innerHTML = '';
            favs.forEach(post => {
                renderGalleryItem(post, 'custom', grid);
            });
        });
    }

    function loadMyWallpapers() {
        const grid = document.getElementById('my-wallpapers-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="gallery-grid-placeholder">Загрузка...</div>';
        
        chrome.storage.local.get(['myWallpapers'], (res) => {
            const myWallpapers = res.myWallpapers || [];
            if (myWallpapers.length === 0) {
                grid.innerHTML = '<div class="gallery-grid-placeholder">Нет загруженных обоев</div>';
                return;
            }
            grid.innerHTML = '';
            myWallpapers.forEach(post => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                
                item.innerHTML = <img src="" loading="lazy" alt=""> + 
                    (post.isVideo ? '<div class="gallery-item-video-badge">?</div>' : '') +
                    <div class="gallery-item-overlay">
                        <button class="gallery-btn-apply" title="Применить">?</button>
                        <button class="gallery-btn-fav" title="Удалить">???</button>
                    </div>;
                    
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.gallery-btn-fav')) {
                        e.stopPropagation();
                        const updated = myWallpapers.filter(w => w.url !== post.url);
                        chrome.storage.local.set({ myWallpapers: updated }, () => {
                            loadMyWallpapers();
                        });
                    } else {
                        applySpecificWallpaper(post.url, 'custom');
                    }
                });
                grid.appendChild(item);
            });
        });
    }

    function toggleFavorite(post, btn) {
        chrome.storage.local.get(['favWallpapers'], (res) => {
            let favs = res.favWallpapers || [];
            const idx = favs.findIndex(f => f.url === post.url);
            if (idx >= 0) {
                favs.splice(idx, 1);
                if (btn) btn.classList.remove('active');
            } else {
                favs.push(post);
                if (btn) btn.classList.add('active');
            }
            chrome.storage.local.set({ favWallpapers: favs });
            
            if (idx >= 0 && btn && btn.closest('#favorites-grid')) {
                loadFavorites();
            }
        });
    }

    function renderGalleryItem(post, source, gridElement) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        chrome.storage.local.get(['favWallpapers'], (res) => {
            const favs = res.favWallpapers || [];
            const isFav = favs.some(f => f.url === post.url);
            
            item.innerHTML = <img src="" loading="lazy" alt=""> + 
                (post.isVideo ? '<div class="gallery-item-video-badge">?</div>' : '') +
                <div class="gallery-item-overlay">
                    <button class="gallery-btn-apply" title="Применить">?</button>
                    <button class="gallery-btn-fav " title="В избранное">??</button>
                </div>;
                
            item.addEventListener('click', (e) => {
                if (e.target.closest('.gallery-btn-fav')) {
                    e.stopPropagation();
                    toggleFavorite(post, e.target.closest('.gallery-btn-fav'));
                } else {
                    applySpecificWallpaper(post.url, source);
                }
            });
            gridElement.appendChild(item);
        });
    }
'''

content = content.replace("async function loadCategoryPreviews(source, isLoadMore = false) {", funcs + "\n    async function loadCategoryPreviews(source, isLoadMore = false) {")

# Also fix the unicode corruption around gallery-grid-placeholder
content = content.replace('<div class="gallery-grid-placeholder">?"-\'""...</div>', '<div class="gallery-grid-placeholder">Загрузка...</div>')
content = content.replace('<div class="gallery-grid-placeholder">??\'?"? ?? ?"?"???</div>', '<div class="gallery-grid-placeholder">Ничего не найдено</div>')
content = content.replace('<div class="gallery-grid-placeholder">?\'?\'?"" ?""?"?"?</div>', '<div class="gallery-grid-placeholder">Ошибка загрузки</div>')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
