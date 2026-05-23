import nextConfig from "eslint-config-next";
import nextVitalsConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  ...nextVitalsConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
