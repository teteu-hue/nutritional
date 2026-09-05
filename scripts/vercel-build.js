const { execSync } = require("child_process");
const { prepareVercelEnv } = require("./ensure-vercel-env");

prepareVercelEnv();

const env = process.env;

execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env });
execSync("pnpm exec prisma generate", { stdio: "inherit", env });
execSync("pnpm exec next build --webpack", { stdio: "inherit", env });
