export class ThemeManager {
    constructor(themeToggleElement) {
        this.themeToggle = themeToggleElement;
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.themeToggle.textContent = '☀️';
        } else {
            this.themeToggle.textContent = '🌙';
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.themeToggle.textContent = isDark ? '☀️' : '🌙';
    }
}
