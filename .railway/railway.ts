import { defineRailway, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const dataVolume = volume("data", {
    mountPath: "/app/data",
  });

  const web = service("web", {
    build: "npm run build",
    start: "node server/index.js",
    volumes: [dataVolume],
  });

  return project("hotel-manager", {
    resources: [web, dataVolume],
  });
});
