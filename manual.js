(() => {
    const root = document.documentElement;
    const storageKey = "genedupre-theme";
    let preferredTheme = null;

    try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved === "light" || saved === "dark") {
            preferredTheme = saved;
        }
    } catch {
        // Theme switching still works when browser storage is unavailable.
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

    applyTheme(preferredTheme || "light");

    document.addEventListener("DOMContentLoaded", () => {
        const controls = document.getElementById("manual-controls");
        if (!controls) {
            return;
        }

        const themeButton = document.getElementById("theme-toggle");
        const expandButton = document.getElementById("expand-toggle");
        const workEntries = [...document.querySelectorAll("#work > details")];

        applyTheme(root.dataset.theme);
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
