// ===================================
// Lecture Data Configuration
// ===================================
const LECTURES = {
    16: {
        title: 'GPIO - General Purpose I/O',
        file: 'lec_16.md',
        pdf: 'pdf/CSE331_L16-17_GPIO_P1_SH.pdf'
    },
    17: {
        title: 'General Purpose Timer',
        file: 'lec_17.md',
        pdf: 'pdf/CSE331_L17_GPTimer_P1_SH.pdf'
    },
    20: {
        title: 'DAC, ADC & Stepper Motors',
        file: 'lec_20.md',
        pdf: 'pdf/CSE331_L20_DAC_ADC_SH.pdf'
    },
    21: {
        title: 'DMA & UART',
        file: 'lec_21.md',
        pdf: 'pdf/CSE331_L21_DMA_UART_SH.pdf'
    }
};

// ===================================
// State Management
// ===================================
let currentLecture = 16;
let lectureCache = {};

// ===================================
// Markdown Parser
// ===================================
class MarkdownParser {
    constructor() {
        this.rules = [
            // Headers
            { pattern: /^### (.+)$/gm, replacement: '<h3>$1</h3>' },
            { pattern: /^## (.+)$/gm, replacement: '<h2>$1</h2>' },
            { pattern: /^# (.+)$/gm, replacement: '<h1>$1</h1>' },

            // Horizontal rules
            { pattern: /^---$/gm, replacement: '<hr>' },

            // Code blocks (must come before inline code)
            {
                pattern: /```(\w+)?\n([\s\S]*?)```/g, replacement: (match, lang, code) => {
                    return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
                }
            },

            // Bold and italic combined
            { pattern: /\*\*\*(.+?)\*\*\*/g, replacement: '<strong><em>$1</em></strong>' },
            { pattern: /___(.+?)___/g, replacement: '<strong><em>$1</em></strong>' },

            // Bold
            { pattern: /\*\*(.+?)\*\*/g, replacement: '<strong>$1</strong>' },
            { pattern: /__(.+?)__/g, replacement: '<strong>$1</strong>' },

            // Italic
            { pattern: /\*(.+?)\*/g, replacement: '<em>$1</em>' },
            { pattern: /_(.+?)_/g, replacement: '<em>$1</em>' },

            // Inline code
            { pattern: /`([^`]+)`/g, replacement: '<code>$1</code>' },

            // Links
            { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>' }
        ];
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    parseList(text) {
        const lines = text.split('\n');
        let result = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            // Check if this line is a list item
            const unorderedMatch = line.match(/^(\s*)([\*\-\+]) (.+)$/);
            const orderedMatch = line.match(/^(\s*)\d+\. (.+)$/);

            if (unorderedMatch || orderedMatch) {
                // Start of a list - collect all consecutive list items
                const listLines = [];
                const isOrdered = !!orderedMatch;

                while (i < lines.length) {
                    const currentLine = lines[i];
                    const currentTrimmed = currentLine.trim();

                    // Check if still a list item
                    const isUnordered = /^(\s*)([\*\-\+]) (.+)$/.test(currentLine);
                    const isOrdered = /^(\s*)\d+\. (.+)$/.test(currentLine);

                    if (isUnordered || isOrdered) {
                        listLines.push(currentLine);
                        i++;
                    } else if (currentTrimmed === '') {
                        // Empty line might be part of list or end of list
                        // Check if next line is also a list item
                        if (i + 1 < lines.length) {
                            const nextLine = lines[i + 1];
                            const nextIsUnordered = /^(\s*)([\*\-\+]) (.+)$/.test(nextLine);
                            const nextIsOrdered = /^(\s*)\d+\. (.+)$/.test(nextLine);

                            if (nextIsUnordered || nextIsOrdered) {
                                // Continue the list
                                i++;
                                continue;
                            }
                        }
                        // End of list
                        break;
                    } else {
                        // Not a list item, end of list
                        break;
                    }
                }

                // Now parse the collected list lines
                const listHtml = this.parseListItems(listLines, isOrdered);
                result.push(listHtml);
            } else {
                // Not a list item, keep as is
                result.push(line);
                i++;
            }
        }

        return result.join('\n');
    }

    parseListItems(lines, isOrdered) {
        const listTag = isOrdered ? 'ol' : 'ul';
        let html = `<${listTag}>`;

        for (let line of lines) {
            // Extract content after the list marker
            let content;
            if (isOrdered) {
                content = line.replace(/^(\s*)\d+\. (.+)$/, '$2');
            } else {
                content = line.replace(/^(\s*)([\*\-\+]) (.+)$/, '$3');
            }

            html += `<li>${content}</li>`;
        }

        html += `</${listTag}>`;
        return html;
    }

    parseParagraphs(text) {
        const lines = text.split('\n');
        let result = [];
        let inParagraph = false;
        let paragraphContent = [];

        for (let line of lines) {
            const trimmed = line.trim();

            // Skip if line is a block element
            if (trimmed.startsWith('<h') ||
                trimmed.startsWith('<ul') ||
                trimmed.startsWith('<ol') ||
                trimmed.startsWith('<li') ||
                trimmed.startsWith('<pre') ||
                trimmed.startsWith('<hr') ||
                trimmed.startsWith('</')) {

                if (inParagraph) {
                    result.push(`<p>${paragraphContent.join(' ')}</p>`);
                    paragraphContent = [];
                    inParagraph = false;
                }
                result.push(line);
            } else if (trimmed === '') {
                if (inParagraph) {
                    result.push(`<p>${paragraphContent.join(' ')}</p>`);
                    paragraphContent = [];
                    inParagraph = false;
                }
            } else {
                inParagraph = true;
                paragraphContent.push(trimmed);
            }
        }

        if (inParagraph) {
            result.push(`<p>${paragraphContent.join(' ')}</p>`);
        }

        return result.join('\n');
    }

    parse(markdown) {
        let html = markdown;

        // Apply all rules
        for (let rule of this.rules) {
            if (typeof rule.replacement === 'function') {
                html = html.replace(rule.pattern, rule.replacement);
            } else {
                html = html.replace(rule.pattern, rule.replacement);
            }
        }

        // Parse lists
        html = this.parseList(html);

        // Parse paragraphs
        html = this.parseParagraphs(html);

        return html;
    }
}

// ===================================
// Lecture Management
// ===================================
async function loadLecture(lectureNum) {
    const lecture = LECTURES[lectureNum];
    if (!lecture) return;

    const contentEl = document.getElementById('lectureContent');
    const titleEl = document.getElementById('lectureTitle');
    const badgeEl = document.getElementById('lectureBadge');
    const pdfLinkEl = document.getElementById('pdfLink');

    // Show loading state
    contentEl.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading lecture content...</p>
        </div>
    `;

    try {
        let markdown;

        // Check cache
        if (lectureCache[lectureNum]) {
            markdown = lectureCache[lectureNum];
        } else {
            const response = await fetch(lecture.file);
            if (!response.ok) throw new Error('Failed to load lecture');
            markdown = await response.text();
            lectureCache[lectureNum] = markdown;
        }

        // Parse markdown to HTML
        const parser = new MarkdownParser();
        const html = parser.parse(markdown);

        // Update UI
        contentEl.innerHTML = html;
        titleEl.textContent = lecture.title;
        badgeEl.textContent = `Lecture ${lectureNum}`;
        pdfLinkEl.href = lecture.pdf;

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.lecture) === lectureNum) {
                item.classList.add('active');
            }
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        currentLecture = lectureNum;

    } catch (error) {
        contentEl.innerHTML = `
            <div class="loading">
                <p style="color: var(--color-text-secondary);">
                    ⚠️ Error loading lecture. Please try again.
                </p>
            </div>
        `;
        console.error('Error loading lecture:', error);
    }
}

// ===================================
// Reading Controls
// ===================================
function initializeControls() {
    // Controls panel toggle
    const controlsToggle = document.getElementById('controlsToggle');
    const controlsPanel = document.getElementById('controlsPanel');

    controlsToggle.addEventListener('click', () => {
        controlsPanel.classList.toggle('active');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!controlsPanel.contains(e.target) && !controlsToggle.contains(e.target)) {
            controlsPanel.classList.remove('active');
        }
    });

    // Text size controls
    const textSizeButtons = document.querySelectorAll('[data-size]');
    textSizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const size = btn.dataset.size;
            document.documentElement.setAttribute('data-text-size', size);
            localStorage.setItem('textSize', size);

            textSizeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Line spacing controls
    const spacingButtons = document.querySelectorAll('[data-spacing]');
    spacingButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const spacing = btn.dataset.spacing;
            document.documentElement.setAttribute('data-line-spacing', spacing);
            localStorage.setItem('lineSpacing', spacing);

            spacingButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Load saved preferences
    loadPreferences();
}

function loadPreferences() {
    // Load theme
    const savedTheme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Load text size
    const savedSize = localStorage.getItem('textSize') || 'medium';
    document.documentElement.setAttribute('data-text-size', savedSize);
    document.querySelectorAll('[data-size]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === savedSize);
    });

