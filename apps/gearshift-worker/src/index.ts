import { startGearshiftConsumer } from "./consumer.js";
import { assertRequiredEnv, requiredEnv } from "./env.js";

const requiredWorkerEnv = [
  "DATABASE_URL",
  "RABBITMQ_URL",
  "GEARSHIFT_EXCHANGE",
  "GEARSHIFT_QUEUE",
  "GEARSHIFT_DLX",
  "GEARSHIFT_DLQ",
];

async function main(): Promise<void> {
  assertRequiredEnv(requiredWorkerEnv);
  await startGearshiftConsumer();
  console.log(
    `Gearshift worker consuming queue "${requiredEnv("GEARSHIFT_QUEUE")}".`,
  );
}

main().catch((error) => {
  console.error("Gearshift worker failed to start", error);
  process.exitCode = 1;
});
