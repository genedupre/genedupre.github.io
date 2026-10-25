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
        const portraitLink = document.getElementById("portrait-open");
        const portraitDialog = document.getElementById("portrait-dialog");
        if (portraitLink && portraitDialog && typeof portraitDialog.showModal === "function") {
            let closingPortrait = null;

            function closePortrait() {
                if (!portraitDialog.open || closingPortrait) {
                    return;
                }
                const request = {};
                closingPortrait = request;
                portraitDialog.classList.remove("is-visible");
                const transitions = portraitDialog.getAnimations({ subtree: true });
                Promise.allSettled(transitions.map((animation) => animation.finished)).then(() => {
                    if (closingPortrait === request) {
                        portraitDialog.close();
                    }
                });
            }

            portraitLink.addEventListener("click", (event) => {
                event.preventDefault();
                if (portraitDialog.open) {
                    return;
                }
                closingPortrait = null;
                root.classList.add("portrait-open");
                portraitDialog.showModal();
                // Resolve the starting position before transitioning into view.
                portraitDialog.getBoundingClientRect();
                portraitDialog.classList.add("is-visible");
            });
            portraitDialog.addEventListener("cancel", (event) => {
                event.preventDefault();
                closePortrait();
            });
            portraitDialog.querySelector("form").addEventListener("submit", (event) => {
                event.preventDefault();
                closePortrait();
            });
            portraitDialog.addEventListener("click", (event) => {
                if (event.target !== portraitDialog) {
                    return;
                }
                const bounds = portraitDialog.getBoundingClientRect();
                if (event.clientX < bounds.left || event.clientX > bounds.right ||
                    event.clientY < bounds.top || event.clientY > bounds.bottom) {
                    closePortrait();
                }
            });
            portraitDialog.addEventListener("close", () => {
                if (portraitDialog.open) {
                    return;
                }
                closingPortrait = null;
                portraitDialog.classList.remove("is-visible");
                root.classList.remove("portrait-open");
            });
            window.addEventListener("beforeprint", () => {
                portraitDialog.close();
                root.classList.remove("portrait-open");
            });
        }

        const controls = document.getElementById("manual-controls");
        if (!controls) {
            return;
        }

        const themeButton = document.getElementById("theme-toggle");
        const expandButton = document.getElementById("expand-toggle");
        const layoutButton = document.getElementById("layout-toggle");
        const workEntries = [...document.querySelectorAll("#work > details")];
        const entryAnimations = new Map();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let themeTransitionTimer;

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
            window.clearTimeout(themeTransitionTimer);
            root.classList.add("theme-changing");
            preferredTheme = root.dataset.theme === "dark" ? "light" : "dark";
            applyTheme(preferredTheme);
            themeTransitionTimer = window.setTimeout(() => {
                root.classList.remove("theme-changing");
            }, 250);
            try {
                window.localStorage.setItem(storageKey, preferredTheme);
            } catch {
                // Keep the selected theme for this visit even without storage.
            }
        });

        function isEntryOpen(entry) {
            return entryAnimations.get(entry)?.expanded ?? entry.open;
        }

        function setEntryOpen(entry, expanded, animate = true) {
            const previous = entryAnimations.get(entry);
            if (!previous && entry.open === expanded) {
                return;
            }

            const content = entry.querySelector("div");
            const startHeight = entry.getBoundingClientRect().height;
            const startOpacity = entry.open ? Number(window.getComputedStyle(content).opacity) : 0;
            if (previous) {
                entryAnimations.delete(entry);
                previous.height.cancel();
                previous.opacity.cancel();
            }
            entry.style.overflow = "";
            entry.open = expanded;
            if (!animate || reducedMotion.matches || typeof entry.animate !== "function") {
                updateExpandButton();
                return;
            }

            const endHeight = entry.getBoundingClientRect().height;
            entry.open = true;
            entry.style.overflow = "clip";
            const height = entry.animate([
                { height: `${startHeight}px` },
                { height: `${endHeight}px` }
            ], { duration: 220, easing: "ease-in-out", fill: "both" });
            const opacity = content.animate([
                { opacity: startOpacity },
                { opacity: expanded ? 1 : 0 }
            ], { duration: 180, easing: "ease-in-out", fill: "both" });
            const transition = { height, opacity, expanded };
            entryAnimations.set(entry, transition);
            height.onfinish = () => {
                if (entryAnimations.get(entry) !== transition) {
                    return;
                }
                entry.open = expanded;
                entryAnimations.delete(entry);
                height.cancel();
                opacity.cancel();
                entry.style.overflow = "";
                updateExpandButton();
            };
            updateExpandButton();
        }

        function updateExpandButton() {
            const allOpen = workEntries.every(isEntryOpen);
            expandButton.textContent = allOpen ? "--collapse" : "--expand";
            expandButton.setAttribute("aria-expanded", String(allOpen));
            expandButton.setAttribute("aria-label", `${allOpen ? "Collapse" : "Expand"} all work entries`);
        }

        expandButton.addEventListener("click", () => {
            const open = !workEntries.every(isEntryOpen);
            workEntries.forEach((entry) => {
                setEntryOpen(entry, open);
            });
            updateExpandButton();
        });
        workEntries.forEach((entry) => {
            entry.addEventListener("toggle", updateExpandButton);
            entry.querySelector("summary").addEventListener("click", (event) => {
                if (event.target.closest("a")) {
                    return;
                }
                event.preventDefault();
                setEntryOpen(entry, !isEntryOpen(entry));
            });
        });

        let entriesBeforePrint = null;
        window.addEventListener("beforeprint", () => {
            if (entriesBeforePrint) {
                return;
            }
            entriesBeforePrint = workEntries.map(isEntryOpen);
            workEntries.forEach((entry) => {
                setEntryOpen(entry, true, false);
            });
            updateExpandButton();
        });
        window.addEventListener("afterprint", () => {
            if (!entriesBeforePrint) {
                return;
            }
            workEntries.forEach((entry, index) => {
                setEntryOpen(entry, entriesBeforePrint[index], false);
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
            setEntryOpen(entry, true, false);
            updateExpandButton();
            entry.scrollIntoView({ block: "start" });
        }

        window.addEventListener("hashchange", openLinkedEntry);
        openLinkedEntry();
        updateExpandButton();

        if (typeof navigator.clipboard?.writeText === "function") {
            const copyStatus = document.createElement("span");
            copyStatus.className = "copy-status";
            copyStatus.setAttribute("role", "status");
            copyStatus.setAttribute("aria-live", "polite");
            copyStatus.setAttribute("aria-atomic", "true");
            document.body.append(copyStatus);

            function clearCopyFeedback(link) {
                delete link.dataset.copyFeedback;
                delete link.dataset.copyPlacement;
                delete link.dataset.copySide;
            }

            window.addEventListener("resize", () => {
                document.querySelectorAll(".permalink[data-copy-feedback]").forEach(clearCopyFeedback);
            });

            document.querySelectorAll(".permalink").forEach((link) => {
                const label = (link.getAttribute("aria-label") || "section").replace(/^Permalink to /, "");
                link.setAttribute("aria-label", `Copy link to ${label}`);
                link.title = `Copy link to ${label}`;
                let feedbackTimer;
                let copyAttempt = 0;

                link.addEventListener("click", async (event) => {
                    if (event.defaultPrevented || event.button !== 0 ||
                        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
                        return;
                    }

                    if (window.location.hash === link.hash) {
                        openLinkedEntry();
                    }
                    const url = new URL(link.href);
                    url.search = "";
                    const attempt = ++copyAttempt;
                    let copied = false;
                    try {
                        await navigator.clipboard.writeText(url.href);
                        copied = true;
                    } catch {
                        // The anchor still navigates normally if clipboard access is denied.
                    }
                    if (attempt !== copyAttempt) {
                        return;
                    }

                    window.clearTimeout(feedbackTimer);
                    link.dataset.copyFeedback = copied ? "[copied]" : "[copy failed]";
                    link.dataset.copyPlacement = "inline";
                    const bounds = link.getBoundingClientRect();
                    const heading = link.closest(".work-position, h1, h2");
                    const feedbackStyle = window.getComputedStyle(link, "::after");
                    const feedbackWidth = ["width", "paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"]
                        .reduce((width, property) => width + Number.parseFloat(feedbackStyle[property]), 0);
                    const rightEdge = Math.min(heading?.getBoundingClientRect().right ?? window.innerWidth, window.innerWidth - 8);
                    const gap = Number.parseFloat(window.getComputedStyle(link).fontSize) / 2;
                    if (bounds.right + gap + feedbackWidth > rightEdge) {
                        link.dataset.copyPlacement = "below";
                    }
                    link.dataset.copySide = bounds.left < window.innerWidth / 2 ? "start" : "end";
                    copyStatus.textContent = copied ? `Link to ${label} copied.` :
                        "Copy failed. You can copy the link from the address bar.";
                    feedbackTimer = window.setTimeout(() => clearCopyFeedback(link), copied ? 1500 : 2500);
                });
            });
        }

        controls.hidden = false;
    });
})();
