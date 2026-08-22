import "dotenv/config";

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const url = "https://sparklebot.in/api/v1/thestarrkuts/messages/template";

async function send(label: string, fields: Record<string, string>) {
  const body = {
    phone_number: "919644925737",
    template_name: "starrkuts_login_otp",
    template_language: "en_IN",
    ...fields,
  };

  console.log(`\n--- ${label} ---`);
  console.log("request", JSON.stringify(body));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("status", res.status);
  console.log("response", text);
}

async function main() {
  if (!token) {
    console.error("WHATSAPP_ACCESS_TOKEN missing");
    process.exit(1);
  }

  await send("1 field (current config)", { field_1: "482917" });
  await send("2 fields (docs template)", { field_1: "482917", field_2: "10" });

  console.log("\n--- payment received template ---");
  const paymentBody = {
    phone_number: "919644925737",
    template_name: "starrkuts_payment_received",
    template_language: "en_IN",
    field_1: "1,850",
    field_2: "RCP-TEST-001",
    field_3: "22-Aug-2026",
  };
  console.log("request", JSON.stringify(paymentBody));
  const payRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(paymentBody),
  });
  const payText = await payRes.text();
  console.log("status", payRes.status);
  console.log("response", payText);
}

void main();
