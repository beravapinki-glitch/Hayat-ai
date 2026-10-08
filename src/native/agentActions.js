import { Share } from "@capacitor/share";
import { Browser } from "@capacitor/browser";
import { LocalNotifications } from "@capacitor/local-notifications";

export async function openUrl(url) {
  if (!url) {
    throw new Error("URL missing");
  }

  await Browser.open({
    url
  });
}

export async function shareText(text, title = "Hayat AI") {
  return await Share.share({
    title,
    text,
    dialogTitle: title
  });
}

export async function requestNotifications() {
  const permissions =
    await LocalNotifications.requestPermissions();

  return permissions;
}

export async function notify(
  title,
  body
) {
  await requestNotifications();

  await LocalNotifications.schedule({
    notifications: [
      {
        id:
          Math.floor(
            Math.random() * 1000000
          ),

        title,

        body,

        schedule: {
          at:
            new Date(
              Date.now() + 1000
            )
        }
      }
    ]
  });
}

export function createWhatsAppUrl(
  phone,
  message
) {
  const number =
    String(phone || "")
      .replace(/[^\d]/g, "");

  const text =
    encodeURIComponent(
      String(message || "")
    );

  if (!number) {
    throw new Error(
      "WhatsApp number missing"
    );
  }

  return (
    "https://wa.me/" +
    number +
    "?text=" +
    text
  );
}

export async function openWhatsApp(
  phone,
  message
) {
  const url =
    createWhatsAppUrl(
      phone,
      message
    );

  await Browser.open({
    url
  });

  return url;
}
