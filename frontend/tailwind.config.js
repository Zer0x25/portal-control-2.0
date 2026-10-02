// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    screens: {
      xs: "375px", // Small smartphones (6")
      sm: "640px", // Large smartphones / Phablets (7")
      md: "768px", // Tablets (10")
      lg: "1024px", // Laptops
      xl: "1280px", // Desktops
      "2xl": "1536px", // Large Desktops / UHD (19"+)
      "3xl": "1920px", // Ultra-wide / 4K
    },
    extend: {
      colors: {
        "sap-blue": "var(--accent-professional)",
        "sap-light-blue": "#007bff",
        "sap-gray": "var(--surface-app)",
        "sap-bone": "var(--surface-card)",
        "sap-dark-gray": "#343a40",
        "sap-medium-gray": "#6c757d",
        "sap-border": "var(--border-technical)",
        "sap-success": "var(--status-success)",
        "sap-error": "var(--status-error)",
        "sap-warning": "var(--status-warning)",
        "sap-info": "var(--status-info)",
        // New Semantic Tokens
        token: {
          surface: {
            app: "var(--surface-app)",
            card: "var(--surface-card)",
            header: "var(--surface-header)",
            hover: "var(--surface-hover)",
            active: "var(--surface-active)",
            stripe: "var(--surface-stripe)",
          },
          border: {
            technical: "var(--border-technical)",
            subtle: "var(--border-subtle)",
            focus: "var(--border-focus)",
          },
          text: {
            primary: "var(--text-primary)",
            secondary: "var(--text-secondary)",
            tertiary: "var(--text-tertiary)",
            onAccent: "var(--text-on-accent)",
          },
          status: {
            success: "var(--status-success)",
            error: "var(--status-error)",
            warning: "var(--status-warning)",
            info: "var(--status-info)",
          },
          accent: {
            brand: "var(--accent-professional)",
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'Roboto Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
