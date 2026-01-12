import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Design-specific colors from the HTML reference
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        roboto: ["Roboto", "sans-serif"],
      },
      boxShadow: {
        "2xs": "var(--shadow-2xs)",
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
      },
      spacing: {
        "signature": "var(--spacing)",
      },
      letterSpacing: {
        normal: "var(--tracking-normal)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "signature-highlight": {
          "0%, 100%": {
            backgroundColor: "rgb(239 246 255)",
            borderColor: "rgb(147 197 253)",
          },
          "50%": {
            backgroundColor: "rgb(219 234 254)",
            borderColor: "rgb(59 130 246)",
          },
        },
        "upload-pulse": {
          "0%, 100%": {
            borderColor: "rgb(209 213 219)",
          },
          "50%": {
            borderColor: "rgb(59 130 246)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "signature-highlight": "signature-highlight 2s ease-in-out",
        "upload-pulse": "upload-pulse 2s ease-in-out infinite",
      },
      transitionProperty: {
        'signature': 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
      },
      backdropFilter: {
        'signature': 'blur(8px) saturate(180%)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // Custom plugin for signature-specific utilities
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.signature-grid-cell': {
          '@apply border border-gray-200 rounded flex items-center justify-center hover:bg-blue-50 cursor-pointer transition-colors': {},
        },
        '.signature-grid-cell-active': {
          '@apply bg-blue-100 border-blue-300': {},
        },
        '.signature-box': {
          '@apply absolute bg-white rounded border border-gray-300 p-2 shadow-sm cursor-move': {},
          '&:hover': {
            '@apply shadow-md border-blue-300': {},
          },
        },
        '.file-upload-area': {
          '@apply border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer': {},
        },
        '.file-upload-area-dragover': {
          '@apply border-primary bg-blue-50': {},
        },
        '.toast-success': {
          '@apply bg-green-100 border-green-400 text-green-700': {},
        },
        '.toast-error': {
          '@apply bg-red-100 border-red-400 text-red-700': {},
        },
        '.toast-warning': {
          '@apply bg-yellow-100 border-yellow-400 text-yellow-700': {},
        },
        '.btn-primary': {
          '@apply bg-primary text-primary-foreground hover:bg-primary hover:opacity-90 focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors duration-200': {},
        },
        '.btn-secondary': {
          '@apply bg-secondary text-secondary-foreground hover:bg-secondary hover:opacity-90 focus:ring-2 focus:ring-secondary focus:ring-opacity-50 transition-colors duration-200': {},
        },
        '.btn-success': {
          '@apply bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors duration-200': {},
        },
        '.custom-scrollbar': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'hsl(210 25% 7.8431% / 0.2) transparent',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            'background-color': 'hsl(210 25% 7.8431% / 0.2)',
            'border-radius': '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            'background-color': 'hsl(210 25% 7.8431% / 0.3)',
          },
        },
        '.pdf-viewer-container': {
          '@apply bg-gray-50 flex-1 overflow-auto': {},
        },
        '.pdf-page': {
          '@apply bg-white shadow-lg rounded-lg overflow-hidden': {},
        },
        '.signature-panel': {
          '@apply w-80 bg-white shadow-lg border-l border-gray-200 overflow-auto': {},
        },
        '.sidebar-container': {
          '@apply w-80 bg-white shadow-lg flex flex-col border-r border-gray-200': {},
        },
      }
      
      addUtilities(newUtilities)
    },
  ],
} satisfies Config;
