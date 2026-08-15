document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('about-modal');
    const openButton = document.getElementById('about-btn');
    const closeButton = document.getElementById('close-about-btn');

    const close = () => modal?.classList.add('hidden');
    openButton?.addEventListener('click', () => modal?.classList.remove('hidden'));
    closeButton?.addEventListener('click', close);
    modal?.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal?.classList.contains('hidden')) close();
    });
});
