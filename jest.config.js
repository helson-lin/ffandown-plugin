export default {
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(node-fetch)/)"
  ],
  moduleFileExtensions: [
    "js",
    "jsx",
    "json"
  ],
  testEnvironment: "node",
};