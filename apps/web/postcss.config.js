import { fileURLToPath, URL } from 'node:url';

const config = fileURLToPath(new URL('./tailwind.config.js', import.meta.url));

export default {
  plugins: {
    tailwindcss: { config },
    autoprefixer: {},
  },
};
