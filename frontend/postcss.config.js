export default {
  plugins: {
    '@tailwindcss/postcss': {},
    // Tailwind 4 prefixes only the CSS it compiles. Autoprefixer keeps the
    // vendor prefixes in the hand-written CSS (public templates, landing,
    // react-grid-layout), for example -webkit-user-select for Safari.
    autoprefixer: {},
  },
}
