/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Colores primarios
        primary: {
          white: '#FFFFFF',
          black: '#000000',
        },
        // Colores secundarios - Verde
        secondary: {
          DEFAULT: '#218358',
          light: '#F4FBF6',
          transparent: '#F4FBF6',
        },
        // Colores neutrales
        neutral: {
          subheading: '#737373',
          border: '#E5E5E5',
        },
        // Colores para hover/flotar/gráficos
        accent: {
          hover: '#0A0A0A',
          titles: '#0A0A0A',
        },
        // Iconos
        icon: {
          DEFAULT: '#000000',
        },
        // Fondo navegación
        nav: {
          bg: '#D4D4D4',
        },
        // Precios
        price: {
          DEFAULT: '#FE714B',
        },
        // Gráficos - Diferentes tonos de verde
        chart: {
          green: {
            1: '#218358',
            2: '#2B9A66',
            3: '#30A46C',
            4: '#5BB98B',
            5: '#193B2D',
          },
        },
        // Mapa Perú
        map: {
          red: {
            1: '#A0534C',
            2: '#CF7971',
          },
          orange: '#EA580C',
        },
        // UMP (Unidad Mínima de Producción)
        ump: {
          blue: '#3B00FF',
        },
        // Árboles
        tree: {
          yellow: '#FDE68A',
        },
        // Colores de marca legacy (mantener para retrocompatibilidad)
        brand: {
          50: '#f2fbf4',
          100: '#e4f7e9',
          200: '#c3ebcc',
          300: '#9dddaa',
          400: '#69c17b',
          500: '#3da558',
          600: '#2f8747',
          700: '#276c3b',
          800: '#215531',
          900: '#1c452a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        body: '14pt', // Regular / Texto de lectura
        subtitle: '12pt', // Subtítulos
        button: '14pt', // Botones
        title: '30pt', // Títulos, títulos de gráficos bold
      },
    },
  },
  plugins: [],
};
