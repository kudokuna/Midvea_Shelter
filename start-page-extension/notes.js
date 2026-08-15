// notes.js — Notes Widget
document.addEventListener('DOMContentLoaded', () => {
    const t = window.MidveaI18n?.t || (value => value);
    let notes = [];

    function loadNotes() {
        chrome.storage.local.get(['notes'], (r) => {
            notes = r.notes || [];
            renderNotes();
        });
    }

    function saveNotes() {
        chrome.storage.local.set({ notes: notes.map(n => ({ id: n.id, text: n.text })) });
    }

    function renderNotes() {
        const list = document.getElementById('notes-list');
        list.innerHTML = '';

        notes.forEach((note, idx) => {
            const noteEl = document.createElement('div');
            noteEl.className = 'notes-widget__note-widget';

            const content = document.createElement('div');
            content.className = 'notes-widget__content';
            content.contentEditable = 'true';
            content.setAttribute('role', 'textbox');
            content.setAttribute('aria-label', t('Текст заметки'));
            content.textContent = note.text;
            content.spellcheck = false;

            content.addEventListener('blur', () => {
                const text = content.textContent.trim();
                if (!text) {
                    notes.splice(idx, 1);
                    saveNotes();
                    renderNotes();
                    return;
                }
                notes[idx].text = text.slice(0, 500);
                saveNotes();
            });

            content.addEventListener('input', () => {
                if (content.textContent.length > 500) content.textContent = content.textContent.slice(0, 500);
            });

            content.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    content.blur();
                }
                if (e.key === 'Escape') content.blur();
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'notes-widget__remove';
            removeBtn.type = 'button';
            removeBtn.innerHTML = '✕';
            removeBtn.title = t('Удалить');
            removeBtn.setAttribute('aria-label', t('Удалить заметку'));
            removeBtn.addEventListener('click', () => {
                notes.splice(idx, 1);
                saveNotes();
                renderNotes();
            });

            noteEl.appendChild(content);
            noteEl.appendChild(removeBtn);
            list.appendChild(noteEl);
        });

        // Add note inline button
        const addBtn = document.createElement('button');
        addBtn.className = 'notes-widget__add-note';
        addBtn.type = 'button';
        addBtn.innerHTML = `<span style="font-size:15px;line-height:1">+</span> ${t('Новая заметка')}`;
        addBtn.addEventListener('click', () => addNote());
        list.appendChild(addBtn);
    }

    function addNote() {
        const newNote = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, text: '' };
        notes.push(newNote);
        saveNotes();
        renderNotes();
        // Focus last note
        setTimeout(() => {
            const contents = document.querySelectorAll('.notes-widget__content');
            if (contents.length > 0) contents[contents.length - 1].focus();
        }, 40);
    }

    // Header add button
    const headerAddBtn = document.getElementById('add-note-btn');
    if (headerAddBtn) {
        headerAddBtn.addEventListener('click', () => addNote());
    }

    loadNotes();
});
