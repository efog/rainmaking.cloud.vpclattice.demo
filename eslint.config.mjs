import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ["**/*.{js,mjs,cjs,ts}"], rules: {
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "indent": ["error", 4],
            "linebreak-style": ["error", "unix"],
            "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
            "no-console": ["error", { allow: ["warn", "error"] }],
            "no-undef": "off",
            "no-undef-init": "off",
            "no-empty": "off",
            "no-prototype-builtins": "off",
            "no-useless-escape": "off",
            "no-use-before-define": "off",
            "no-redeclare": "off",
            "no-async-promise-executor": "off",
            "no-misleading-character-class": "off",
            "no-constant-condition": "off",
            "no-inner-declarations": "off",
            "no-case-declarations": "off",
            "no-empty-pattern": "off",
            "no-empty-function": "off",
            "no-useless-catch": "off",
            "no-useless-return": "off",
            "no-throw-literal": "off",
            "no-sequences": "off",
            "no-unreachable": "off",
            "no-unsafe-optional-chaining": "off",
            "no-unsafe-negation": "off",
            "no-unsafe-finally": "off"
        }
    },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
];