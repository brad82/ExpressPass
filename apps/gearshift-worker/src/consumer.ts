import amqp from "amqplib";
import {
  gearshiftContentType,
  gearshiftRoutingKeys,
  type GearshiftEventType,
} from "@expresspass/shared";
import { processGearshiftDelivery } from "./broker.js";
import { requiredEnv } from "./env.js";

const allGearshiftEventTypes = Object.keys(
  gearshiftRoutingKeys,
) as GearshiftEventType[];

export async function startGearshiftConsumer(): Promise<void> {
  const rabbitmqUrl = requiredEnv("RABBITMQ_URL");
  const exchange = requiredEnv("GEARSHIFT_EXCHANGE");
  const queue = requiredEnv("GEARSHIFT_QUEUE");
  const deadLetterExchange = requiredEnv("GEARSHIFT_DLX");
  const deadLetterQueue = requiredEnv("GEARSHIFT_DLQ");

  const connection = await amqp.connect(rabbitmqUrl);
  const channel = await connection.createChannel();

  await channel.assertExchange(deadLetterExchange, "fanout", { durable: true });
  await channel.assertQueue(deadLetterQueue, { durable: true });
  await channel.bindQueue(deadLetterQueue, deadLetterExchange, "");

  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(queue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": deadLetterExchange,
    },
  });

  for (const eventType of allGearshiftEventTypes) {
    await channel.bindQueue(queue, exchange, gearshiftRoutingKeys[eventType]);
  }

  await channel.consume(queue, async (message) => {
    if (!message) {
      return;
    }
    try {
      await processGearshiftDelivery({
        content: message.content,
        properties: {
          contentType: message.properties.contentType,
        },
      });
      channel.ack(message);
    } catch (error) {
      console.error("Failed processing Gearshift message", error);
      channel.nack(message, false, false);
    }
  });
}

export { gearshiftContentType };
