import { Admin, Kafka, Producer } from "kafkajs";
import dotenv from "dotenv";
dotenv.config();

let producer: Producer;
let admin: Admin;

export const connectKafka = async () => {
  try {
    const kafka = new Kafka({
      clientId: "auth-service",
      brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
    });
    admin = kafka.admin();
    await admin.connect();

    const topics = await admin.listTopics();
    console.log("Kafka Connected", topics);

    if (!topics.includes("send-mail")) {
      await admin.createTopics({
        topics: [
          {
            topic: "send-mail",
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
      });
      console.log("✅ Topic Created 'send-mail' ");
    }

    await admin.disconnect();

    producer = kafka.producer();
    await producer.connect();
    console.log("✅ connected to kafka Producer Connected");
  } catch (error) {
    console.log("Error in kafka connection", error);
  }
};

export const publicToTopic = async (topic: string, message: any) => {
  if (!producer) {
    console.log("kafka producer is not initilized");
    return;
  }
  try {
    await producer.send({
      topic: topic,
      messages: [
        {
          value: JSON.stringify(message),
        },
      ],
    });
  } catch (error) {
    console.log("Error in kafka producer PublicToTopic", error);
  }
};

export const disconnectKafka = async () => {
  try {
    if (producer) {
      await producer.disconnect();
      console.log("✅ kafka producer disconnected");
    }
  } catch (error) {
    console.log("Error in kafka producer disconnect", error);
  }
};
