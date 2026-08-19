// Full, versioned Midvea backup/restore. Chrome bookmarks use new IDs after
// restoration, so bookmark-linked data is remapped before it is saved.
(() => {
    const PRODUCT = 'Midvea Shelter';
    const SCHEMA_VERSION = 1;
    const t = source => window.MidveaI18n?.t(source) || source;
    const getStorage = keys => new Promise(resolve => chrome.storage.local.get(keys, resolve));
    const setStorage = values => new Promise((resolve, reject) => chrome.storage.local.set(values, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message)); else resolve();
    }));
    const getSubTree = id => new Promise((resolve, reject) => chrome.bookmarks.getSubTree(id, result => {
        if (chrome.runtime.lastError || !result?.[0]) reject(new Error(chrome.runtime.lastError?.message || 'Bookmark root not found')); else resolve(result[0]);
    }));
    const getChildren = id => new Promise((resolve, reject) => chrome.bookmarks.getChildren(id, result => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message)); else resolve(result || []);
    }));
    const createBookmark = data => new Promise((resolve, reject) => chrome.bookmarks.create(data, result => {
        if (chrome.runtime.lastError || !result) reject(new Error(chrome.runtime.lastError?.message || 'Bookmark creation failed')); else resolve(result);
    }));
    const removeBookmark = node => new Promise((resolve, reject) => {
        const callback = () => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve();
        if (node.url) chrome.bookmarks.remove(node.id, callback); else chrome.bookmarks.removeTree(node.id, callback);
    });

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('full-backup-export-button')?.addEventListener('click', () => exportBackup().catch(() => {}));
        document.getElementById('full-backup-import-input')?.addEventListener('change', importBackupFile);
    });

    async function buildBackup() {
        const storage = await getStorage(null);
        const rootId = storage.bookmarksFolderId;
        if (!rootId) throw new Error(t('Папка Midvea Shelter ещё не создана.'));
        const bookmarks = await getSubTree(rootId);
        return {
            product: PRODUCT,
            schemaVersion: SCHEMA_VERSION,
            extensionVersion: chrome.runtime.getManifest().version,
            exportedAt: new Date().toISOString(),
            storage,
            bookmarks
        };
    }

    function downloadJson(payload, prefix = 'midvea-backup') {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function exportBackup(prefix) {
        const status = document.getElementById('bookmark-import-status');
        if (status) status.textContent = t('Подготовка полной резервной копии…');
        try {
            downloadJson(await buildBackup(), prefix);
            if (status) status.textContent = t('Полная резервная копия сохранена.');
        } catch (error) {
            if (status) status.textContent = `${t('Ошибка резервного копирования:')} ${error.message}`;
            throw error;
        }
    }

    async function importBackupFile(event) {
        const input = event.currentTarget;
        const status = document.getElementById('bookmark-import-status');
        const file = input.files?.[0];
        if (!file) return;
        try {
            const backup = JSON.parse(await file.text());
            validateBackup(backup);
            if (!confirm(t('Текущие закладки Midvea будут заменены данными из копии. Перед заменой будет скачана страховочная копия. Продолжить?'))) return;
            await exportBackup('midvea-before-restore');
            if (status) status.textContent = t('Восстановление данных…');
            await restoreBackup(backup);
            if (status) status.textContent = t('Данные восстановлены. Страница перезагружается…');
            setTimeout(() => location.reload(), 500);
        } catch (error) {
            if (status) status.textContent = `${t('Ошибка восстановления:')} ${error.message}`;
        } finally {
            input.value = '';
        }
    }

    function validateBackup(value) {
        if (!value || value.product !== PRODUCT || value.schemaVersion !== SCHEMA_VERSION) throw new Error(t('Файл не является совместимой резервной копией Midvea Shelter.'));
        if (!value.storage || typeof value.storage !== 'object' || !value.bookmarks || !Array.isArray(value.bookmarks.children)) throw new Error(t('Резервная копия повреждена или неполна.'));
    }

    async function restoreBackup(backup) {
        const current = await getStorage(['bookmarksFolderId']);
        const rootId = current.bookmarksFolderId;
        if (!rootId) throw new Error(t('Текущая папка Midvea Shelter не найдена.'));
        const existing = await getChildren(rootId);
        for (const node of existing) await removeBookmark(node);

        const idMap = new Map([[String(backup.bookmarks.id), String(rootId)]]);
        const restoreNodes = async (nodes, parentId) => {
            for (const node of nodes || []) {
                const created = await createBookmark({ parentId, title: String(node.title || (node.url ? node.url : 'Папка')), ...(node.url ? { url: String(node.url) } : {}) });
                idMap.set(String(node.id), String(created.id));
                if (!node.url) await restoreNodes(node.children, created.id);
            }
        };
        await restoreNodes(backup.bookmarks.children, rootId);

        const restored = { ...backup.storage, bookmarksFolderId: rootId };
        const mapId = value => idMap.get(String(value)) || value;
        if (restored.activeBookmarkTabId) restored.activeBookmarkTabId = mapId(restored.activeBookmarkTabId);
        if (restored.defaultBookmarkCategoryId && !['last', 'main'].includes(restored.defaultBookmarkCategoryId)) restored.defaultBookmarkCategoryId = mapId(restored.defaultBookmarkCategoryId);
        if (restored.customIcons && typeof restored.customIcons === 'object') {
            restored.customIcons = Object.fromEntries(Object.entries(restored.customIcons)
                .filter(([oldId]) => idMap.has(String(oldId)))
                .map(([oldId, data]) => [mapId(oldId), data]));
        }
        restored.midveaDataSchemaVersion = SCHEMA_VERSION;
        await setStorage(restored);
    }
})();
