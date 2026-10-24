(() => {
    const root = document.documentElement;
    const storageKey = "genedupre-theme";
    const layoutStorageKey = "genedupre-layout";
    let preferredTheme = null;
    let preferredLayout = "narrow";

    try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved === "light" || saved === "dark") {
            preferredTheme = saved;
        }
        if (window.localStorage.getItem(layoutStorageKey) === "wide") {
            preferredLayout = "wide";
        }
    } catch {
        // Controls still work when browser storage is unavailable.
    }

    function applyTheme(theme) {
        root.dataset.theme = theme;
        const button = document.getElementById("theme-toggle");
        if (button) {
            const nextTheme = theme === "dark" ? "light" : "dark";
            button.textContent = `--theme=${theme}`;
            button.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
            button.title = `Switch to ${nextTheme} theme`;
        }
    }

    function applyLayout(layout) {
        root.dataset.layout = layout;
        const button = document.getElementById("layout-toggle");
        if (button) {
            const wide = layout === "wide";
            button.textContent = wide ? "--narrow" : "--wide";
            button.setAttribute("aria-pressed", String(wide));
            button.setAttribute("aria-label", `Switch to ${wide ? "narrow" : "wide"} layout`);
            button.title = `Switch to ${wide ? "narrow" : "wide"} layout`;
        }
    }

    applyTheme(preferredTheme || "light");
    applyLayout(preferredLayout);

    document.addEventListener("DOMContentLoaded", () => {
        const controls = document.getElementById("manual-controls");
        if (!controls) {
            return;
        }

        const themeButton = document.getElementById("theme-toggle");
        const expandButton = document.getElementById("expand-toggle");
        const layoutButton = document.getElementById("layout-toggle");
        const workEntries = [...document.querySelectorAll("#work > details")];

        applyTheme(root.dataset.theme);
        applyLayout(root.dataset.layout);
        layoutButton.addEventListener("click", () => {
            preferredLayout = root.dataset.layout === "wide" ? "narrow" : "wide";
            applyLayout(preferredLayout);
            try {
                window.localStorage.setItem(layoutStorageKey, preferredLayout);
            } catch {
                // Keep the selected layout for this visit even without storage.
            }
        });
        themeButton.addEventListener("click", () => {
            preferredTheme = root.dataset.theme === "dark" ? "light" : "dark";
            applyTheme(preferredTheme);
            try {
                window.localStorage.setItem(storageKey, preferredTheme);
            } catch {
                // Keep the selected theme for this visit even without storage.
            }
        });

        function updateExpandButton() {
            const allOpen = workEntries.every((entry) => entry.open);
            expandButton.textContent = allOpen ? "--collapse" : "--expand";
            expandButton.setAttribute("aria-expanded", String(allOpen));
            expandButton.setAttribute("aria-label", `${allOpen ? "Collapse" : "Expand"} all work entries`);
        }

        expandButton.addEventListener("click", () => {
            const open = !workEntries.every((entry) => entry.open);
            workEntries.forEach((entry) => {
                entry.open = open;
            });
            updateExpandButton();
        });
        workEntries.forEach((entry) => entry.addEventListener("toggle", updateExpandButton));

        let entriesBeforePrint = null;
        window.addEventListener("beforeprint", () => {
            if (entriesBeforePrint) {
                return;
            }
            entriesBeforePrint = workEntries.map((entry) => entry.open);
            workEntries.forEach((entry) => {
                entry.open = true;
            });
            updateExpandButton();
        });
        window.addEventListener("afterprint", () => {
            if (!entriesBeforePrint) {
                return;
            }
            workEntries.forEach((entry, index) => {
                entry.open = entriesBeforePrint[index];
            });
            entriesBeforePrint = null;
            updateExpandButton();
        });

        function openLinkedEntry() {
            let id;
            try {
                id = decodeURIComponent(window.location.hash.slice(1));
            } catch {
                return;
            }
            const entry = workEntries.find((entry) => entry.id === id);
            if (!entry) {
                return;
            }
            entry.open = true;
            updateExpandButton();
            entry.scrollIntoView({ block: "start" });
        }

        window.addEventListener("hashchange", openLinkedEntry);
        openLinkedEntry();
        updateExpandButton();
        controls.hidden = false;
    });
})();