    // Load line spacing
    const savedSpacing = localStorage.getItem('lineSpacing') || 'normal';
    document.documentElement.setAttribute('data-line-spacing', savedSpacing);
    document.querySelectorAll('[data-spacing]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.spacing === savedSpacing);
    });
}

// ===================================
// Navigation
// ===================================
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const lectureNum = parseInt(item.dataset.lecture);
            loadLecture(lectureNum);
        });
    });
}

// ===================================
// Keyboard Shortcuts
// ===================================
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Arrow keys for navigation
        if (e.key === 'ArrowLeft') {
            const lectures = Object.keys(LECTURES).map(Number);
            const currentIndex = lectures.indexOf(currentLecture);
            if (currentIndex > 0) {
                loadLecture(lectures[currentIndex - 1]);
            }
        } else if (e.key === 'ArrowRight') {
            const lectures = Object.keys(LECTURES).map(Number);
            const currentIndex = lectures.indexOf(currentLecture);
            if (currentIndex < lectures.length - 1) {
                loadLecture(lectures[currentIndex + 1]);
            }
        }

        // 'D' for dark mode toggle
        if (e.key === 'd' || e.key === 'D') {
            if (!e.target.matches('input, textarea')) {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            }
        }
    });
}

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    initializeControls();
    initializeNavigation();
    initializeKeyboardShortcuts();

    // Load first lecture
    loadLecture(currentLecture);
});

// ===================================
// Service Worker for GitHub Pages (Optional)
// ===================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Only register if sw.js exists
        fetch('/sw.js', { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    navigator.serviceWorker.register('/sw.js')
                        .then(reg => console.log('Service Worker registered'))
                        .catch(err => console.log('Service Worker registration failed'));
                }
            })
            .catch(() => {
                // sw.js doesn't exist, skip registration
            });
    });
}
