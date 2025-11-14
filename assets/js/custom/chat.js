
document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat script loaded');

    const toggleButton = document.querySelector('#kt_drawer_chat_toggle');
    const drawer = document.querySelector('#kt_drawer_chat');
    const closeButton = document.querySelector('#kt_drawer_chat_close');
    let overlay = null;

    if (!toggleButton) {
        console.error('Toggle button #kt_drawer_chat_toggle not found');
        return;
    }

    if (!drawer) {
        console.error('Drawer #kt_drawer_chat not found');
        return;
    }

    // --- Initial Setup ---
    if (drawer.getAttribute('data-kt-drawer-activate') === 'true') {
        const direction = drawer.getAttribute('data-kt-drawer-direction');
        drawer.classList.add('drawer');
        if (direction) {
            drawer.classList.add('drawer-' + direction);
        }
    }

    const showDrawer = () => {
        console.log('Showing drawer...');
        if (!drawer) return;

        // Create and show overlay
        overlay = document.createElement('div');
        overlay.classList.add('drawer-overlay');
        
        const drawerZIndex = window.getComputedStyle(drawer).zIndex;
        overlay.style.zIndex = String(parseInt(drawerZIndex) - 1);
        
        document.body.appendChild(overlay);
        overlay.addEventListener('click', hideDrawer);

        // Set attributes and classes for drawer visibility
        document.body.setAttribute('data-kt-drawer-chat', 'on');
        document.body.setAttribute('data-kt-drawer', 'on');
        drawer.classList.add('drawer-on');
        if (toggleButton) {
            toggleButton.classList.add('active');
        }
        console.log('Drawer shown');
    };

    const hideDrawer = () => {
        console.log('Hiding drawer...');
        if (!drawer) return;

        // Remove overlay
        if (overlay) {
            overlay.remove();
            overlay = null;
        }

        // Remove attributes and classes
        document.body.removeAttribute('data-kt-drawer-chat');
        document.body.removeAttribute('data-kt-drawer');
        drawer.classList.remove('drawer-on');
        if (toggleButton) {
            toggleButton.classList.remove('active');
        }
        console.log('Drawer hidden');
    };

    const toggleDrawer = () => {
        const isDrawerShown = drawer && drawer.classList.contains('drawer-on');
        console.log('Toggling drawer. Currently shown:', isDrawerShown);
        if (isDrawerShown) {
            hideDrawer();
        } else {
            showDrawer();
        }
    };

    // --- Event Listeners ---

    toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        toggleDrawer();
    });

    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.preventDefault();
            hideDrawer();
        });
    } else {
        console.warn('Close button #kt_drawer_chat_close not found');
    }

    // Close drawer on 'Escape' key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (drawer && drawer.classList.contains('drawer-on')) {
                hideDrawer();
            }
        }
    });
    showDrawer();
});

