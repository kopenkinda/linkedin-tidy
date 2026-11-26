// esbuild loads .css files as text (see build.mjs).
declare module '*.css' {
  const text: string;
  export default text;
}
