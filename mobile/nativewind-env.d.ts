/// <reference types="nativewind/types" />

// CSS side-effect imports (global.css con Tailwind directives).
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

