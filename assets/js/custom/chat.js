
// --- START: Custom Scroll Height Logic ---

function getElementHeight(element) {
    if (!element) {
        return 0;
    }
    const style = window.getComputedStyle(element);
    let height = parseFloat(style.height) || 0;
    height += parseFloat(style.marginTop) || 0;
    height += parseFloat(style.marginBottom) || 0;
    height += parseFloat(style.borderTopWidth) || 0;
    height += parseFloat(style.borderBottomWidth) || 0;
    return height;
}

function getElementSpacing(element) {
    if (!element) {
        return 0;
    }
    const style = window.getComputedStyle(element);
    let spacing = 0;
    spacing += parseFloat(style.marginTop) || 0;
    spacing += parseFloat(style.marginBottom) || 0;
    spacing += parseFloat(style.paddingTop) || 0;
    spacing += parseFloat(style.paddingBottom) || 0;
    spacing += parseFloat(style.borderTopWidth) || 0;
    spacing += parseFloat(style.borderBottomWidth) || 0;
    return spacing;
}

function updateChatScrollHeight() {
    const scrollElement = document.querySelector('.scroll-y');
    if (!scrollElement) {
        return;
    }

    const dependenciesSelector = scrollElement.getAttribute('data-kt-scroll-dependencies');
    const wrappersSelector = scrollElement.getAttribute('data-kt-scroll-wrappers');
    const offsetValue = scrollElement.getAttribute('data-kt-scroll-offset') || '0px';

    let height = window.innerHeight;

    // Subtract height of dependencies
    if (dependenciesSelector) {
        const dependencyElements = document.querySelectorAll(dependenciesSelector);
        dependencyElements.forEach(element => {
            if (element.offsetParent !== null) { // is visible
                height -= getElementHeight(element);
            }
        });
    }

    // Subtract spacing of wrappers
    if (wrappersSelector) {
        const wrapperElements = document.querySelectorAll(wrappersSelector);
        wrapperElements.forEach(element => {
            if (element.offsetParent !== null) { // is visible
                height -= getElementSpacing(element);
            }
        });
    }
    
    // Subtract own spacing
    height -= getElementSpacing(scrollElement);

    // Subtract offset
    height -= parseFloat(offsetValue);

    scrollElement.style.height = height + 'px';
}

// --- END: Custom Scroll Height Logic ---

document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat script loaded');

    const toggleButton = document.querySelector('#kt_drawer_chat_toggle');
    const drawer = document.querySelector('.drawer');
    let overlay = null;

    if (!toggleButton || !drawer) {
        console.error('Required drawer elements not found. Aborting script execution.');
        return;
    }

    const showDrawer = () => {
        console.log('Showing drawer...');
        if (!drawer) return;

        // Create and show overlay
        overlay = document.createElement('div');
        overlay.classList.add('drawer-overlay');
        
        document.body.appendChild(overlay);
        overlay.addEventListener('click', hideDrawer);

        // Set attributes and classes for drawer visibility
        drawer.classList.add('drawer-on');
        toggleButton.classList.add('active');
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
        drawer.classList.remove('drawer-on');
        toggleButton.classList.remove('active');
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

    // Close drawer on 'Escape' key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (drawer && drawer.classList.contains('drawer-on')) {
                hideDrawer();
            }
        }
    });
    showDrawer();

    // --- Additions for scroll height ---
    updateChatScrollHeight();
    window.addEventListener('resize', updateChatScrollHeight);
});

