module.exports = {
  preset: "ts-jest",

  testEnvironment: "node",

  roots: ["<rootDir>/packages"],

  collectCoverageFrom: ["packages/*/src/**/*.ts"],

  testPathIgnorePatterns: ["node_modules", "packages/broker"],
  coveragePathIgnorePatterns: ["node_modules", "index.ts"],

  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.test.json",
      packageJson: "package.json",
    },
  },

  moduleNameMapper: {
    "^@ipp/(.*)$": "<rootDir>/packages/$1/src",
  },
};
