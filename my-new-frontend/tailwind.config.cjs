/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: { light: '#2972FF', dark: '#5596FF' },
                secondary: { light: '#1AC9C9', dark: '#3EDDDD' },
                white: '#ffffff', // Add white for bg-white
            },
        },
    },
    plugins: [],
}
