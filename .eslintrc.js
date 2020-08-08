const OFF = 0;
const WARN = 1;

module.exports = {
  root: true,

  env: {
    node: true,
  },

  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "header"],

  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
  ],

  rules: {
    "@typescript-eslint/no-use-before-define": OFF,
    "@typescript-eslint/no-explicit-any": WARN,
    "react/prop-types": OFF,
    "header/header": [
      ERROR,
      "block",
      [
        "/**",
        " * Image Processing Pipeline - Copyright (c) Marcus Cemes",
        " *",
        " * This source code is licensed under the MIT license found in the",
        " * LICENSE file in the root directory of this source tree.",
        " */",
      ],
    ],
  },
};
