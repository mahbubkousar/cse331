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
            { pattern: /```(\w+)?\n([\s\S]*?)```/g, replacement: (match, lang, code) => {
                return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
            }},
            
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
        // Parse unordered lists
        text = text.replace(/^(\s*)[\*\-\+] (.+)$/gm, (match, indent, content) => {
            const level = indent.length / 4;
            return `<li data-level="${level}">${content}</li>`;
        });
        
        // Parse ordered lists
        text = text.replace(/^(\s*)\d+\. (.+)$/gm, (match, indent, content) => {
            const level = indent.length / 4;
            return `<li data-level="${level}" data-ordered="true">${content}</li>`;
        });
        
        // Wrap lists in ul/ol tags
        const lines = text.split('\n');
        let result = [];
        let inList = false;
        let listType = null;
        let currentLevel = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const liMatch = line.match(/<li data-level="(\d+)"(.*?)>(.*?)<\/li>/);
            
            if (liMatch) {
                const level = parseInt(liMatch[1]);
                const isOrdered = liMatch[2].includes('data-ordered="true"');
                const content = liMatch[3];
                
                if (!inList) {
                    listType = isOrdered ? 'ol' : 'ul';
                    result.push(`<${listType}>`);
                    inList = true;
                    currentLevel = level;
                } else if (level > currentLevel) {
                    const newListType = isOrdered ? 'ol' : 'ul';
                    result.push(`<${newListType}>`);
                    currentLevel = level;
                } else if (level < currentLevel) {
                    const closeTag = listType === 'ol' ? '</ol>' : '</ul>';
                    result.push(closeTag);
                    currentLevel = level;
                }
                
                result.push(`<li>${content}</li>`);
            } else {
                if (inList) {
                    const closeTag = listType === 'ol' ? '</ol>' : '</ul>';
                    result.push(closeTag);
                    inList = false;
                    listType = null;
                    currentLevel = 0;
                }
                result.push(line);
            }
        }
        
        if (inList) {
            const closeTag = listType === 'ol' ? '</ol>' : '</ul>';
            result.push(closeTag);
        }
        
        return result.join('\n');
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
