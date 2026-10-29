import { listApplicationObjectKeys } from "../lib/application-document-storage";

const needles = [
  "1780271755503-e053dcb0__NIN.png",
  "1780272703004-4a7213db__Ekene Akubue CV.pdf",
  "NIN.png",
];

async function main() {
  const keys = await listApplicationObjectKeys("applications/");
  const matches = keys.filter((key) => {
    const name = key.split("/").pop() ?? "";
    return needles.some(
      (needle) => name === needle || name.includes(needle) || key.includes(needle)
    );
  });

  console.log(`Total: ${keys.length}`);
  console.log("Matches:", matches.length ? matches : "(none)");
}

main().catch(console.error);
