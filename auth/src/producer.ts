import axios from "axios";

export const connectKafka = async () => {
  console.log("Kafka connection bypassed, using HTTP for mails");
};

export const publicToTopic = async (topic: string, message: any) => {
  if (topic === "send-mail") {
    try {
      await axios.post(`${process.env.UPLOAD_SERVICE}/api/utils/send-mail`, message);
      console.log("Mail request sent to utils service");
    } catch (error) {
      console.log("Error sending mail request to utils service", error);
    }
  }
};

export const disconnectKafka = async () => {
  console.log("Kafka bypassed disconnected");
};
