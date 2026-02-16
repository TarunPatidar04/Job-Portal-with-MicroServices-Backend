import { Kafka } from "kafkajs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const startSendMailConsumer = async () => {
  try {
    const kafka = new Kafka({
      clientId: "mail-service",
      brokers: [process.env.KAFKA_BROKER_URL || "localhost:9092"],
    });

    const consumer = kafka.consumer({ groupId: "mail-service-group" });
    await consumer.connect();

    const topicName = "send-mail";
    await consumer.subscribe({ topic: topicName, fromBeginning: false });

    console.log(
      "✅ Mail Service consumer started, Listening for sending mail",
      topicName,
    );

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const { to, subject, html } = JSON.parse(
            message.value?.toString() || "{}",
          );

          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
              user: "tarun.coderfarm@gmail.com",
              pass: "ocdq eutn jdxo hzzz",
            },
          });

          await transporter.sendMail({
            from: "HireHeven <noreply>",
            to,
            subject,
            html,
          });

          console.log("Mail sent successfully", to);
        } catch (error) {
          console.log("Error in mail service consumer", error);
        }
      },
    });
  } catch (error) {
    console.log(
      "Error in mail service consumer and failed to start kafka",
      error,
    );
  }
};
