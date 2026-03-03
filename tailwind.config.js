/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                vastu: {
                    dark: '#7a604a',       // Original warm brown
                    'dark-deep': '#5a4035', // Deeper brown for hover/hero
                    accent: '#c4b7b3',     // Main accent for UI (sidebar, headers)
                    gold: '#d4b896',        // Warm gold for hero accents
                    light: '#faf8f6',      // Warm off-white
                    cream: '#f3eeea',      // Slightly darker cream for cards
                    sand: '#e8ddd4',       // Warm sand for borders
                    text: '#2A2A2A',       // Dark text
                    'text-light': '#666666', // Muted text
                }
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'Georgia', 'serif'],
                sans: ['"Inter"', 'system-ui', 'sans-serif'],
                body: ['"Source Sans 3"', 'sans-serif'],
                script: ['"Dancing Script"', 'cursive'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'sidebar-gradient': 'linear-gradient(180deg, #c4b7b3 0%, #b0a5a1 100%)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                glow: {
                    '0%, 100%': { opacity: '0.6' },
                    '50%': { opacity: '1' },
                },
                celebrate: {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)' },
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.6s ease-out forwards',
                'glow': 'glow 2s ease-in-out infinite',
                'celebrate': 'celebrate 0.4s ease-out',
            }
        },
    },
    plugins: [],
}
