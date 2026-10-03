module.exports = {
  root: true,
  extends: ["expo", "prettier"],
  plugins: ["react"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["error", { "allow": ["warn", "error"] }],
  },
};