#!/bin/bash
# 1. Variables
sed -i 's/--bg-color: #000000;/--bg-color: transparent;/g' style.css
sed -i 's/--surface-color: #121212;/--surface-color: rgba(45, 45, 45, 0.6);/g' style.css
sed -i 's/--surface-hover: #1e1e1e;/--surface-hover: rgba(60, 60, 60, 0.7);/g' style.css

# 2. Hardcoded grays
sed -i 's/background: #222222;/background: rgba(45, 45, 45, 0.6);/g' style.css
sed -i 's/background: #1a1a1a;/background: rgba(45, 45, 45, 0.6);/g' style.css

# 3. Widget class
sed -i '/^\.widget {/,/^}/c\
.widget {\
    background: rgba(255, 255, 255, 0.15);\
    backdrop-filter: blur(12px);\
    -webkit-backdrop-filter: blur(12px);\
    border: none;\
    border-radius: var(--radius-lg);\
    padding: 14px 22px;\
    display: flex;\
    flex-direction: column;\
    position: relative;\
    overflow: hidden;\
    min-height: 0;\
    min-width: 0;\
    height: 100%;\
    width: 100%;\
    box-sizing: border-box;\
    color: #ffffff;\
    box-shadow: none;\
    transition: transform 0.15s ease;\
}' style.css

# 4. Remove widget[data-id=...] backgrounds
sed -i '/\.widget\[data-id="schedule"\] {/,/}/d' style.css
sed -i '/\.widget\[data-id="parking"\] {/,/}/d' style.css
sed -i '/\.widget\[data-id="mensa"\] {/,/}/d' style.css
sed -i '/\.widget\[data-id="events"\] {/,/}/d' style.css
sed -i '/\.widget\[data-id="weather"\] {/,/}/d' style.css
sed -i '/\.widget\[data-id="webcam"\] {/,/}/ {
    s/background: #000000;//g
}' style.css

# 5. Page and dashboard
sed -i 's/background-color: var(--bg-color);/background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);/g' style.css
sed -i '/#page-dashboard {/a \    background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none;\n    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s, visibility 0.3s;' style.css
sed -i '/#page-dashboard:not(.active) {/,/}/c\
#page-dashboard:not(.active) {\
    transform: translateX(-30%);\
    opacity: 0;\
    visibility: hidden;\
}' style.css

# 6. Sheet container
sed -i 's/background: #141414;/background: rgba(35, 35, 35, 0.75); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-top: 1px solid rgba(255, 255, 255, 0.15);/g' style.css

# 7. Resizing box shadow
sed -i 's/box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);/box-shadow: none;/g' style.css

# 8. Body background
cat << 'CSS' >> style.css

/* Background image settings */
body {
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    background-color: #000000;
}
body.bg-1 { background-image: url('img/bg1.jpg'); }
body.bg-2 { background-image: url('img/bg2.jpg'); }
body.bg-3 { background-image: url('img/bg3.jpg'); }
body.bg-none { background-image: none; background-color: #000000; }
CSS
